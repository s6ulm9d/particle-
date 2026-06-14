// custom GLSL Shaders for the Cosmic Particle Dragon Experience

export const particleVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  uniform float uTransition;
  uniform float uLogoTransition;
  uniform float uDispersal;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uPointSize;
  uniform float uSwimSpeed;
  uniform float uSwimAmplitude;
  uniform float uCircleWrap;
  uniform float uAscension;
  uniform float uPixelRatio;

  attribute vec3 aTargetPosition;
  attribute vec3 aLogoPosition;
  attribute vec4 aRandom; // x: speed, y: size, z: phase, w: type
  attribute vec3 aVelocity;
  attribute vec3 aExtra; // x: energyLevel, y: noiseSeed, z: glowStrength
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vType;
  varying float vEnergy;
  varying float vGlow;
  varying float vRelativeDepth;

  // --- SIMPLEX 3D NOISE BY ASHIMA ARTS ---
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  vec3 curlNoise(vec3 p) {
    float e = 0.08;
    float dx = snoise(p + vec3(e, 0.0, 0.0)) - snoise(p - vec3(e, 0.0, 0.0));
    float dy = snoise(p + vec3(0.0, e, 0.0)) - snoise(p - vec3(0.0, e, 0.0));
    float dz = snoise(p + vec3(0.0, 0.0, e)) - snoise(p - vec3(0.0, 0.0, e));
    return normalize(vec3(dy - dz, dz - dx, dx - dy)) / (2.0 * e);
  }

  void main() {
    vColor = aColor;
    vType = aRandom.w;
    vEnergy = aExtra.x;
    vGlow = aExtra.z;

    // 1. GALAXY INITIAL ROTATION
    vec3 scatteredPos = position;
    float rotSpeed = 0.05 * aRandom.x;
    float angle = uTime * rotSpeed;
    float cosA = cos(angle);
    float sinA = sin(angle);
    
    // Rotate in XZ plane
    float rx = scatteredPos.x * cosA - scatteredPos.z * sinA;
    float rz = scatteredPos.x * sinA + scatteredPos.z * cosA;
    scatteredPos.x = rx;
    scatteredPos.z = rz;

    // Add gentle orbital drift
    scatteredPos += aVelocity * uTime * 0.1;
    // Add background nebula noise
    scatteredPos += curlNoise(scatteredPos * 0.04 + uTime * 0.05) * 1.5;

    // 2. DRAGON STRUCTURE
    vec3 dragonPos = aTargetPosition;

    // Serpentine wave animation along the Z-axis (spine)
    // Front is around Z=0, tail is Z=32
    float spineProgress = clamp(dragonPos.z / 32.0, 0.0, 1.0);
    float waveTime = uTime * uSwimSpeed;
    
    float waveX = 0.0;
    float waveY = 0.0;

    if (vType == 7.0 || vType == 8.0) {
      // Legs (Type 7) and Wings (Type 8) wave in sync with their shoulder/hip spine anchors
      float anchorZ = aRandom.z * 32.0;
      float anchorPhase = (anchorZ * 0.16) - waveTime;
      float anchorAmp = anchorZ / 32.0;
      waveX = sin(anchorPhase) * uSwimAmplitude * anchorAmp;
      waveY = cos(anchorPhase * 0.7) * uSwimAmplitude * 0.65 * anchorAmp;
    } else {
      // General body, head, scales wave
      float wavePhase = (dragonPos.z * 0.16) - waveTime;
      float ampFactor = spineProgress;
      if (vType == 1.0 || vType == 6.0) {
        ampFactor = 0.04; // Head and eyes wiggle very slightly for breathing
      }
      waveX = sin(wavePhase) * uSwimAmplitude * ampFactor;
      waveY = cos(wavePhase * 0.7) * uSwimAmplitude * 0.65 * ampFactor;
    }

    dragonPos.x += waveX;
    dragonPos.y += waveY;

    // Whisker waving (Type 3) - coherent along whisker progress
    if (vType == 3.0) {
      float progress = aRandom.z; // strand progress [0, 1]
      float wPhase = uTime * 3.5 - progress * 4.0;
      dragonPos.x += sin(wPhase) * 1.4 * progress;
      dragonPos.y += cos(wPhase * 0.8) * 0.8 * progress;
    }

    // Antler horn vibration (Type 2)
    if (vType == 2.0) {
      float progress = aRandom.z; // horn progress [0, 1]
      dragonPos.x += sin(uTime * 6.0 + aExtra.y * 6.28) * 0.08 * progress;
      dragonPos.y += cos(uTime * 4.5 + aExtra.y * 6.28) * 0.08 * progress;
    }

    // Tail waving extension (Type 5)
    if (vType == 5.0) {
      float progress = aRandom.z; // tail progress [0, 1]
      float tailPhase = uTime * 3.0 - progress * 3.0;
      dragonPos.x += sin(tailPhase) * 1.8 * progress;
      dragonPos.y += cos(tailPhase * 0.7) * 1.2 * progress;
    }

    // Wing flapping animation (Type 8) - coherent along wing progress
    if (vType == 8.0) {
      float progress = aRandom.z; // wing progress [0, 1]
      float flap = sin(uTime * uSwimSpeed * 1.4 - progress * 1.2) * uSwimAmplitude * 1.3 * progress;
      dragonPos.y += flap;
      dragonPos.x -= abs(flap) * 0.15 * progress;
    }

    // Coherent idle breathing (undulation) added globally to dragon
    float breathe = sin(uTime * 1.5 + dragonPos.z * 0.08) * 0.15;
    dragonPos.y += breathe;

    // 3. CURSOR ATTRACTION (Tracks snout, head, eyes, whiskers)
    if (vType == 1.0 || vType == 6.0 || vType == 3.0) {
      vec3 cursorTarget = vec3(uMouse.x * 7.0, uMouse.y * 5.0, -1.8);
      float pull = uMouseStrength * (1.0 - spineProgress); // Strongest at front snout
      dragonPos = mix(dragonPos, dragonPos + (cursorTarget - dragonPos) * 0.18, pull);
    }

    // 4. SCROLL-DRIVEN DEFORMATIONS
    
    // Circle Wrap (Stage 8) - Wrap the Z axis around the camera
    if (uCircleWrap > 0.0) {
      float radius = 13.0 + dragonPos.x; // Outer radius offset by body thickness
      float circumference = 2.0 * 3.14159265 * radius;
      // Map Z from 0-32 to angle from 0 to 2PI
      float theta = (dragonPos.z / 32.0) * 2.0 * 3.14159265 * uCircleWrap;
      
      vec3 wrappedPos = vec3(
        radius * cos(theta - 3.14159265 / 2.0),
        dragonPos.y,
        radius * sin(theta - 3.14159265 / 2.0)
      );
      
      dragonPos = mix(dragonPos, wrappedPos, uCircleWrap);
    }

    // Ascension (Stage 9) - Wrap into vertical spiral vortex rising
    if (uAscension > 0.0) {
      // 2.5 full rotations
      float helixTheta = (dragonPos.z / 32.0) * 5.0 * 3.14159265 + uTime * 0.4;
      // Radius tapers as we go up, creating a vortex
      float helixRadius = (6.5 * (1.0 - (dragonPos.z / 32.0) * 0.5)) + dragonPos.x * 0.6;
      
      vec3 ascensionPos = vec3(
        helixRadius * cos(helixTheta),
        (dragonPos.z - 16.0) * 1.3 + dragonPos.y, // Stretching upwards
        helixRadius * sin(helixTheta)
      );
      
      dragonPos = mix(dragonPos, ascensionPos, uAscension);
    }

    // Scale the dragon down slightly (by 15%) as requested
    vec3 finalDragonPos = dragonPos * 0.85;

    // 5. INTERPOLATE BETWEEN SCATTERED, DRAGON, AND LOGO
    // Morph Scattered -> Dragon
    vec3 currentPos = mix(scatteredPos, finalDragonPos, uTransition);
    
    // Morph Dragon -> Logo
    currentPos = mix(currentPos, aLogoPosition, uLogoTransition);

    // 6. EXPLOSION / DISPERSAL EFFECTS (Stage 10/12)
    if (uDispersal > 0.0) {
      // Explode radially from current position center
      vec3 explodeDir = normalize(currentPos + vec3(0.001));
      float force = uDispersal * (12.0 + 38.0 * aRandom.x);
      
      // Add curl noise to create turbulent smoke trail
      vec3 noiseOffset = curlNoise(currentPos * 0.08 + uTime * 0.25) * uDispersal * 18.0;
      currentPos += (explodeDir * force) + noiseOffset;
    }

    // 7. LIVING COSMIC NOISE (Swirling stardust inside shape)
    // Noise is always active to make particles feel alive, but scaled down during logo/scattered states
    float shapeNoiseScale = 0.06;
    float shapeNoiseAmt = 0.28 * aExtra.x * (1.0 - uLogoTransition * 0.8) * uTransition;
    vec3 shapeNoise = curlNoise(currentPos * shapeNoiseScale + vec3(0.0, 0.0, uTime * 0.15)) * shapeNoiseAmt;
    currentPos += shapeNoise;

    // Camera perspective projection
    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 8. ADAPTIVE PARTICLE SIZE CALCULATION
    // Scale particle size based on type, distance from camera, resolution, and pixel ratio
    float typeSizeMultiplier = 1.0;
    if (vType == 6.0) typeSizeMultiplier = 2.5; // Eyes are larger/brighter
    if (vType == 3.0) typeSizeMultiplier = 0.7; // Whiskers are finer lines
    if (vType == 2.0) typeSizeMultiplier = 1.2; // Horns are chunkier

    float distFactor = -mvPosition.z;
    gl_PointSize = (uPointSize * aRandom.y * typeSizeMultiplier * uPixelRatio * 300.0) / distFactor;
    
    // Limit point sizes to prevent massive overlaps near screen
    gl_PointSize = clamp(gl_PointSize, 1.0, 48.0);

    // Pass depth for distance fading in fragment shader
    vRelativeDepth = distFactor;
  }
