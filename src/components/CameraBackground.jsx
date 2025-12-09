import { useEffect, useRef, useState } from 'react';
import './CameraBackground.css';

function CameraBackground({ isEnabled = true }) {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    // ถ้าไม่ต้องเปิดกล้อง ให้ปิดทันที
    if (!isEnabled) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        // ตั้งค่ากล้องให้ชัดและเหมาะกับ mobile
        const constraints = {
          video: { 
            facingMode: 'user', // เปิดกล้องหน้า
            width: { 
              ideal: 1920,
              min: 1280
            },
            height: { 
              ideal: 1080,
              min: 720
            },
            // เพิ่มคุณภาพสำหรับ mobile
            aspectRatio: { ideal: 16/9 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // ตั้งค่าให้ video แสดงผลชัด
          videoRef.current.setAttribute('playsinline', 'true');
          setCameraError(false);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        // ลองใช้ constraints ที่ต่ำกว่า
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            setCameraError(false);
          }
        } catch (fallbackError) {
          console.error('Fallback camera access failed:', fallbackError);
          setCameraError(true);
        }
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isEnabled]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-background"
      />
      {cameraError && (
        <div className="camera-fallback">
          {/* Fallback background when camera is not available */}
        </div>
      )}
    </>
  );
}

export default CameraBackground;

