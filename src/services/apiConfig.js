/**
 * Configuration file สำหรับ API ทั้งหมด
 * จัดการ environment variables และ configuration ที่ใช้ร่วมกัน
 */

/**
 * API Configuration
 * ตั้งค่า API endpoints และ keys ผ่าน environment variables
 */
// Shared OpenAI API Key
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

export const API_CONFIG = {
  // Fortune API (GPT)
  fortune: {
    endpoint: "https://api.openai.com/v1/chat/completions", // ค่าคงที่
    apiKey: OPENAI_API_KEY,
    model: import.meta.env.VITE_FORTUNE_MODEL || "gpt-5-nano",
  },

  // Image Generation API
  imageGeneration: {
    endpoint: "https://api.openai.com/v1/images/generations", // ค่าคงที่
    apiKey: OPENAI_API_KEY,
    model: import.meta.env.VITE_IMAGE_MODEL || "dall-e-3",
    defaultSize: "1024x1792", // 9:16 ratio
    defaultQuality: "standard",
    defaultStyle: "natural",
  },

  // General API settings
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * ตรวจสอบว่า API configuration พร้อมใช้งานหรือไม่
 */
export const isApiConfigured = () => {
  const hasApiKey = !!OPENAI_API_KEY;
  return {
    fortune: hasApiKey,
    imageGeneration: hasApiKey,
  };
};

/**
 * Helper function สำหรับสร้าง headers สำหรับ API calls
 */
export const createApiHeaders = (apiKey) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
};
