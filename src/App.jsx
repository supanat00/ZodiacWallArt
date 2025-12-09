import { useState, useCallback } from 'react';
import CameraBackground from './components/CameraBackground';
import DatePicker from './components/DatePicker';
import LoadingScreen from './components/LoadingScreen';
import WallpaperResult from './components/WallpaperResult';
import './App.css';

function App() {
  const [step, setStep] = useState(1); // 1: Date picker, 2: Loading, 3: Result
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleDateSelect = (date) => {
    setDateOfBirth(date);
    setGeneratedImage(null); // Reset image เมื่อเริ่มใหม่
    setStep(2); // Move to loading screen

    // Temporarily disabled auto-transition to step 3 for UI editing
    // setTimeout(() => {
    //   setStep(3); // Move to result screen
    // }, 2000);
  };

  const handleGetWallpaper = () => {
    setStep(3); // Move to result screen
  };

  // ใช้ useCallback เพื่อป้องกัน function reference เปลี่ยน
  const handleImageGenerated = useCallback((imageBase64) => {
    setGeneratedImage(imageBase64);
  }, []);

  const handlePlayAgain = () => {
    // รีเฟรชหน้าเพื่อ reset ทุกอย่าง
    window.location.reload();
  };

  return (
    <div className={`app-container ${step === 3 ? 'result-page' : ''}`}>
      <CameraBackground isEnabled={step !== 3} />
      {step === 1 && <DatePicker onDateSelect={handleDateSelect} />}
      {step === 2 && <LoadingScreen dateInfo={dateOfBirth} onGetWallpaper={handleGetWallpaper} onImageGenerated={handleImageGenerated} />}
      {step === 3 && <WallpaperResult wallpaperUrl={null} dateInfo={dateOfBirth} generatedImage={generatedImage} onPlayAgain={handlePlayAgain} />}
    </div>
  );
}

export default App;
