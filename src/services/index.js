/**
 * API Services Index
 * Export ทั้งหมด API services และ configuration
 */

// Fortune API
export { getFortunePrediction, generateFortunePrompt } from "./fortuneApi";

// Image Generation API
export {
  generateWallpaperImage,
  generateImagePrompt,
} from "./imageGenerationApi";

// API Configuration
export { API_CONFIG, isApiConfigured, createApiHeaders } from "./apiConfig";
