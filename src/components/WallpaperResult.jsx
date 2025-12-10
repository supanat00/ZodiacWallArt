import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './WallpaperResult.css';
import mockupBg from '../assets/mockup_bg.png';
import mockupWallpaper01 from '../assets/mockup_wallpaper_01.png';
import mockupWallpaper02 from '../assets/mockup_wallpaper_02.png';
import { generateWallpaperImage } from '../services/imageGenerationApi';
import { isLiffReady, isInLine, shareImageToLine } from '../services/liffService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

function WallpaperResult({ wallpaperUrl, dateInfo, generatedImage: propGeneratedImage, onPlayAgain }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dots, setDots] = useState('');
  const [generatedImage, setGeneratedImage] = useState(propGeneratedImage || null);
  const [imageBlobUrl, setImageBlobUrl] = useState(null); // Blob URL สำหรับดาวน์โหลด/แชร์
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null); // Cloudinary URL สำหรับเปิด external browser
  const [isUploading, setIsUploading] = useState(false); // สถานะการอัปโหลด
  const [error, setError] = useState(null);
  const [imageReadyTime, setImageReadyTime] = useState(null); // เวลาที่ภาพพร้อม
  const [componentMountTime] = useState(Date.now()); // เวลาที่ component mount
  const minimumLoadingTime = 4000; // อย่างน้อย 4 วินาที (4000ms)
  const hasCalledFallbackRef = useRef(false); // ป้องกันการเรียก fallback API ซ้ำ
  const lastDateInfoKeyRef = useRef(null); // เก็บ dateInfo key ล่าสุดที่เรียก API
  const hasUploadedRef = useRef(false); // ป้องกันการอัปโหลดซ้ำ

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

  // สร้าง Blob URL จาก base64 image
  const createBlobUrlFromBase64 = useCallback(async (base64String) => {
    try {
      // ลบ Blob URL เก่าถ้ามี
      setImageBlobUrl(prevUrl => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });

      // แปลง base64 เป็น blob
      const response = await fetch(base64String);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImageBlobUrl(blobUrl);
      console.log('✅ Blob URL created for download/share');
    } catch (error) {
      console.error('❌ Error creating Blob URL:', error);
    }
  }, []);

  // รับภาพจาก prop (ที่สร้างไว้แล้วใน LoadingScreen) หรือเรียก API fallback
  useEffect(() => {
    // สร้าง unique key จาก dateInfo เพื่อตรวจสอบ
    const dateInfoKey = dateInfo ? JSON.stringify(dateInfo) : null;

    if (propGeneratedImage) {
      console.log("✅ Received pre-generated image");
      setGeneratedImage(propGeneratedImage);
      setImageReadyTime(Date.now());
      // สร้าง Blob URL จาก base64
      createBlobUrlFromBase64(propGeneratedImage);
      // Reset flags เมื่อได้รับภาพใหม่ (อาจเป็น dateInfo ใหม่)
      if (lastDateInfoKeyRef.current !== dateInfoKey) {
        hasCalledFallbackRef.current = false;
        lastDateInfoKeyRef.current = dateInfoKey;
        hasUploadedRef.current = false; // Reset upload flag
        setCloudinaryUrl(null); // Reset Cloudinary URL
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
              // สร้าง Blob URL จาก base64
              createBlobUrlFromBase64(result.base64);
              // Reset upload flag
              hasUploadedRef.current = false;
              setCloudinaryUrl(null);
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
  }, [propGeneratedImage, dateInfo, createBlobUrlFromBase64, generatedImage, error]); // เพิ่ม createBlobUrlFromBase64 ใน dependency

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


  // อัปโหลดภาพไปยัง Cloudinary เมื่อภาพพร้อม
  useEffect(() => {
    if (generatedImage && !isLoading && !hasUploadedRef.current && !cloudinaryUrl) {
      const uploadImage = async () => {
        setIsUploading(true);
        hasUploadedRef.current = true; // ตั้ง flag ก่อนอัปโหลด
        console.log('📤 Uploading image to Cloudinary...');

        const result = await uploadImageToCloudinary(generatedImage, 'zodiac');

        if (result.success && result.url) {
          setCloudinaryUrl(result.url);
          console.log('✅ Image uploaded to Cloudinary:', result.url);
        } else {
          console.error('❌ Failed to upload to Cloudinary:', result.error);
          hasUploadedRef.current = false; // Reset flag ถ้าอัปโหลดไม่สำเร็จ
        }

        setIsUploading(false);
      };

      uploadImage();
    }
  }, [generatedImage, isLoading, cloudinaryUrl]);

  // ทำความสะอาด Blob URL เมื่อ component unmount
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
        console.log('🧹 Cleaned up Blob URL');
      }
    };
  }, [imageBlobUrl]);

  // ตรวจสอบว่าเปิดใน LINE LIFF หรือไม่
  const isInLineApp = isLiffReady() && isInLine();

  // Handler สำหรับปุ่ม download (สำหรับ browser ปกติ)
  const handleDownload = async () => {
    if (isLoading || !generatedImage || !imageBlobUrl) return;

    try {
      const fileName = `วอลเปเปอร์มงคลเสริมดวง_${Date.now()}.png`;

      // ใช้ Blob URL ที่สร้างไว้แล้วสำหรับดาวน์โหลด
      const link = document.createElement('a');
      link.href = imageBlobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // รอสักครู่แล้วลบ link
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      console.log('✅ Wallpaper downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading wallpaper:', error);
      alert('ไม่สามารถดาวน์โหลดภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handler สำหรับปุ่ม share (สำหรับ browser ปกติ)
  const handleShare = async () => {
    if (isLoading || !generatedImage || !imageBlobUrl) return;

    try {
      // ใช้ Blob URL ที่สร้างไว้แล้ว แปลงเป็น File object
      const response = await fetch(imageBlobUrl);
      const blob = await response.blob();
      const file = new File([blob], `วอลเปเปอร์มงคลเสริมดวง_${Date.now()}.png`, {
        type: 'image/png',
        lastModified: Date.now()
      });

      // ตรวจสอบว่าเป็น mobile หรือไม่
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // ใช้ Web Share API สำหรับ mobile
      if (isMobile && navigator.share) {
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'วอลเปเปอร์มงคลเสริมดวง',
              text: 'รับวอลเปเปอร์มงคลเสริมดวง',
              files: [file],
            });
            console.log('✅ Wallpaper shared successfully via Web Share API');
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

  // Handler สำหรับปุ่ม save&share (สำหรับ LINE LIFF - เปิด Cloudinary URL ใน external browser)
  const handleSaveAndShare = async () => {
    if (isLoading || !generatedImage) return;

    // ใช้ Cloudinary URL ถ้ามี (แนะนำ) หรือ fallback เป็น blob URL
    const imageUrl = cloudinaryUrl || imageBlobUrl || generatedImage;

    if (!imageUrl) {
      console.warn('⚠️ No image URL available');
      alert('ยังไม่มีลิงก์ภาพ กรุณารอสักครู่...');
      return;
    }

    // ถ้ายังไม่มี Cloudinary URL และกำลังอัปโหลดอยู่
    if (!cloudinaryUrl && isUploading) {
      alert('กำลังอัปโหลดภาพ กรุณารอสักครู่แล้วลองอีกครั้ง');
      return;
    }

    // Log URL ที่จะเปิด (สำหรับ debug)
    console.log('🔗 Opening URL:', cloudinaryUrl ? 'Cloudinary URL' : 'Fallback URL');

    try {
      // ตรวจสอบว่า LIFF พร้อมหรือไม่
      if (isLiffReady() && isInLine()) {
        // ใช้ LIFF openWindow สำหรับเปิด external browser
        // ตามตัวอย่าง: liff.openWindow({ url: "https://...", external: true })
        const liffInstance = window.liff;
        if (liffInstance && liffInstance.openWindow) {
          await liffInstance.openWindow({
            url: imageUrl,
            external: true,
          });
          console.log('✅ Opening external browser with Cloudinary URL via liff.openWindow');
          return;
        } else {
          console.warn('⚠️ liff.openWindow is not available');
        }
      } else {
        console.log('ℹ️ Not in LINE app, using fallback');
      }

      // Fallback: เปิดใน tab ใหม่
      window.open(imageUrl, '_blank');
      console.log('✅ Opening URL in new tab (fallback)');
    } catch (error) {
      console.error('❌ Error opening external browser:', error);
      alert('ไม่สามารถเปิดภาพได้ กรุณาลองใหม่อีกครั้ง');
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
          <button
            className={`play-again-text-button save-share-button ${isLoading || isUploading ? 'disabled' : ''}`}
            onClick={handleSaveAndShare}
            disabled={isLoading || isUploading}
            style={{ marginLeft: '0.5rem' }}
          >
            {isUploading ? 'กำลังอัปโหลด...' : 'save&share'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WallpaperResult;

