/**
 * API Service สำหรับทำนายดวงด้วย GPT
 * ใช้สำหรับทำนายดวงตามวันเกิด
 */

// API Configuration
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const FORTUNE_MODEL = import.meta.env.VITE_FORTUNE_MODEL || "gpt-5.1";
const API_ENDPOINT = "https://api.openai.com/v1/responses";

/**
 * แปลงตัวเลขเดือนเป็นชื่อเดือนภาษาไทย
 * @param {number} monthNumber - ตัวเลขเดือน (1-12)
 * @returns {string} - ชื่อเดือนภาษาไทย
 */
const getThaiMonthName = (monthNumber) => {
  const months = [
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
  return months[monthNumber - 1] || "";
};

/**
 * สร้างรูปแบบวันเกิดเป็นภาษาไทย
 * @param {number} day - วันที่
 * @param {number} month - เดือน (1-12)
 * @param {number} year - ปี
 * @returns {string} - วันเกิดในรูปแบบ "12 มิถุนายน 1994"
 */
const formatBirthday = (day, month, year) => {
  const monthName = getThaiMonthName(month);
  return `${day} ${monthName} ${year}`;
};

/**
 * Prompt template สำหรับทำนายดวง
 * @param {Object} dateInfo - ข้อมูลวันเกิด { day, month, year, dayOfWeek, zodiac, chineseZodiac }
 * @returns {string} - Prompt ที่พร้อมส่งไปยัง GPT
 */
const generateFortunePrompt = (dateInfo) => {
  const { day, month, year, dayOfWeek, zodiac, chineseZodiac } = dateInfo;

  // แปลงข้อมูลเป็นรูปแบบที่ต้องการ
  const birthday = formatBirthday(day, month, year);
  const weekday = dayOfWeek || "";
  const zodiacSign = zodiac || "";
  const yearAnimal = chineseZodiac || "";

  return `คุณคือหมอดูโหราศาสตร์ไทยผู้เชี่ยวชาญ  

กรุณาทำนายดวงชะตาให้ผู้ใช้ตามข้อมูลต่อไปนี้:

- วันเกิด: ${birthday}
- วันประจำสัปดาห์: ${weekday}
- ราศี: ${zodiacSign}
- ปีนักษัตร: ${yearAnimal}

กรุณาทำนายตามโหราศาสตร์ไทยอย่างละเอียด พร้อมคำแนะนำที่นำไปใช้ได้จริง  

ให้ตอบตามโครงสร้างด้านล่างนี้เท่านั้น:

1. 🔮 ภาพรวมดวงชะตา  

2. 💼 การงาน  

3. 💰 การเงิน  

4. ❤️ ความรัก (โสด / มีคู่)  

5. 🩺 สุขภาพ  

6. 🌟 คำเตือนประจำดวง  

7. 🍀 วิธีเสริมดวงแบบไทย  

   - สีมงคล  

   - เลขมงคล  

   - ของเสริมดวง / เครื่องบูชา  

   - ฤกษ์ดีประจำเดือน  

**สำคัญ: ให้ตอบแบบสั้นๆ สรุป กระชับ แต่ครอบคลุมทุกหัวข้อ ใช้ภาษาสุภาพ ชัดเจน สไตล์หมอดูไทย แต่เข้าใจง่าย**`;
};

/**
 * เรียก API ทำนายดวง
 * @param {Object} dateInfo - ข้อมูลวันเกิด
 * @returns {Promise<Object>} - ผลการทำนายดวง
 */
export const getFortunePrediction = async (dateInfo) => {
  try {
    console.log("🔮 เริ่มทำนายดวงชะตา...", dateInfo);

    // ตรวจสอบ API key
    if (!API_KEY) {
      const errorMsg =
        "API key ไม่ได้ตั้งค่า กรุณาตรวจสอบไฟล์ .env และตั้งค่า VITE_OPENAI_API_KEY";
      console.error("❌", errorMsg);
      return {
        success: false,
        error: errorMsg,
        prediction: null,
      };
    }

    console.log("📤 ส่งคำขอไปยัง API...");
    const prompt = generateFortunePrompt(dateInfo);
    console.log("📝 Prompt:", prompt.substring(0, 100) + "...");

    // สร้าง input array ตามรูปแบบ API
    const input = [
      {
        role: "system",
        content:
          "คุณเป็นหมอดูโหราศาสตร์ไทยผู้เชี่ยวชาญที่ทำนายดวงชะตาอย่างแม่นยำ",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const requestBody = {
      model: FORTUNE_MODEL,
      input: input,
    };

    console.log("📡 OpenAI API Request:", {
      model: FORTUNE_MODEL,
      inputLength: input.length,
    });

    // เรียก API โดยใช้ fetch
    const resp = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // จัดการ error response
    if (!resp.ok) {
      let errorPayload;
      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        errorPayload = await resp.json().catch(() => null);
      } else {
        const text = await resp.text().catch(() => "");
        errorPayload = { error: text || "Upstream error" };
      }

      console.error("❌ OpenAI API Error:", {
        status: resp.status,
        error: errorPayload,
      });

      const errorMessage =
        errorPayload?.error?.message ||
        errorPayload?.error ||
        JSON.stringify(errorPayload) ||
        "Upstream error";

      return {
        success: false,
        error: errorMessage,
        prediction: null,
      };
    }

    const data = await resp.json();
    console.log("✅ ได้รับผลลัพธ์จาก API");

    // แสดง token usage (ถ้ามี)
    if (data.usage) {
      const usage = data.usage;
      const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
      const completionTokens =
        usage.completion_tokens || usage.completionTokens || 0;
      const totalTokens =
        usage.total_tokens ||
        usage.totalTokens ||
        promptTokens + completionTokens;

      console.log("📊 Token Usage (Fortune Prediction):", {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      });

      // เก็บ token usage ใน window สำหรับแสดงผล
      if (typeof window !== "undefined") {
        window.lastFortuneTokenUsage = {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        };
      }
    } else {
      console.log("⚠️ ไม่พบ token usage ใน response");
      if (typeof window !== "undefined") {
        window.lastFortuneTokenUsage = null;
      }
    }

    // Parse response ตามรูปแบบ API
    let reply = null;

    // ลองหา output_text จาก output array
    if (Array.isArray(data?.output)) {
      for (const item of data.output) {
        if (item?.type === "message" && Array.isArray(item?.content)) {
          const textContent = item.content.find(
            (c) => c?.type === "output_text"
          );
          if (textContent?.text) {
            reply = textContent.text;
            break;
          }
        }
      }
    }

    // Fallback ไปยังรูปแบบอื่นๆ
    if (!reply) {
      reply =
        data?.output_text ??
        data?.output?.[1]?.content?.[0]?.text ??
        data?.output?.[0]?.content?.[0]?.text ??
        data?.choices?.[0]?.message?.content ??
        data?.message?.content ??
        data?.content ??
        null;
    }

    if (reply) {
      console.log("📊 ความยาวของผลลัพธ์:", reply.length, "ตัวอักษร");

      // เพิ่ม token usage ใน response (ถ้ามี)
      const tokenUsage =
        typeof window !== "undefined" ? window.lastFortuneTokenUsage : null;

      return {
        success: true,
        prediction: reply,
        tokenUsage: tokenUsage, // เพิ่ม token usage ใน response
      };
    } else {
      console.error("❌ ไม่พบ response text ในข้อมูล:", data);
      return {
        success: false,
        error: "ไม่สามารถดึงผลลัพธ์จาก API ได้",
        prediction: null,
      };
    }
  } catch (error) {
    console.error("❌ Error calling fortune API:", error);
    return {
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการเรียก API",
      prediction: null,
    };
  }
};

/**
 * Export prompt generator สำหรับใช้ที่อื่นถ้าต้องการ
 */
export { generateFortunePrompt };
