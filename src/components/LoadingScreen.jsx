import './LoadingScreen.css';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import GLBModel from './GLBModel';
import randomEffectModel from '../assets/models/random_effect.glb';
import logo from '../assets/logo.png';
import { getFortunePrediction } from '../services/fortuneApi';
import { generateWallpaperImage } from '../services/imageGenerationApi';

// Preload model
useGLTF.preload(randomEffectModel);

function LoadingScreen({ dateInfo, onGetWallpaper, onImageGenerated }) {
  const [showResult, setShowResult] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [canvasKey, setCanvasKey] = useState(0); // Key สำหรับ force re-mount Canvas
  const [predictionText, setPredictionText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // เก็บ dateInfo ที่เรียก API ไปแล้ว (ใช้ JSON.stringify เพื่อเปรียบเทียบ object)
  const calledDateInfoRef = useRef(null); // เก็บ dateInfo ที่เรียก API ทำนายดวงไปแล้ว
  const calledImageDateInfoRef = useRef(null); // เก็บ dateInfo ที่เรียก API สร้างภาพไปแล้ว
  const isFortuneCallingRef = useRef(false); // Flag ว่า "กำลังเรียก API ทำนายดวงอยู่"
  const isImageCallingRef = useRef(false); // Flag ว่า "กำลังเรียก API สร้างภาพอยู่"

  // Reset state เมื่อ component mount หรือเมื่อ dateInfo เปลี่ยน (เริ่มใหม่)
  useEffect(() => {
    // Reset state แต่ไม่ reset refs เพื่อป้องกันการเรียก API ซ้ำ
    setShowResult(false);
    setFadeOut(false);
    setDisplayedText('');
    setPredictionText('');
    setIsLoading(true);
    setCanvasKey(prev => prev + 1); // Force re-mount Canvas

    // Reset calling flags เมื่อ dateInfo เปลี่ยน (เริ่มใหม่)
    if (dateInfo) {
      const dateInfoKey = JSON.stringify(dateInfo);
      // ถ้า dateInfo เปลี่ยน ให้ reset flags
      if (calledDateInfoRef.current !== dateInfoKey) {
        isFortuneCallingRef.current = false;
      }
      if (calledImageDateInfoRef.current !== dateInfoKey) {
        isImageCallingRef.current = false;
      }
    }
  }, [dateInfo]); // เพิ่ม dateInfo เป็น dependency เพื่อ reset เมื่อ dateInfo เปลี่ยน

  // เรียก API ทำนายดวงเมื่อ component mount และมี dateInfo (เรียกแค่ครั้งเดียว)
  useEffect(() => {
    if (!dateInfo) {
      console.warn("⚠️ ไม่มี dateInfo สำหรับทำนายดวง");
      return;
    }

    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบว่าเรียกไปแล้วหรือยัง
    const dateInfoKey = JSON.stringify(dateInfo);

    // ป้องกันการเรียก API ซ้ำ (ตรวจสอบว่า dateInfo นี้เรียกไปแล้วหรือยัง หรือกำลังเรียกอยู่)
    if (calledDateInfoRef.current === dateInfoKey || isFortuneCallingRef.current) {
      console.log("⚠️ API ทำนายดวงถูกเรียกไปแล้วหรือกำลังเรียกอยู่สำหรับ dateInfo นี้ ข้ามการเรียกซ้ำ");
      return;
    }

    // ตั้ง flag ว่าเรียก API ไปแล้วและกำลังเรียกอยู่ (ตั้งก่อนเรียก async function เพื่อป้องกัน StrictMode double call)
    calledDateInfoRef.current = dateInfoKey;
    isFortuneCallingRef.current = true;
    console.log("🚀 เริ่มโหลดหน้าจอ LoadingScreen พร้อมข้อมูล:", dateInfo);

    let isCancelled = false; // Flag สำหรับ cleanup

    const fetchFortune = async () => {
      try {
        setIsLoading(true);
        console.log("⏳ กำลังเรียก API ทำนายดวง...");
        const result = await getFortunePrediction(dateInfo);

        // ตรวจสอบว่า component ยัง mount อยู่หรือไม่
        if (isCancelled) {
          console.log("⚠️ Component unmounted, skipping fortune result");
          return;
        }

        console.log("📥 ได้รับผลลัพธ์:", result.success ? "สำเร็จ" : "ล้มเหลว");

        if (result.success && result.prediction) {
          console.log("✅ ตั้งค่า prediction text ความยาว:", result.prediction.length);

          // แสดง token usage (ถ้ามี)
          if (result.tokenUsage) {
            console.log("💰 Token Usage (ทำนายดวง):", {
              prompt_tokens: result.tokenUsage.prompt_tokens,
              completion_tokens: result.tokenUsage.completion_tokens,
              total_tokens: result.tokenUsage.total_tokens,
            });
          }

          setPredictionText(result.prediction);
          // เริ่ม fade out หลังจากได้ผลลัพธ์
          setFadeOut(true);
          // หลังจาก fade out เสร็จ (1 วินาที) แสดงผล
          setTimeout(() => {
            if (!isCancelled) {
              console.log("🎉 แสดงผลการทำนาย");
              setShowResult(true);
              setIsLoading(false);
            }
          }, 1000);
        } else {
          // ถ้า API error ให้ใช้ error message
          const errorMessage = result.error
            ? `เกิดข้อผิดพลาด: ${result.error}`
            : 'เกิดข้อผิดพลาดในการทำนายดวงชะตา กรุณาลองใหม่อีกครั้ง';
          console.error("❌ API Error:", result.error);
          if (!isCancelled) {
            setPredictionText(errorMessage);
            setFadeOut(true);
            setTimeout(() => {
              if (!isCancelled) {
                setShowResult(true);
                setIsLoading(false);
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching fortune:', error);
        if (!isCancelled) {
          setPredictionText(`เกิดข้อผิดพลาด: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`);
          setFadeOut(true);
          setTimeout(() => {
            if (!isCancelled) {
              setShowResult(true);
              setIsLoading(false);
            }
          }, 1000);
        }
      } finally {
        // Reset flag เมื่อเสร็จสิ้น (ไม่ว่าจะสำเร็จหรือล้มเหลว)
        isFortuneCallingRef.current = false;
      }
    };

    fetchFortune();

    // Cleanup function: ยกเลิกการทำงานถ้า component unmount
    return () => {
      isCancelled = true;
      isFortuneCallingRef.current = false;
      console.log("🧹 Cleanup: ยกเลิกการเรียก API ทำนายดวง");
    };
  }, [dateInfo]);

  // เรียก API สร้างภาพพร้อมกับ API ทำนายดวง (เรียกแค่ครั้งเดียว)
  useEffect(() => {
    if (!dateInfo) {
      console.warn("⚠️ ไม่มี dateInfo สำหรับสร้างภาพ");
      return;
    }

    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบว่าเรียกไปแล้วหรือยัง
    const dateInfoKey = JSON.stringify(dateInfo);

    // ป้องกันการเรียก API ซ้ำ (ตรวจสอบว่า dateInfo นี้เรียกไปแล้วหรือยัง หรือกำลังเรียกอยู่)
    if (calledImageDateInfoRef.current === dateInfoKey || isImageCallingRef.current) {
      console.log("⚠️ Image API ถูกเรียกไปแล้วหรือกำลังเรียกอยู่สำหรับ dateInfo นี้ ข้ามการเรียกซ้ำ");
      return;
    }

    // ตั้ง flag ว่าเรียก API ไปแล้วและกำลังเรียกอยู่ (ตั้งก่อนเรียก async function เพื่อป้องกัน StrictMode double call)
    calledImageDateInfoRef.current = dateInfoKey;
    isImageCallingRef.current = true;
    console.log("🎨 เริ่มสร้างภาพวอลเปเปอร์พร้อมกับทำนายดวง");

    let isCancelled = false; // Flag สำหรับ cleanup

    const generateImage = async () => {
      try {
        console.log("⏳ กำลังเรียก API สร้างภาพ...");
        const result = await generateWallpaperImage(dateInfo);

        // ตรวจสอบว่า component ยัง mount อยู่หรือไม่
        if (isCancelled) {
          console.log("⚠️ Component unmounted, skipping image result");
          return;
        }

        if (result.success && result.base64) {
          console.log("✅ ภาพสร้างเสร็จแล้ว");

          // แสดง token usage (ถ้ามี)
          if (result.tokenUsage) {
            console.log("💰 Token Usage (สร้างภาพ):", {
              prompt_tokens: result.tokenUsage.prompt_tokens,
              completion_tokens: result.tokenUsage.completion_tokens,
              total_tokens: result.tokenUsage.total_tokens,
            });
          } else {
            console.log("⚠️ ไม่พบ token usage สำหรับการสร้างภาพ (อาจเป็นปกติสำหรับ image generation API)");
          }

          // ส่งภาพไปยัง parent component
          if (onImageGenerated && !isCancelled) {
            onImageGenerated(result.base64);
          }
        } else {
          console.error("❌ Image generation failed:", result.error);
          // ส่ง null ถ้าเกิด error
          if (onImageGenerated && !isCancelled) {
            onImageGenerated(null);
          }
        }
      } catch (error) {
        console.error('❌ Error generating image:', error);
        // ส่ง null ถ้าเกิด error
        if (onImageGenerated && !isCancelled) {
          onImageGenerated(null);
        }
      } finally {
        // Reset flag เมื่อเสร็จสิ้น (ไม่ว่าจะสำเร็จหรือล้มเหลว)
        isImageCallingRef.current = false;
      }
    };

    generateImage();

    // Cleanup function: ยกเลิกการทำงานถ้า component unmount
    return () => {
      isCancelled = true;
      isImageCallingRef.current = false;
      console.log("🧹 Cleanup: ยกเลิกการเรียก API สร้างภาพ");
    };
    // ลบ onImageGenerated ออกจาก dependency array เพราะเราใช้ useCallback แล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateInfo]);

  // เริ่ม typewriter effect เมื่อ showResult เป็น true และมี predictionText
  useEffect(() => {
    if (!showResult || !predictionText) {
      setDisplayedText(''); // รีเซ็ตเมื่อยังไม่แสดงผล
      return;
    }

    // เริ่ม typewriter effect - เขียนทีละตัวอักษร
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex < predictionText.length) {
        setDisplayedText(predictionText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 20); // พิมพ์ทุก 20ms (ตัวอักษร) - เร็วขึ้น

    return () => clearInterval(typeInterval);
  }, [showResult, predictionText]);

  const handleGetWallpaper = () => {
    if (onGetWallpaper) {
      onGetWallpaper();
    }
  };

  const handleCopyText = async () => {
    if (!predictionText) return;

    try {
      await navigator.clipboard.writeText(predictionText);
      // แสดง feedback (อาจจะเพิ่ม toast หรือ alert ตามต้องการ)
      alert('คัดลอกข้อความแล้ว');
    } catch (error) {
      console.error('❌ Error copying text:', error);
      // Fallback: ใช้วิธีเก่า
      const textArea = document.createElement('textarea');
      textArea.value = predictionText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('คัดลอกข้อความแล้ว');
      } catch (err) {
        console.error('❌ Fallback copy failed:', err);
        alert('ไม่สามารถคัดลอกข้อความได้');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="loading-screen">
      {!showResult ? (
        <>
          <div className={`loading-3d-container ${fadeOut ? 'fade-out' : ''}`}>
            <Canvas
              key={canvasKey}
              camera={{ position: [0, 0, 5], fov: 50 }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[5, 5, 5]} intensity={1.5} />
              <pointLight position={[-5, -5, -5]} intensity={0.5} />
              <Suspense fallback={null}>
                <GLBModel key={canvasKey} modelPath={randomEffectModel} animationName="Take 001" />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
            </Canvas>
          </div>
          <div className={`loading-text ${fadeOut ? 'fade-out' : ''}`}>
            {isLoading ? 'กำลังทำนายดวงชะตา' : 'กำลังเตรียมผลการทำนาย'}
            <span className="loading-dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </span>
          </div>
        </>
      ) : (
        <div className="prediction-result">
          <div className="prediction-card">
            <button
              className="copy-button"
              onClick={handleCopyText}
              title="คัดลอกข้อความ"
              aria-label="คัดลอกข้อความ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <img src={logo} alt="Logo" className="prediction-logo" />
            <div className="prediction-text">
              {displayedText}
              {displayedText.length < predictionText.length && <span className="cursor">|</span>}
            </div>
          </div>
          <button className="get-wallpaper-button" onClick={handleGetWallpaper}>
            รับ wallpaper เสริมดวง
          </button>
        </div>
      )}
    </div>
  );
}

export default LoadingScreen;

