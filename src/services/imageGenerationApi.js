/**
 * API Service สำหรับสร้างภาพวอลเปเปอร์
 * ใช้สำหรับสร้างภาพวอลเปเปอร์มงคลตามดวงชะตา
 */

import OpenAI from "openai";
import { API_CONFIG } from "./apiConfig";

// สร้าง OpenAI client
const getOpenAIClient = () => {
  const apiKey = API_CONFIG.imageGeneration.apiKey;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in .env file."
    );
  }
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // อนุญาตให้ใช้ใน browser (สำหรับ client-side)
  });
};

/**
 * Helper function: แปลงวันที่เป็นรูปแบบไทย
 */
const formatBirthday = (day, month, year) => {
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  return `${day} ${thaiMonths[month - 1]} ${year}`;
};

/**
 * Prompt template สำหรับสร้างภาพวอลเปเปอร์
 * @param {Object} dateInfo - ข้อมูลวันเกิด { day, month, year, dayOfWeek, zodiac, chineseZodiac }
 * @returns {string} - Prompt ที่พร้อมส่งไปยัง Image Generation API
 */
const generateImagePrompt = (dateInfo) => {
  const { day, month, year, dayOfWeek, zodiac, chineseZodiac } = dateInfo;
  const birthday = formatBirthday(day, month, year);
  const weekday = dayOfWeek || "";
  const zodiacSign = zodiac || "";
  const yearAnimal = chineseZodiac || "";

  return `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:

สร้างภาพพื้นหลังแนวไทยมงคล (Thai auspicious celestial wallpaper) 

ที่มีพลังเสริมดวงแบบไทยโบราณ ผสมความวิจิตรแบบลายไทยและบรรยากาศเร้นลับแบบมงคล

ข้อมูลเจ้าของดวง:
- วันเกิด: ${birthday}
- วันประจำสัปดาห์: ${weekday}
- ราศี: ${zodiacSign}
- ปีนักษัตร: ${yearAnimal}

นำสัญลักษณ์มงคลไทยที่สอดคล้องกับดวง เช่น พลังจักรวาลไทย, ลายกระหนกทอง, ออร่ามงคล, พลังแสง, ดอกบัวเรืองแสง, เครื่องรางไทยแบบนามธรรม, พลังธาตุประจำวัน, และความหมายตามราศี–นักษัตร  

ให้ภาพแสดงพลังศิริมงคลแบบไทยแท้ อบอุ่น ลุ่มลึก เข้มขลัง แต่ดูทันสมัย

โทนสีออร่ามงคล: ใช้สีที่สอดคล้องกับวันเกิดและองค์ประกอบดวง

องค์ประกอบหลัก: ความอ่อนโยน, ความสมดุล, ความสำเร็จ, เสน่ห์, ปัญญา, ปกป้องภัย  

เทคนิค: รายละเอียดสูง, แสงนวล, มิติพลังงานหมุนวนแบบไทย, นุ่มลึก, ultra-detailed, high resolution

ห้ามมีตัวหนังสือหรือข้อความใด ๆ บนภาพ`;
};

/**
 * แปลง URL เป็น base64
 * @param {string} imageUrl - URL ของภาพ
 * @returns {Promise<string>} - base64 string ของภาพ
 */
const convertUrlToBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    throw error;
  }
};

/**
 * เรียก API สร้างภาพวอลเปเปอร์
 * @param {Object} dateInfo - ข้อมูลวันเกิด { day, month, year, dayOfWeek, zodiac, chineseZodiac }
 * @returns {Promise<Object>} - { success, imageUrl, base64, revisedPrompt, error }
 */
export const generateWallpaperImage = async (dateInfo) => {
  try {
    console.log("🎨 Starting image generation with dateInfo:", dateInfo);

    // ตรวจสอบ API key
    const apiKey = API_CONFIG.imageGeneration.apiKey;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in .env file."
      );
    }

    // สร้าง prompt
    const prompt = generateImagePrompt(dateInfo);
    console.log("📝 Generated prompt:", prompt);

    // สร้าง OpenAI client
    const openai = getOpenAIClient();

    // เรียก API สร้างภาพ (ใช้ b64_json เพื่อหลีกเลี่ยง CORS)
    console.log("🔄 Calling OpenAI API...");
    const result = await openai.images.generate({
      model: API_CONFIG.imageGeneration.model,
      prompt: prompt,
      size: "1024x1792", // ขนาดภาพแนวดิ่ง 9:16 สำหรับวอลเปเปอร์ (hardcoded เพื่อความแน่ใจ)
      quality: API_CONFIG.imageGeneration.defaultQuality,
      style: API_CONFIG.imageGeneration.defaultStyle,
      response_format: "b64_json", // ใช้ b64_json เพื่อหลีกเลี่ยง CORS error
      n: 1,
    });

    console.log("✅ Image generation response:", result);

    if (!result.data || !result.data[0]) {
      throw new Error("Invalid response from OpenAI API: missing image data");
    }

    const imageData = result.data[0];
    const revisedPrompt = imageData.revised_prompt || null;

    // ใช้ base64 จาก response โดยตรง (ไม่ต้อง fetch URL)
    let base64 = null;
    if (imageData.b64_json) {
      // ถ้ามี b64_json ให้ใช้โดยตรง
      base64 = `data:image/png;base64,${imageData.b64_json}`;
      console.log("✅ Using base64 from response");
    } else if (imageData.url) {
      // Fallback: ถ้ามี URL ให้ลอง fetch (อาจมี CORS error)
      console.log(
        "⚠️ No b64_json, trying to fetch URL (may have CORS issues)..."
      );
      try {
        base64 = await convertUrlToBase64(imageData.url);
        console.log("✅ Base64 conversion from URL complete");
      } catch (error) {
        console.error("❌ Failed to convert URL to base64:", error);
        throw new Error(
          "Failed to fetch image: CORS error. Please use b64_json format."
        );
      }
    } else {
      throw new Error(
        "Invalid response from OpenAI API: missing image data (no b64_json or url)"
      );
    }

    return {
      success: true,
      imageUrl: imageData.url || null, // อาจเป็น null ถ้าใช้ b64_json
      base64: base64,
      revisedPrompt: revisedPrompt,
    };
  } catch (error) {
    console.error("❌ Error calling image generation API:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      imageUrl: null,
      base64: null,
      revisedPrompt: null,
    };
  }
};

/**
 * Export prompt generator สำหรับใช้ที่อื่นถ้าต้องการ
 */
export { generateImagePrompt };