`;

export const particleFragmentShader = `
  uniform float uTime;
  uniform float uTransition;
  uniform float uLogoTransition;
  varying vec3 vColor;
  varying float vType;
  varying float vEnergy;
  varying float vGlow;
  varying float vRelativeDepth;

  void main() {
    // Make particles circular and soft
    vec2 temp = gl_PointCoord - vec2(0.5);
    float dist = length(temp);
    
    // Discard outer bounds of point sprite
    if (dist > 0.5) {
      discard;
    }

    // Soft radial gradient fade (volumetric stardust feel)
    float alpha = smoothstep(0.5, 0.0, dist);
    
    // Central core intensity (hot center)
    float core = pow(alpha, 3.5);
    
    // Additive blending glow calculations
    float finalAlpha = (alpha * 0.65 + core * 0.35) * vGlow;

    // Star Flickering calculation
    // Speed varies based on particle index/phase
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + mod(vGlow * 100.0, 5.0)) + vGlow * 6.28);
    
    // Color glow adjustments
    vec3 finalColor = vColor * flicker;
    
    // Specialized coloring and glow for eyes (Type 6)
    if (vType == 6.0) {
      finalColor = vec3(0.7, 1.0, 1.0) * 1.5 * flicker; // Reduced eye white brightness
      finalAlpha *= 1.2;
    }
    
    // Whiskers and horns glow adjustments
    if (vType == 3.0 || vType == 2.0) {
      finalColor *= 1.1; // Softer highlights
    }

    // Boost colors during morph convergence (bright flash of energy)
    float morphFlash = sin(uTransition * 3.14159) * 0.15 + sin(uLogoTransition * 3.14159) * 0.2;
    finalColor += vec3(morphFlash * 0.3, morphFlash * 0.45, morphFlash * 0.55);

    // Depth-based atmospheric fading (simulates deep space cosmic fog)
    float fogDensity = 0.0035;
    float fog = exp(-vRelativeDepth * fogDensity);
    finalAlpha *= clamp(fog, 0.05, 1.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;
