import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCosmicDragonParticles } from '../utils/dragonGenerator';
import { particleVertexShader, particleFragmentShader } from '../shaders/particleShaders';

// Shared animation state that GSAP will target directly
export const animState = {
  transition: 0.0,
  logoTransition: 0.0,
  dispersal: 0.0,
  circleWrap: 0.0,
  ascension: 0.0,
  
  // Camera target coordinates
  cameraX: 0.0,
  cameraY: 8.0,
  cameraZ: 45.0,
  
  // Camera look-at target coordinates
  lookAtX: 0.0,
  lookAtY: 0.0,
  lookAtZ: 16.0,
  
  // Shader parameters
  pointSize: 0.16,
  swimSpeed: 1.5,
  swimAmplitude: 0.8,
  mouseStrength: 0.0,
};

export function CosmicDragon() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  // Mouse tracking refs
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const mouseStrengthRef = useRef(0.0);

  // 1. ADAPTIVE QUALITY: Scale particle count based on device profile
  const particleCount = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    // Check GPU capability if possible (WebGL extension / hardware concurrency)
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd = cores < 6;

    if (isMobile || isLowEnd) {
      console.log('Mobile/Low-End detected: Rendering 300,000 particles');
      return 300000;
    } else if (isTablet) {
      console.log('Tablet detected: Rendering 600,000 particles');
      return 600000;
    } else {
      console.log('High-End Desktop detected: Rendering 1,200,000 particles');
      return 1200000;
    }
  }, []);

  // 2. GENERATE MATH-BASED POINT CLOUDS
  const particleData = useMemo(() => {
    return generateCosmicDragonParticles(particleCount);
  }, [particleCount]);

  // Create Float32Buffers
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    
    geom.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geom.setAttribute('aTargetPosition', new THREE.BufferAttribute(particleData.targetPositions, 3));
    geom.setAttribute('aLogoPosition', new THREE.BufferAttribute(particleData.logoPositions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(particleData.colors, 3));
    geom.setAttribute('aRandom', new THREE.BufferAttribute(particleData.randoms, 4));
    geom.setAttribute('aVelocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geom.setAttribute('aExtra', new THREE.BufferAttribute(particleData.extras, 3));
    
    // Prevent premature frustum culling by setting a massive bounding sphere
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 16), 100);
    
    return geom;
  }, [particleData]);

  // 3. SHADER MATERIAL UNIFORMS
  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uTransition: { value: 0 },
      uLogoTransition: { value: 0 },
      uDispersal: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0 },
      uPointSize: { value: 0.16 },
      uSwimSpeed: { value: 1.5 },
      uSwimAmplitude: { value: 0.8 },
      uCircleWrap: { value: 0 },
      uAscension: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
    };
  }, [size]);

  // Update resolution on size change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
      materialRef.current.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2.0);
    }
  }, [size]);

  // Track Mouse Movements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1 range
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 4. ANIMATION & CAMERA UPDATE LOOP (runs every frame)
  useFrame((state) => {
    const { clock, camera } = state;
    const time = clock.getElapsedTime();

    if (materialRef.current) {
      // Bind time
      materialRef.current.uniforms.uTime.value = time;

      // Copy GSAP scrubbed values into uniforms
      materialRef.current.uniforms.uTransition.value = animState.transition;
      materialRef.current.uniforms.uLogoTransition.value = animState.logoTransition;
      materialRef.current.uniforms.uDispersal.value = animState.dispersal;
      materialRef.current.uniforms.uCircleWrap.value = animState.circleWrap;
      materialRef.current.uniforms.uAscension.value = animState.ascension;
      materialRef.current.uniforms.uPointSize.value = animState.pointSize;
      materialRef.current.uniforms.uSwimSpeed.value = animState.swimSpeed;
      materialRef.current.uniforms.uSwimAmplitude.value = animState.swimAmplitude;

      // Smooth mouse lerping
      const targetMouseX = mouseRef.current.x;
      const targetMouseY = mouseRef.current.y;
      
      materialRef.current.uniforms.uMouse.value.x += (targetMouseX - materialRef.current.uniforms.uMouse.value.x) * 0.05;
      materialRef.current.uniforms.uMouse.value.y += (targetMouseY - materialRef.current.uniforms.uMouse.value.y) * 0.05;

      // Fade mouse interaction strength in/out
      const targetStrength = mouseRef.current.active ? 1.0 : 0.0;
      mouseStrengthRef.current += (targetStrength - mouseStrengthRef.current) * 0.04;
      materialRef.current.uniforms.uMouseStrength.value = mouseStrengthRef.current * animState.mouseStrength;
    }

    // Smooth camera updates based on animState positions
    // Glide camera position
    camera.position.x += (animState.cameraX - camera.position.x) * 0.06;
    camera.position.y += (animState.cameraY - camera.position.y) * 0.06;
    camera.position.z += (animState.cameraZ - camera.position.z) * 0.06;

    // Glide look-at target
    const currentLookAt = new THREE.Vector3(
      animState.lookAtX,
      animState.lookAtY,
      animState.lookAtZ
    );
    // Retrieve what the camera is looking at
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    // Compute current target looking point
    const currentLookPoint = camera.position.clone().add(cameraDirection.multiplyScalar(20));
    
    // Lerp looking target
    currentLookPoint.lerp(currentLookAt, 0.08);
    camera.lookAt(currentLookPoint);
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
