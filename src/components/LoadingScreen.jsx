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

  // Reset state เมื่อ component mount
  useEffect(() => {
    setShowResult(false);
    setFadeOut(false);
    setDisplayedText('');
    setPredictionText('');
    setIsLoading(true);
    setCanvasKey(prev => prev + 1); // Force re-mount Canvas
    // ไม่ reset refs ที่นี่ เพราะเราต้องการป้องกันการเรียกซ้ำแม้ใน StrictMode
  }, []);

  // เรียก API ทำนายดวงเมื่อ component mount และมี dateInfo (เรียกแค่ครั้งเดียว)
  useEffect(() => {
    if (!dateInfo) {
      console.warn("⚠️ ไม่มี dateInfo สำหรับทำนายดวง");
      return;
    }

    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบว่าเรียกไปแล้วหรือยัง
    const dateInfoKey = JSON.stringify(dateInfo);

    // ป้องกันการเรียก API ซ้ำ (ตรวจสอบว่า dateInfo นี้เรียกไปแล้วหรือยัง)
    if (calledDateInfoRef.current === dateInfoKey) {
      console.log("⚠️ API ทำนายดวงถูกเรียกไปแล้วสำหรับ dateInfo นี้ ข้ามการเรียกซ้ำ");
      return;
    }

    // ตั้ง flag ว่าเรียก API ไปแล้ว (ตั้งก่อนเรียก async function เพื่อป้องกัน StrictMode double call)
    calledDateInfoRef.current = dateInfoKey;
    console.log("🚀 เริ่มโหลดหน้าจอ LoadingScreen พร้อมข้อมูล:", dateInfo);

    const fetchFortune = async () => {
      try {
        setIsLoading(true);
        console.log("⏳ กำลังเรียก API ทำนายดวง...");
        const result = await getFortunePrediction(dateInfo);
        console.log("📥 ได้รับผลลัพธ์:", result.success ? "สำเร็จ" : "ล้มเหลว");

        if (result.success && result.prediction) {
          console.log("✅ ตั้งค่า prediction text ความยาว:", result.prediction.length);
          setPredictionText(result.prediction);
          // เริ่ม fade out หลังจากได้ผลลัพธ์
          setFadeOut(true);
          // หลังจาก fade out เสร็จ (1 วินาที) แสดงผล
          setTimeout(() => {
            console.log("🎉 แสดงผลการทำนาย");
            setShowResult(true);
            setIsLoading(false);
          }, 1000);
        } else {
          // ถ้า API error ให้ใช้ error message
          const errorMessage = result.error
            ? `เกิดข้อผิดพลาด: ${result.error}`
            : 'เกิดข้อผิดพลาดในการทำนายดวงชะตา กรุณาลองใหม่อีกครั้ง';
          console.error("❌ API Error:", result.error);
          setPredictionText(errorMessage);
          setFadeOut(true);
          setTimeout(() => {
            setShowResult(true);
            setIsLoading(false);
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Error fetching fortune:', error);
        setPredictionText(`เกิดข้อผิดพลาด: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`);
        setFadeOut(true);
        setTimeout(() => {
          setShowResult(true);
          setIsLoading(false);
        }, 1000);
      }
    };

    fetchFortune();
  }, [dateInfo]);

  // เรียก API สร้างภาพพร้อมกับ API ทำนายดวง (เรียกแค่ครั้งเดียว)
  useEffect(() => {
    if (!dateInfo) {
      console.warn("⚠️ ไม่มี dateInfo สำหรับสร้างภาพ");
      return;
    }

    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบว่าเรียกไปแล้วหรือยัง
    const dateInfoKey = JSON.stringify(dateInfo);

    // ป้องกันการเรียก API ซ้ำ (ตรวจสอบว่า dateInfo นี้เรียกไปแล้วหรือยัง)
    if (calledImageDateInfoRef.current === dateInfoKey) {
      console.log("⚠️ Image API ถูกเรียกไปแล้วสำหรับ dateInfo นี้ ข้ามการเรียกซ้ำ");
      return;
    }

    // ตั้ง flag ว่าเรียก API ไปแล้ว (ตั้งก่อนเรียก async function เพื่อป้องกัน StrictMode double call)
    calledImageDateInfoRef.current = dateInfoKey;
    console.log("🎨 เริ่มสร้างภาพวอลเปเปอร์พร้อมกับทำนายดวง");

    const generateImage = async () => {
      try {
        console.log("⏳ กำลังเรียก API สร้างภาพ...");
        const result = await generateWallpaperImage(dateInfo);

        if (result.success && result.base64) {
          console.log("✅ ภาพสร้างเสร็จแล้ว");
          // ส่งภาพไปยัง parent component
          if (onImageGenerated) {
            onImageGenerated(result.base64);
          }
        } else {
          console.error("❌ Image generation failed:", result.error);
          // ส่ง null ถ้าเกิด error
          if (onImageGenerated) {
            onImageGenerated(null);
          }
        }
      } catch (error) {
        console.error('❌ Error generating image:', error);
        // ส่ง null ถ้าเกิด error
        if (onImageGenerated) {
          onImageGenerated(null);
        }
      }
    };

    generateImage();
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

