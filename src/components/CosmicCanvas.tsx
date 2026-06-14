import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { CosmicDragon } from './CosmicDragon';

export function CosmicCanvas() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, background: '#020008' }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 8, 45], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#020008']} />

        {/* Ambient Space Fog */}
        <fog attach="fog" args={['#020008', 30, 90]} />

        {/* Layered Background Stars */}
        <Stars 
          radius={80} 
          depth={60} 
          count={6000} 
          factor={6} 
          saturation={0.8} 
          fade 
          speed={1.2} 
        />
        
        <Stars 
          radius={150} 
          depth={80} 
          count={4000} 
          factor={8} 
          saturation={0.5} 
          fade 
          speed={0.6} 
        />

        {/* The living Cosmic Dragon simulation */}
        <CosmicDragon />

        {/* Cinematic Post Processing Pipeline */}
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <DepthOfField 
            focusDistance={0.3} 
            focalLength={0.06} 
            bokehScale={2.0} 
          />
          <Bloom 
            intensity={1.8} 
            luminanceThreshold={0.1} 
            luminanceSmoothing={0.8} 
            mipmapBlur
          />
          <ChromaticAberration 
            offset={[0.0016, 0.0016]} 
          />
          <Vignette 
            offset={0.25} 
            darkness={1.15} 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
export default CosmicCanvas;
