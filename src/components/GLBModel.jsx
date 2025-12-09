import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function GLBModel({ modelPath, animationName }) {
  const group = useRef(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    console.log('Available animations:', names);
    console.log('Requested animation:', animationName);

    if (actions && animationName) {
      // Try exact match first
      let action = actions[animationName];

      // If not found, try case-insensitive match
      if (!action && names) {
        const foundName = names.find(name =>
          name.toLowerCase() === animationName.toLowerCase()
        );
        if (foundName) {
          action = actions[foundName];
        }
      }

      // If still not found, use first available animation
      if (!action && names && names.length > 0) {
        action = actions[names[0]];
        console.log('Using first available animation:', names[0]);
      }

      if (action) {
        action.reset().fadeIn(0.5).play();
        action.setLoop(THREE.LoopRepeat);

        return () => {
          if (action) {
            action.fadeOut(0.5);
            action.stop();
          }
        };
      } else {
        console.warn('Animation not found:', animationName);
      }
    }
  }, [actions, animationName, names]);

  // Reset rotation เมื่อ component mount
  useEffect(() => {
    if (group.current) {
      group.current.rotation.y = 0; // Reset rotation
    }
  }, []);

  // Calculate bounding box to center and scale the model
  useEffect(() => {
    if (scene && group.current) {
      let retryCount = 0;
      const maxRetries = 20; // จำกัดจำนวนครั้งที่ retry (2 วินาที)

      // รอให้ scene โหลดเสร็จก่อน
      const checkAndScale = () => {
        try {
          // ตรวจสอบว่า scene มี geometry หรือไม่
          let hasGeometry = false;
          scene.traverse((child) => {
            if (child.geometry) {
              hasGeometry = true;
            }
          });

          if (!hasGeometry && retryCount < maxRetries) {
            // ถ้ายังไม่มี geometry รออีกสักครู่
            retryCount++;
            setTimeout(checkAndScale, 100);
            return;
          }

          // ถ้ายังไม่มี geometry หลังจาก retry หลายครั้ง ให้ใช้ค่า default
          if (!hasGeometry) {
            console.warn('Model geometry not loaded, using default scale');
            scene.scale.set(1, 1, 1);
            return;
          }

          const box = new THREE.Box3().setFromObject(scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          // ตรวจสอบว่า maxDim ไม่เป็น 0 หรือ Infinity
          if (maxDim > 0 && isFinite(maxDim)) {
            const scale = 4 / maxDim; // Scale to fit in a 4 unit space (larger model)

            scene.position.x = -center.x * scale;
            scene.position.y = -center.y * scale;
            scene.position.z = -center.z * scale;
            scene.scale.set(scale, scale, scale);
          } else {
            console.warn('Invalid bounding box dimensions, using default scale');
            scene.scale.set(1, 1, 1);
          }
        } catch (error) {
          console.warn('Error scaling model:', error);
          scene.scale.set(1, 1, 1); // Fallback to default scale
        }
      };

      // เริ่มตรวจสอบหลังจาก scene โหลด (รอสักครู่เพื่อให้ geometry โหลดเสร็จ)
      setTimeout(checkAndScale, 50);
    }
  }, [scene]);

  // Rotate the model horizontally (Y-axis)
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5; // Rotate at 0.5 radians per second
    }
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model
useGLTF.preload = useGLTF.preload || (() => { });

export default GLBModel;
