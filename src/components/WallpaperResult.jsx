import { useState, useEffect, useMemo, useRef } from 'react';
import './WallpaperResult.css';
import mockupBg from '../assets/mockup_bg.png';
import mockupWallpaper01 from '../assets/mockup_wallpaper_01.png';
import mockupWallpaper02 from '../assets/mockup_wallpaper_02.png';
import { generateWallpaperImage } from '../services/imageGenerationApi';
import { isLiffReady, isInLine, shareImageToLine } from '../services/liffService';

function WallpaperResult({ wallpaperUrl, dateInfo, generatedImage: propGeneratedImage, onPlayAgain }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dots, setDots] = useState('');
  const [generatedImage, setGeneratedImage] = useState(propGeneratedImage || null);
  const [error, setError] = useState(null);
  const [imageReadyTime, setImageReadyTime] = useState(null); // เวลาที่ภาพพร้อม
  const [componentMountTime] = useState(Date.now()); // เวลาที่ component mount
  const minimumLoadingTime = 4000; // อย่างน้อย 4 วินาที (4000ms)
  const hasCalledFallbackRef = useRef(false); // ป้องกันการเรียก fallback API ซ้ำ
  const lastDateInfoKeyRef = useRef(null); // เก็บ dateInfo key ล่าสุดที่เรียก API

  // สุ่มเลือก mockup wallpaper สำหรับแสดงตอน loading
  const selectedMockupWallpaper = useMemo(() => {
    const mockups = [mockupWallpaper01, mockupWallpaper02];
    return mockups[Math.floor(Math.random() * mockups.length)];
  }, []);

  useEffect(() => {
    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(dotsInterval);
    };
  }, []);

  // รับภาพจาก prop (ที่สร้างไว้แล้วใน LoadingScreen) หรือเรียก API fallback
  useEffect(() => {
    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบ
    const dateInfoKey = dateInfo ? JSON.stringify(dateInfo) : null;

    if (propGeneratedImage) {
      console.log("✅ Received pre-generated image");
      setGeneratedImage(propGeneratedImage);
      setImageReadyTime(Date.now());
      // Reset flags เมื่อได้รับภาพใหม่ (อาจเป็น dateInfo ใหม่)
      if (lastDateInfoKeyRef.current !== dateInfoKey) {
        hasCalledFallbackRef.current = false;
        lastDateInfoKeyRef.current = dateInfoKey;
      }
    } else if (!generatedImage && !error && dateInfo) {
      // ตรวจสอบว่า dateInfo เปลี่ยนหรือไม่ (ถ้าเปลี่ยน ให้ reset flags)
      if (lastDateInfoKeyRef.current !== dateInfoKey) {
        hasCalledFallbackRef.current = false;
        lastDateInfoKeyRef.current = dateInfoKey;
      }

      // ถ้ายังไม่มีภาพ และยังไม่เคยเรียก API สำหรับ dateInfo นี้ ให้เรียก API สร้างภาพ (fallback)
      if (!hasCalledFallbackRef.current) {
        hasCalledFallbackRef.current = true; // ตั้ง flag ก่อนเรียก API
        console.log("🎨 Starting wallpaper generation (fallback) with dateInfo:", dateInfo);

        let isCancelled = false;

        const generateImage = async () => {
          try {
            const result = await generateWallpaperImage(dateInfo);

            // ตรวจสอบว่า component ยัง mount อยู่หรือไม่ และ dateInfo ยังเหมือนเดิมหรือไม่
            if (isCancelled || lastDateInfoKeyRef.current !== dateInfoKey) {
              console.log("⚠️ Component unmounted or dateInfo changed, skipping fallback image result");
              return;
            }

            if (result.success && result.base64) {
              console.log("✅ Image generated successfully (fallback)");
              setGeneratedImage(result.base64);
              setImageReadyTime(Date.now());
            } else {
              console.error("❌ Image generation failed:", result.error);
              if (!isCancelled && lastDateInfoKeyRef.current === dateInfoKey) {
                setError(result.error || "เกิดข้อผิดพลาดในการสร้างภาพ");
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.error("❌ Error in generateImage:", error);
            if (!isCancelled && lastDateInfoKeyRef.current === dateInfoKey) {
              setError(error.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
              setIsLoading(false);
            }
          }
        };

        generateImage();

        // Cleanup function
        return () => {
          isCancelled = true;
          console.log("🧹 Cleanup: ยกเลิกการเรียก fallback API สร้างภาพ");
        };
      }
    } else if (!dateInfo) {
      console.error("❌ dateInfo is missing");
      setError("ข้อมูลวันเกิดไม่ครบถ้วน");
      setIsLoading(false);
    }
  }, [propGeneratedImage, dateInfo]); // ลบ generatedImage และ error ออกจาก dependency เพื่อป้องกันการ trigger ซ้ำ

  // จัดการ loading state โดยคำนึงถึง minimum loading time (นับจาก component mount)
  useEffect(() => {
    if (generatedImage && imageReadyTime) {
      const elapsedSinceMount = Date.now() - componentMountTime;
      const remainingTime = Math.max(0, minimumLoadingTime - elapsedSinceMount);

      if (remainingTime > 0) {
        console.log(`⏳ Waiting ${remainingTime}ms more to meet minimum loading time (${elapsedSinceMount}ms elapsed)`);
        const timer = setTimeout(() => {
          console.log("✅ Minimum loading time reached, showing image");
          setIsLoading(false);
        }, remainingTime);
        return () => clearTimeout(timer);
      } else {
        // ถ้าเวลาผ่านไปแล้วมากกว่า minimum time ให้แสดงทันที
        console.log(`✅ Image ready and minimum time already passed (${elapsedSinceMount}ms elapsed)`);
        setIsLoading(false);
      }
    } else if (error) {
      setIsLoading(false);
    }
  }, [generatedImage, imageReadyTime, error, componentMountTime]);

  const handleDownload = async () => {
    if (isLoading || !generatedImage) return;

    try {
      // แปลง base64 เป็น blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `วอลเปเปอร์มงคลเสริมดวง_${Date.now()}.png`;

      // ตรวจสอบว่าเป็น mobile หรือ LINE app
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLineApp = isLiffReady() && isInLine();

      // สำหรับ mobile และ LINE: ใช้ Web Share API เพื่อให้ผู้ใช้เลือกบันทึก
      if ((isMobile || isLineApp) && navigator.share) {
        try {
          const file = new File([blob], fileName, {
            type: 'image/png',
            lastModified: Date.now()
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'บันทึกวอลเปเปอร์มงคลเสริมดวง',
              text: 'บันทึกวอลเปเปอร์มงคลเสริมดวง',
              files: [file],
            });
            console.log('✅ Wallpaper download initiated via share menu');
            URL.revokeObjectURL(blobUrl); // ทำความสะอาด
            return;
          }
        } catch (shareError) {
          console.log('⚠️ Web Share API failed, using fallback download:', shareError);
        }
      }

      // สำหรับ desktop หรือ fallback: ใช้ download attribute
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // รอสักครู่แล้วลบ link และ revoke blob URL
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      console.log('✅ Wallpaper downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading wallpaper:', error);
      alert('ไม่สามารถดาวน์โหลดภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleShare = async () => {
    if (isLoading || !generatedImage) return;

    try {
      // แปลง base64 เป็น blob และ File object
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `วอลเปเปอร์มงคลเสริมดวง_${Date.now()}.png`, {
        type: 'image/png',
        lastModified: Date.now()
      });

      // ตรวจสอบว่าเป็น mobile หรือ LINE app
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLineApp = isLiffReady() && isInLine();

      // ใช้ Web Share API สำหรับ mobile และ LINE
      if ((isMobile || isLineApp) && navigator.share) {
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'วอลเปเปอร์มงคลเสริมดวง',
              text: 'รับวอลเปเปอร์มงคลเสริมดวง',
              files: [file],
            });
            console.log('✅ Wallpaper shared successfully');
            return;
          }
        } catch (shareError) {
          // ถ้าไม่รองรับ file sharing ให้แชร์ URL แทน
          console.log('⚠️ File share not supported, trying URL share:', shareError);
          try {
            await navigator.share({
              title: 'วอลเปเปอร์มงคลเสริมดวง',
              text: 'รับวอลเปเปอร์มงคลเสริมดวง',
              url: window.location.href,
            });
            console.log('✅ Wallpaper URL shared successfully');
            return;
          } catch (urlShareError) {
            console.log('⚠️ URL share also failed:', urlShareError);
          }
        }
      }

      // สำหรับ desktop หรือ fallback: แชร์ URL
      if (navigator.share) {
        await navigator.share({
          title: 'วอลเปเปอร์มงคลเสริมดวง',
          text: 'รับวอลเปเปอร์มงคลเสริมดวง',
          url: window.location.href,
        });
        console.log('✅ Wallpaper URL shared successfully');
      } else {
        // Fallback: คัดลอก URL ไปยัง clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว');
          console.log('✅ URL copied to clipboard');
        } catch (clipboardError) {
          console.error('❌ Error copying to clipboard:', clipboardError);
          alert('ไม่สามารถแชร์ได้ กรุณาลองใหม่อีกครั้ง');
        }
      }
    } catch (error) {
      console.error('❌ Error sharing wallpaper:', error);
      // Fallback: คัดลอก URL ไปยัง clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว');
      } catch (clipboardError) {
        console.error('❌ Error copying to clipboard:', clipboardError);
        alert('ไม่สามารถแชร์ได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  return (
    <div className="wallpaper-result" style={{ backgroundImage: `url(${mockupBg})` }}>
      <div className="wallpaper-header">
        วอลเปเปอร์มงคลเสริมดวง
      </div>
      <div className="wallpaper-card-wrapper">
        <div className="wallpaper-card">
          {isLoading && (
            <div className="wallpaper-loading-text">
              กำลังใช้แต้มดวงสร้างภาพ{dots}
            </div>
          )}
          {error ? (
            <div className="wallpaper-error">
              <p>{error}</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                กำลังแสดงภาพตัวอย่าง
              </p>
            </div>
          ) : null}
          <img
            src={generatedImage || wallpaperUrl || selectedMockupWallpaper}
            alt="Wallpaper"
            className={`wallpaper-image ${isLoading ? 'loading-blur' : ''}`}
            onError={(e) => {
              console.error('❌ Error loading image, using fallback');
              e.target.src = selectedMockupWallpaper;
            }}
          />
        </div>
        <div className="wallpaper-actions-bottom">
          <button
            className={`play-again-text-button ${isLoading ? 'disabled' : ''}`}
            onClick={onPlayAgain}
            disabled={isLoading}
          >
            เล่นอีกครั้ง
          </button>
          <div className="action-buttons-right">
            <button
              className={`action-button download-button ${isLoading ? 'disabled' : ''}`}
              onClick={handleDownload}
              title="ดาวน์โหลด"
              disabled={isLoading}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button
              className={`action-button share-button ${isLoading ? 'disabled' : ''}`}
              onClick={handleShare}
              title="แชร์"
              disabled={isLoading}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WallpaperResult;

