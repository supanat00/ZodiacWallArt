import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initLiff } from './services/liffService'

// Initialize LINE LIFF ก่อน render app
initLiff().then((liff) => {
  if (liff) {
    console.log('✅ LINE LIFF is ready');
  } else {
    console.log('ℹ️ Running in regular browser (not LINE app)');
  }

  // Render app หลังจาก initialize LIFF
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('❌ Failed to initialize LIFF:', error);
  // แม้ LIFF จะ initialize ไม่สำเร็จ ก็ยัง render app ได้ (สำหรับ browser ปกติ)
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
