/**
 * LINE LIFF Service
 * จัดการการ initialize และใช้งาน LINE LIFF SDK
 */

/* eslint-disable no-undef */
// LIFF SDK จะถูกโหลดจาก script tag ใน index.html และจะอยู่ใน window.liff
// ใช้ window.liff แทน liff โดยตรงเพื่อหลีกเลี่ยง linter error

// LIFF ID - ต้องตั้งค่าใน .env หรือเปลี่ยนเป็น LIFF ID ของคุณ
const LIFF_ID = import.meta.env.VITE_LIFF_ID || "";

let liffInstance = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Initialize LINE LIFF
 * @returns {Promise<Object>} - LIFF instance
 */
export const initLiff = async () => {
  // ถ้า initialize ไปแล้ว ให้ return instance เดิม
  if (isInitialized && liffInstance) {
    return liffInstance;
  }

  // ถ้ากำลัง initialize อยู่ ให้ return promise เดิม
  if (initializationPromise) {
    return initializationPromise;
  }

  // ตรวจสอบว่า LIFF SDK โหลดแล้วหรือยัง
  if (typeof window.liff === "undefined") {
    console.warn(
      "⚠️ LINE LIFF SDK is not loaded. Make sure the script is included in index.html"
    );
    return null;
  }

  // ตรวจสอบว่า LIFF ID ถูกตั้งค่าหรือยัง
  if (!LIFF_ID) {
    console.warn("⚠️ LIFF ID is not configured. Set VITE_LIFF_ID in .env file");
    // ยังคง initialize ได้ แต่จะไม่ทำงานใน LINE app
  }

  // สร้าง promise สำหรับ initialization
  initializationPromise = new Promise((resolve) => {
    try {
      console.log("🚀 Initializing LINE LIFF...");

      // ใช้ window.liff เพื่อให้ linter ไม่ error
      const liffSDK = window.liff;

      if (!liffSDK) {
        console.warn("⚠️ LINE LIFF SDK is not loaded");
        isInitialized = false;
        liffInstance = null;
        resolve(null);
        return;
      }

      // ถ้าไม่มี LIFF ID ให้ skip initialization (สำหรับ development ใน browser ปกติ)
      if (!LIFF_ID) {
        console.log(
          "ℹ️ LIFF ID not set, skipping initialization (running in regular browser)"
        );
        isInitialized = false;
        liffInstance = null;
        resolve(null);
        return;
      }

      liffSDK
        .init({
          liffId: LIFF_ID,
        })
        .then(() => {
          console.log("✅ LINE LIFF initialized successfully");
          liffInstance = liffSDK;
          isInitialized = true;
          resolve(liffInstance);
        })
        .catch((error) => {
          console.error("❌ LINE LIFF initialization failed:", error);
          // ถ้า initialize ไม่สำเร็จ (เช่น ไม่ได้เปิดใน LINE app) ให้ return null
          // แต่แอปยังทำงานได้ปกติใน browser
          isInitialized = false;
          liffInstance = null;
          resolve(null); // ไม่ reject เพื่อให้แอปยังทำงานได้ใน browser ปกติ
        });
    } catch (error) {
      console.error("❌ Error initializing LINE LIFF:", error);
      isInitialized = false;
      liffInstance = null;
      resolve(null); // ไม่ reject เพื่อให้แอปยังทำงานได้ใน browser ปกติ
    }
  });

  return initializationPromise;
};

/**
 * ตรวจสอบว่าเปิดใน LINE app หรือไม่
 * @returns {boolean}
 */
export const isInLine = () => {
  return liffInstance && liffInstance.isInClient();
};

/**
 * ตรวจสอบว่า LIFF initialize แล้วหรือยัง
 * @returns {boolean}
 */
export const isLiffReady = () => {
  return isInitialized && liffInstance !== null;
};

/**
 * รับข้อมูลผู้ใช้จาก LINE (ถ้ามี)
 * @returns {Promise<Object|null>} - Profile object หรือ null
 */
export const getLineProfile = async () => {
  if (!isLiffReady() || !isInLine()) {
    return null;
  }

  try {
    const profile = await liffInstance.getProfile();
    console.log("✅ LINE Profile:", profile);
    return profile;
  } catch (error) {
    console.error("❌ Error getting LINE profile:", error);
    return null;
  }
};

/**
 * เปิด LIFF app ใน external browser
 */
export const openExternalBrowser = () => {
  if (!isLiffReady()) {
    console.warn("⚠️ LIFF is not initialized");
    return;
  }

  try {
    liffInstance.openWindow({
      url: window.location.href,
      external: true,
    });
  } catch (error) {
    console.error("❌ Error opening external browser:", error);
  }
};

/**
 * ปิด LIFF app
 */
export const closeLiff = () => {
  if (!isLiffReady() || !isInLine()) {
    return;
  }

  try {
    liffInstance.closeWindow();
  } catch (error) {
    console.error("❌ Error closing LIFF:", error);
  }
};

/**
 * ส่งข้อความไปยัง LINE chat
 * @param {string} message - ข้อความที่ต้องการส่ง
 */
export const sendLineMessage = async (message) => {
  if (!isLiffReady() || !isInLine()) {
    console.warn("⚠️ Cannot send message: not in LINE app");
    return false;
  }

  try {
    await liffInstance.sendMessages([
      {
        type: "text",
        text: message,
      },
    ]);
    console.log("✅ Message sent to LINE");
    return true;
  } catch (error) {
    console.error("❌ Error sending message to LINE:", error);
    return false;
  }
};

/**
 * Share URL ไปยัง LINE
 * @param {string} url - URL ที่ต้องการแชร์
 */
export const shareUrlToLine = async (url) => {
  if (!isLiffReady() || !isInLine()) {
    // Fallback: เปิด URL ใน external browser
    window.open(url, "_blank");
    return false;
  }

  try {
    if (liffInstance.isApiAvailable("shareTargetPicker")) {
      await liffInstance.shareTargetPicker([
        {
          type: "text",
          text: url,
        },
      ]);
      console.log("✅ URL shared to LINE");
      return true;
    } else {
      // Fallback: ใช้ sendMessages
      return await sendLineMessage(url);
    }
  } catch (error) {
    console.error("❌ Error sharing URL to LINE:", error);
    return false;
  }
};

/**
 * Export LIFF instance (ถ้าต้องการใช้งานโดยตรง)
 */
export const getLiffInstance = () => {
  return liffInstance;
};
