/**
 * Cloudinary Service
 * จัดการการอัปโหลดภาพไปยัง Cloudinary โดยใช้ REST API
 * หมายเหตุ: Cloudinary SDK v2 ใช้ได้เฉพาะใน Node.js เท่านั้น
 * สำหรับ browser ต้องใช้ REST API แทน
 */

// ตั้งค่า Cloudinary จาก environment variables
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "da8eemrq8";
const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || "";
const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || "";
const uploadPreset = "ml_default"; // ใช้ upload preset สำหรับ unsigned upload

// หมายเหตุ: สำหรับ browser ควรใช้ upload preset (unsigned upload) แทน signed upload
// เพราะ apiSecret ไม่ควรใช้ใน browser (ไม่ปลอดภัย)

/**
 * อัปโหลด base64 image ไปยัง Cloudinary โดยใช้ REST API
 * @param {string} base64String - Base64 string ของภาพ (data:image/png;base64,...)
 * @param {string} folder - โฟลเดอร์ใน Cloudinary (optional)
 * @param {string} customUploadPreset - Upload preset name (optional, ถ้าใช้ unsigned upload)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToCloudinary = async (
  base64String,
  folder = "zodiac",
  customUploadPreset = null
) => {
  if (!cloudName) {
    return {
      success: false,
      error: "Cloudinary is not configured",
    };
  }

  try {
    // แปลง base64 string เป็น format ที่ Cloudinary ต้องการ
    let base64Data = base64String;
    if (base64String.startsWith("data:image")) {
      base64Data = base64String.split(",")[1];
    }

    // สร้าง FormData สำหรับ upload
    // หมายเหตุ: สำหรับ unsigned upload (upload preset) ใช้ได้เฉพาะ parameters ที่อนุญาตเท่านั้น
    // Parameters ที่อนุญาต: upload_preset, callback, public_id, folder, asset_folder, tags, context, metadata, 
    // face_coordinates, custom_coordinates, source, filename_override, manifest_transformation, manifest_json, 
    // template, template_vars, regions, public_id_prefix
    const formData = new FormData();
    formData.append("file", `data:image/png;base64,${base64Data}`);
    formData.append("folder", folder);
    // ใช้ public_id ที่มี timestamp เพื่อไม่ให้ซ้ำกัน (แต่ละคนจะได้ภาพของตัวเอง)
    // หมายเหตุ: จะสร้างไฟล์หลายไฟล์ แต่สามารถลบไฟล์เก่าได้ในภายหลัง
    const timestamp = Date.now();
    formData.append("public_id", `olympic_flag_${timestamp}`);
    // ไม่ต้องใส่ resource_type, format, overwrite, unique_filename เพราะไม่ได้อยู่ในรายการที่อนุญาตสำหรับ unsigned upload

    // ใช้ upload preset (แนะนำสำหรับ browser - unsigned upload)
    const presetToUse = customUploadPreset || uploadPreset;
    if (presetToUse) {
      formData.append("upload_preset", presetToUse);
      console.log("✅ Using upload preset:", presetToUse);
    } else {
      // ถ้าไม่มี preset จะไม่สามารถอัปโหลดได้ (ต้องมี preset สำหรับ browser)
      console.warn("⚠️ No upload preset provided. Upload may fail.");
    }

    // อัปโหลดไปยัง Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Upload failed: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Image uploaded to Cloudinary:", result.secure_url);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("❌ Error uploading image to Cloudinary:", error);
    return {
      success: false,
      error: error.message || "Failed to upload image to Cloudinary",
    };
  }
};

/**
 * อัปโหลด Blob ไปยัง Cloudinary
 * @param {Blob} blob - Blob object ของภาพ
 * @param {string} folder - โฟลเดอร์ใน Cloudinary (optional)
 * @param {string} uploadPreset - Upload preset name (optional)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadBlobToCloudinary = async (
  blob,
  folder = "zodiac",
  uploadPreset = null
) => {
  if (!cloudName) {
    return {
      success: false,
      error: "Cloudinary is not configured",
    };
  }

  try {
    // แปลง Blob เป็น base64
    const base64String = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // ใช้ฟังก์ชัน uploadImageToCloudinary
    return await uploadImageToCloudinary(base64String, folder, uploadPreset);
  } catch (error) {
    console.error("❌ Error converting blob to base64:", error);
    return {
      success: false,
      error: error.message || "Failed to convert blob to base64",
    };
  }
};

