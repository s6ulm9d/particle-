// Highly Detailed Volumetric Structured Procedural Dragon Particle Generator for Algoryx

export interface CosmicParticlesData {
  positions: Float32Array;
  targetPositions: Float32Array;
  logoPositions: Float32Array;
  colors: Float32Array;
  randoms: Float32Array;
  velocities: Float32Array;
  extras: Float32Array;
}

// Helper to generate a random point in a sphere
function randomInSphere(radius: number) {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random()) * radius;
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  };
}

// Helper to sample a point along a line segment
function sampleLine(p1: [number, number, number], p2: [number, number, number], noise: number = 0.02) {
  const t = Math.random();
  return {
    x: p1[0] + (p2[0] - p1[0]) * t + (Math.random() - 0.5) * noise,
    y: p1[1] + (p2[1] - p1[1]) * t + (Math.random() - 0.5) * noise,
    z: p1[2] + (p2[2] - p1[2]) * t + (Math.random() - 0.5) * noise,
    progress: t
  };
}

// Logo letter path definitions
const letterOffsets = [-12, -8, -4, 0, 4, 8, 12];
const letterKeys = ['A', 'L', 'G', 'O', 'R', 'Y', 'X'];

type Point2D = { x: number; y: number };
type LineSegment = { p1: Point2D; p2: Point2D; type: 'line' };
type ArcSegment = { center: Point2D; radius: number; startAngle: number; endAngle: number; type: 'arc' };
type LetterSegment = LineSegment | ArcSegment;

const letters: { [key: string]: LetterSegment[] } = {
  A: [
    { p1: { x: -1, y: -2 }, p2: { x: 0, y: 2 }, type: 'line' },
    { p1: { x: 0, y: 2 }, p2: { x: 1, y: -2 }, type: 'line' },
    { p1: { x: -0.5, y: 0 }, p2: { x: 0.5, y: 0 }, type: 'line' },
  ],
  L: [
    { p1: { x: -1, y: 2 }, p2: { x: -1, y: -2 }, type: 'line' },
    { p1: { x: -1, y: -2 }, p2: { x: 1, y: -2 }, type: 'line' },
  ],
  G: [
    { center: { x: 0, y: 0 }, radius: 2.0, startAngle: 0.2 * Math.PI, endAngle: 1.8 * Math.PI, type: 'arc' },
    { p1: { x: 0, y: 0 }, p2: { x: 1.5, y: 0 }, type: 'line' },
    { p1: { x: 1.5, y: 0 }, p2: { x: 1.5, y: -1.2 }, type: 'line' },
  ],
  O: [
    { center: { x: 0, y: 0 }, radius: 2.0, startAngle: 0, endAngle: 2 * Math.PI, type: 'arc' },
  ],
  R: [
    { p1: { x: -1, y: -2 }, p2: { x: -1, y: 2 }, type: 'line' },
    { center: { x: -1, y: 1 }, radius: 1.0, startAngle: -Math.PI / 2, endAngle: Math.PI / 2, type: 'arc' },
    { p1: { x: -1, y: 0 }, p2: { x: 1.2, y: -2 }, type: 'line' },
  ],
  Y: [
    { p1: { x: -1.2, y: 2 }, p2: { x: 0, y: 0 }, type: 'line' },
    { p1: { x: 1.2, y: 2 }, p2: { x: 0, y: 0 }, type: 'line' },
    { p1: { x: 0, y: 0 }, p2: { x: 0, y: -2 }, type: 'line' },
  ],
  X: [
    { p1: { x: -1.2, y: 2 }, p2: { x: 1.2, y: -2 }, type: 'line' },
    { p1: { x: -1.2, y: -2 }, p2: { x: 1.2, y: 2 }, type: 'line' },
  ],
};

function sampleLetter(letterChar: string, cx: number): Point2D {
  const segments = letters[letterChar];
  if (!segments || segments.length === 0) return { x: cx, y: 0 };
  const segment = segments[Math.floor(Math.random() * segments.length)];
  if (segment.type === 'line') {
    const t = Math.random();
    return {
      x: cx + segment.p1.x + (segment.p2.x - segment.p1.x) * t,
      y: segment.p1.y + (segment.p2.y - segment.p1.y) * t,
    };
  } else {
    const theta = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
    return {
      x: cx + segment.center.x + Math.cos(theta) * segment.radius,
      y: segment.center.y + Math.sin(theta) * segment.radius,
    };
  }
}

// 3D Serpentine spine coiling path coordinates
const bodyLength = 32.0;

export const getSpinePoint = (t: number) => {
  const pz = t * bodyLength;
  // Serpentine S-curves
  const px = Math.sin(t * Math.PI * 2.2) * 3.5 * (1.0 - t * 0.4);
  const py = Math.cos(t * Math.PI * 1.5) * 4.5 - t * 3.0;
  return { x: px, y: py, z: pz };
};

// Computes local coordinate frame along the spine (Frenet-Serret frame)
export const getSpineFrame = (t: number) => {
  const spine = getSpinePoint(t);
  const dt = 0.001;
  const p1 = getSpinePoint(Math.max(0, t - dt));
  const p2 = getSpinePoint(Math.min(1, t + dt));
  
  const tx = p2.x - p1.x;
  const ty = p2.y - p1.y;
  const tz = p2.z - p1.z;
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1.0;
  const tangent = { x: tx / len, y: ty / len, z: tz / len };

  // Set default up vector
  let upX = 0.0, upY = 1.0, upZ = 0.0;
  // If tangent points nearly along Y, use X as up vector to avoid singularity
  const dot = tangent.x * upX + tangent.y * upY + tangent.z * upZ;
  if (Math.abs(dot) > 0.95) {
    upX = 1.0; upY = 0.0; upZ = 0.0;
  }

  // normal = tangent x up
  const nx = tangent.y * upZ - tangent.z * upY;
  const ny = tangent.z * upX - tangent.x * upZ;
  const nz = tangent.x * upY - tangent.y * upX;
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
  const normal = { x: nx / nLen, y: ny / nLen, z: nz / nLen };

  // binormal = tangent x normal
  const bx = tangent.y * normal.z - tangent.z * normal.y;
  const by = tangent.z * normal.x - tangent.x * normal.z;
  const bz = tangent.x * normal.y - tangent.y * normal.x;
  const binormal = { x: bx, y: by, z: bz };

  return { origin: spine, tangent, normal, binormal };
};

export function generateCosmicDragonParticles(count: number): CosmicParticlesData {
  const positions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const logoPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count * 4); // x: speed, y: size, z: progress, w: type
  const velocities = new Float32Array(count * 3);
  const extras = new Float32Array(count * 3); // x: energyLevel, y: noiseSeed, z: glowStrength

  // Color Palettes (Soften starlight white slightly)
  const colorsList = {
    deepIndigo: [0.03, 0.01, 0.32],
    nebulaPurple: [0.35, 0.05, 0.5],
    plasmaMagenta: [0.95, 0.02, 0.45],
    electricBlue: [0.0, 0.72, 1.0],
    galaxyCyan: [0.0, 0.98, 0.92],
    starlightWhite: [0.88, 0.88, 0.93], // Softer cool white
    supernovaPink: [1.0, 0.1, 0.6],
  };

  // Anatomy particle ratios:
  const ratioEyes = 0.012;
  const ratioHorns = 0.065;
  const ratioWhiskers = 0.045;
  const ratioBackScales = 0.13; // Triangular fin ridges
  const ratioLegs = 0.16;       // 4 thick limbs & fangs
  const ratioWings = 0.19;      // Volumetric bat-like cosmic wings
  const ratioTail = 0.11;       // Detailed tail plume ribbons
  const ratioHead = 0.14;       // Highly detailed skull, jaws, snout, beard
  // Body takes remaining (~14.8%)

  const countEyes = Math.floor(count * ratioEyes);
  const countHead = Math.floor(count * ratioHead);
  const countHorns = Math.floor(count * ratioHorns);
  const countWhiskers = Math.floor(count * ratioWhiskers);
  const countBackScales = Math.floor(count * ratioBackScales);
  const countLegs = Math.floor(count * ratioLegs);
  const countWings = Math.floor(count * ratioWings);
  const countTail = Math.floor(count * ratioTail);

  for (let i = 0; i < count; i++) {
    let type = 0;
    let rX = 0, rY = 0, rZ = 0;
    let col = [1.0, 1.0, 1.0];
    let energy = 0.5;
    let glow = 0.5;
    let progress = Math.random();

    // Assign categories
    if (i < countEyes) {
      type = 6;
    } else if (i < countEyes + countHead) {
      type = 1;
    } else if (i < countEyes + countHead + countHorns) {
      type = 2;
    } else if (i < countEyes + countHead + countHorns + countWhiskers) {
      type = 3;
    } else if (i < countEyes + countHead + countHorns + countWhiskers + countBackScales) {
      type = 4;
    } else if (i < countEyes + countHead + countHorns + countWhiskers + countBackScales + countLegs) {
      type = 7;
    } else if (i < countEyes + countHead + countHorns + countWhiskers + countBackScales + countLegs + countWings) {
      type = 8;
    } else if (i < countEyes + countHead + countHorns + countWhiskers + countBackScales + countLegs + countWings + countTail) {
      type = 5;
    } else {
      type = 0;
    }

    // 1. GALAXY INITIAL STATE
    const galRadius = 14.0 + Math.random() * 36.0;
    const numArms = 3;
    const armAngle = (Math.floor(Math.random() * numArms) * (2 * Math.PI)) / numArms;
    const spiralStrength = 0.28;
    const galTheta = galRadius * spiralStrength + armAngle + (Math.random() - 0.5) * 0.35;
    const px = Math.cos(galTheta) * galRadius + (Math.random() - 0.5) * 1.5;
    const pz = Math.sin(galTheta) * galRadius + (Math.random() - 0.5) * 1.5;
    const py = (Math.random() - 0.5) * 5.0 * (1.0 - galRadius / 50.0);

    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    const orbSpeed = 1.8 / (galRadius + 1.0);
    velocities[i * 3] = -pz * orbSpeed;
    velocities[i * 3 + 1] = 0.0;
    velocities[i * 3 + 2] = px * orbSpeed;

    // 2. CELESTIAL DRAGON TARGET GEOMETRY
    if (type === 0) {
      // --- BODY (Volumetric Serpentine Muscle Tube) ---
      const t = Math.random();
      progress = t;
      
      const frame = getSpineFrame(t);
      const baseRadius = 1.62 * (1.0 - t * 0.82); // Tapering down towards the tail
      // Create scales ridges texture
      const scaleRipple = 1.0 + 0.08 * Math.cos(t * 110.0);
      const radius = baseRadius * scaleRipple;
      
      const isCore = Math.random() < 0.26;
      if (isCore) {
        // Core plasma strand
        const theta = Math.random() * 2 * Math.PI;
        const rad = Math.sqrt(Math.random()) * radius * 0.22;
        rX = frame.origin.x + (frame.normal.x * Math.cos(theta) + frame.binormal.x * Math.sin(theta)) * rad;
        rY = frame.origin.y + (frame.normal.y * Math.cos(theta) + frame.binormal.y * Math.sin(theta)) * rad;
        rZ = frame.origin.z + (frame.normal.z * Math.cos(theta) + frame.binormal.z * Math.sin(theta)) * rad;
        col = colorsList.galaxyCyan.map((c, idx) => c * 0.4 + colorsList.starlightWhite[idx] * 0.6);
        energy = 1.0;
        glow = 0.95;
      } else {
        // Volumetric body muscle shell
        const theta = Math.random() * 2 * Math.PI;
        // Concentrate on surface for volumetric shell look
        const rad = (Math.random() < 0.68 ? (0.86 + Math.random() * 0.14) : Math.sqrt(Math.random())) * radius;
        
        rX = frame.origin.x + (frame.normal.x * Math.cos(theta) + frame.binormal.x * Math.sin(theta)) * rad;
        rY = frame.origin.y + (frame.normal.y * Math.cos(theta) + frame.binormal.y * Math.sin(theta)) * rad;
        rZ = frame.origin.z + (frame.normal.z * Math.cos(theta) + frame.binormal.z * Math.sin(theta)) * rad;

        if (t < 0.2) {
          const f = t / 0.2;
          col = colorsList.deepIndigo.map((c, idx) => c * (1 - f) + colorsList.nebulaPurple[idx] * f);
        } else if (t < 0.6) {
          const f = (t - 0.2) / 0.4;
          col = colorsList.nebulaPurple.map((c, idx) => c * (1 - f) + colorsList.plasmaMagenta[idx] * f);
        } else {
          const f = (t - 0.6) / 0.4;
          col = colorsList.plasmaMagenta.map((c, idx) => c * (1 - f) + colorsList.supernovaPink[idx] * f);
        }
        energy = 0.5;
        glow = 0.6;
      }

    } else if (type === 1) {
      // --- CINEMATIC HEAD & FACE ---
      // Extracted from countHead. Break down into detailed volumetric components
      const spine = getSpinePoint(0.0);
      const headComponent = Math.random();

      if (headComponent < 0.35) {
        // 1. Skull / Braincase (Volumetric Ellipsoid centered at upper back head)
        const theta = Math.random() * 2.0 * Math.PI;
        const phi = Math.acos(Math.random() * 2.0 - 1.0);
        const r = Math.cbrt(Math.random());
        rX = spine.x + r * Math.sin(phi) * Math.cos(theta) * 0.72;
        rY = spine.y + 0.32 + r * Math.sin(phi) * Math.sin(theta) * 0.66;
        rZ = spine.z - 0.38 + r * Math.cos(phi) * 0.85;
        col = colorsList.electricBlue.map((c, idx) => c * 0.72 + colorsList.nebulaPurple[idx] * 0.28);
        progress = 0.0;
        energy = 0.7;
        glow = 0.6;
      } else if (headComponent < 0.60) {
        // 2. Muzzle / Snout (Upper Jaw - tapering box extending forward)
        const hz = -0.75 - Math.random() * 2.45; // Z in [-3.2, -0.75]
        const t = (hz - (-0.75)) / -2.45;
        const w = 0.52 * (1.0 - t * 0.3); // half width
        const h = 0.36 * (1.0 - t * 0.35); // half height
        const theta = Math.random() * 2.0 * Math.PI;
        const r = Math.sqrt(Math.random());
        rX = spine.x + Math.cos(theta) * w * r;
        rY = spine.y + 0.16 + Math.sin(theta) * h * r;
        rZ = spine.z + hz;
        col = colorsList.electricBlue;
        progress = Math.abs(hz) / 3.2;
        energy = 0.8;
        glow = 0.7;
      } else if (headComponent < 0.75) {
        // 3. Lower Jaw (Tapering box angled slightly downward for open mouth posture)
        const hz = -0.75 - Math.random() * 2.05; // Z in [-2.8, -0.75]
        const t = (hz - (-0.75)) / -2.05;
        const w = 0.44 * (1.0 - t * 0.3);
        const h = 0.22 * (1.0 - t * 0.35);
        const theta = Math.random() * 2.0 * Math.PI;
        const r = Math.sqrt(Math.random());
        rX = spine.x + Math.cos(theta) * w * r;
        rY = spine.y - 0.24 - 0.35 * t + Math.sin(theta) * h * r; // tilts downward
        rZ = spine.z + hz;
        col = colorsList.electricBlue.map((c, idx) => c * 0.8 + colorsList.deepIndigo[idx] * 0.2);
        progress = Math.abs(hz) / 3.2;
        energy = 0.75;
        glow = 0.65;
      } else if (headComponent < 0.81) {
        // 4. Sharp Teeth & Fangs (Starlight White)
        const toothId = Math.random();
        col = colorsList.starlightWhite;
        energy = 1.0;
        glow = 1.0;
        progress = 0.02;

        if (toothId < 0.32) {
          // Large main fangs (2 upper pointing down, 2 lower pointing up)
          const side = Math.random() > 0.5 ? 1 : -1;
          const isUpper = Math.random() > 0.5;
          const fangBase: [number, number, number] = [
            spine.x + side * 0.42,
            spine.y + (isUpper ? 0.18 : -0.45),
            spine.z - (isUpper ? 2.5 : 2.2)
          ];
          const fangTip: [number, number, number] = [
            spine.x + side * 0.42,
            spine.y + (isUpper ? -0.36 : 0.05),
            spine.z - (isUpper ? 2.5 : 2.2)
          ];
          const pt = sampleLine(fangBase, fangTip, 0.008);
          rX = pt.x; rY = pt.y; rZ = pt.z;
        } else {
          // Small teeth row along jaws
          const side = Math.random() > 0.5 ? 1 : -1;
          const isUpper = Math.random() > 0.5;
          const zPos = -0.9 - Math.random() * 1.4; // along jaw
          const tVal = (zPos - (-0.9)) / -1.4;
          
          let ty = spine.y;
          let tx = spine.x + side * 0.48 * (1.0 - tVal * 0.3);
          
          if (isUpper) {
            ty += 0.06;
          } else {
            ty += -0.25 - 0.32 * tVal;
          }
          
          const toothBase: [number, number, number] = [tx, ty, spine.z + zPos];
          const toothTip: [number, number, number] = [tx, ty + (isUpper ? -0.15 : 0.15), spine.z + zPos];
          const pt = sampleLine(toothBase, toothTip, 0.005);
          rX = pt.x; rY = pt.y; rZ = pt.z;
        }
      } else if (headComponent < 0.91) {
        // 5. Chin Beard (Flowing filaments from bottom of lower jaw going backward)
        const bProg = Math.random();
        progress = bProg;
        const bxBase = spine.x + (Math.random() - 0.5) * 0.42;
        const byBase = spine.y - 0.45;
        const bzBase = spine.z - 1.2 - Math.random() * 1.5;
        
        rX = bxBase + (Math.random() - 0.5) * 0.25 * bProg;
        rY = byBase - 1.7 * bProg + Math.sin(bProg * 3.0) * 0.18;
        rZ = bzBase + 2.4 * bProg; // trails backward
        col = colorsList.galaxyCyan;
        energy = 0.95;
        glow = 0.85;
      } else {
        // 6. Side Mane & Eyebrows (Fiery highlights around skull cheeks & brows)
        const side = Math.random() > 0.5 ? 1 : -1;
        const isBrow = Math.random() > 0.5;
        const fProg = Math.random();
        progress = fProg;

        if (isBrow) {
          // Fiery eyebrows arches above eyes
          const bAngle = 0.2 + fProg * 1.1; // arc
          rX = spine.x + side * (0.32 + Math.sin(bAngle) * 0.35);
          rY = spine.y + 0.55 + Math.cos(bAngle) * 0.35;
          rZ = spine.z - 1.5 - fProg * 0.6;
          col = colorsList.supernovaPink;
        } else {
          // Cheek side mane flowing back
          rX = spine.x + side * (0.64 + 0.9 * fProg * fProg) + (Math.random() - 0.5) * 0.12;
          rY = spine.y + 0.18 - 0.55 * fProg + (Math.random() - 0.5) * 0.12;
          rZ = spine.z - 0.5 + 3.2 * fProg;
          col = colorsList.plasmaMagenta.map((c, idx) => c * 0.5 + colorsList.supernovaPink[idx] * 0.5);
        }
        energy = 0.9;
        glow = 0.8;
      }

    } else if (type === 6) {
      // --- EYES (Glowing blue/white spheres) ---
      const spine = getSpinePoint(0.0);
      const side = Math.random() > 0.5 ? 1 : -1;
      const eyePos = { x: spine.x + side * 0.48, y: spine.y + 0.55, z: spine.z - 1.7 };
      const pt = randomInSphere(0.12);
      
      rX = eyePos.x + pt.x;
      rY = eyePos.y + pt.y;
      rZ = eyePos.z + pt.z;
      progress = 0.0;
      col = [0.8, 0.98, 1.0]; // Bright white-blue starlight core
      energy = 1.0;
      glow = 1.0;

    } else if (type === 2) {
      // --- ANTLER HORNS (Branching structures with volume) ---
      const side = Math.random() > 0.5 ? 1 : -1;
      const hProg = Math.random(); // antler strand progress
      progress = hProg;

      const spine = getSpinePoint(0.0);
      const base: [number, number, number] = [spine.x + side * 0.44, spine.y + 0.72, spine.z - 0.5];
      
      // Determine if particle is on main stem or branching tines
      const branchPart = Math.random();
      let thickness = 0.18;

      if (branchPart < 0.55) {
        // A. Main stem (thick Bezier curves going upward/backward)
        const p0 = base;
        const p1: [number, number, number] = [spine.x + side * 1.2, spine.y + 2.0, spine.z + 0.8];
        const p2: [number, number, number] = [spine.x + side * 2.2, spine.y + 3.4, spine.z + 2.2];
        
        const mt = hProg;
        rX = (1 - mt) * (1 - mt) * p0[0] + 2 * (1 - mt) * mt * p1[0] + mt * mt * p2[0];
        rY = (1 - mt) * (1 - mt) * p0[1] + 2 * (1 - mt) * mt * p1[1] + mt * mt * p2[1];
        rZ = (1 - mt) * (1 - mt) * p0[2] + 2 * (1 - mt) * mt * p1[2] + mt * mt * p2[2];
        
        thickness = 0.22 * (1.0 - mt * 0.85);
      } else if (branchPart < 0.80) {
        // B. Tine 1 (lower antler fork splitting at t = 0.4, pointing forward)
        const mt = 0.4;
        const p0: [number, number, number] = [
          (1-mt)*(1-mt)*base[0] + 2*(1-mt)*mt*(spine.x + side * 1.2) + mt*mt*(spine.x + side * 2.2),
          (1-mt)*(1-mt)*base[1] + 2*(1-mt)*mt*(spine.y + 2.0) + mt*mt*(spine.y + 3.4),
          (1-mt)*(1-mt)*base[2] + 2*(1-mt)*mt*(spine.z + 0.8) + mt*mt*(spine.z + 2.2)
        ];
        const p2: [number, number, number] = [spine.x + side * 1.72, spine.y + 2.62, spine.z + 0.38];
        
        const pt = sampleLine(p0, p2);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        thickness = 0.12 * (1.0 - pt.progress * 0.8);
      } else {
        // C. Tine 2 (upper antler fork splitting at t = 0.7, pointing outward)
        const mt = 0.7;
        const p0: [number, number, number] = [
          (1-mt)*(1-mt)*base[0] + 2*(1-mt)*mt*(spine.x + side * 1.2) + mt*mt*(spine.x + side * 2.2),
          (1-mt)*(1-mt)*base[1] + 2*(1-mt)*mt*(spine.y + 2.0) + mt*mt*(spine.y + 3.4),
          (1-mt)*(1-mt)*base[2] + 2*(1-mt)*mt*(spine.z + 0.8) + mt*mt*(spine.z + 2.2)
        ];
        const p2: [number, number, number] = [spine.x + side * 2.65, spine.y + 3.02, spine.z + 1.45];
        
        const pt = sampleLine(p0, p2);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        thickness = 0.10 * (1.0 - pt.progress * 0.8);
      }
      
      // Distribute volumetrically around the antler lines
      const theta = Math.random() * 2.0 * Math.PI;
      const rad = Math.sqrt(Math.random()) * thickness;
      rX += Math.cos(theta) * rad;
      rY += Math.sin(theta) * rad;
      rZ += (Math.random() - 0.5) * thickness * 0.3;
      
      col = colorsList.electricBlue.map((c, idx) => c * (1 - hProg) + colorsList.starlightWhite[idx] * hProg);
      energy = 0.85;
      glow = 0.7;

    } else if (type === 3) {
      // --- WHISKERS (Volumetric flowing tentacles) ---
      const whiskerSide = Math.random() > 0.5 ? 1 : -1;
      const whiskerPair = Math.random() > 0.5 ? 0 : 1;
      const wProgress = Math.random();
      progress = wProgress;
      
      const spine = getSpinePoint(0.0);
      const startX = spine.x + whiskerSide * 0.32;
      const startY = spine.y - 0.08 + (whiskerPair === 0 ? 0.08 : -0.16);
      const startZ = spine.z - 2.58;
      
      const spread = whiskerPair === 0 ? 3.82 : 2.58;
      const drop = whiskerPair === 0 ? -1.65 : -2.45;
      
      // Coherent flow path
      rX = startX + whiskerSide * (spread * wProgress * wProgress + Math.sin(wProgress * 4.0) * 0.28);
      rY = startY + drop * wProgress + Math.cos(wProgress * 3.0) * 0.18;
      rZ = startZ + 7.6 * wProgress;
      
      // Add fine volume tapering
      const thickness = 0.08 * (1.0 - wProgress * 0.82);
      const theta = Math.random() * 2.0 * Math.PI;
      const rad = Math.sqrt(Math.random()) * thickness;
      rX += Math.cos(theta) * rad;
      rY += Math.sin(theta) * rad;
      
      col = colorsList.galaxyCyan;
      energy = 0.95;
      glow = 0.8;

    } else if (type === 4) {
      // --- DORSAL COMB / BACK SCALES (Continuous webbed ridge along spine) ---
      // Sample continuously along the back
      const t = 0.05 + Math.random() * 0.87;
      progress = t;
      
      const frame = getSpineFrame(t);
      const bodyRadius = 1.62 * (1.0 - t * 0.82);
      
      // Spike comb height - modulated by high-frequency absolute sine wave
      const numSpikes = 70;
      const spikeFactor = Math.abs(Math.sin(t * Math.PI * numSpikes));
      const sHeight = (1.45 * (1.0 - t * 0.65)) * spikeFactor;
      
      // Sample volumetric point inside the triangular spike
      const hProg = Math.random(); // height progress
      const spikeW = 0.18 * (1.0 - t * 0.5) * (1.0 - hProg); // width decreases to tip
      
      // Center coordinates along spike height
      const ptX = frame.origin.x + frame.normal.x * (bodyRadius + sHeight * hProg);
      const ptY = frame.origin.y + frame.normal.y * (bodyRadius + sHeight * hProg);
      const ptZ = frame.origin.z + frame.normal.z * (bodyRadius + sHeight * hProg);
      
      // Displace along spine binormal for spike width
      const sideDisp = (Math.random() - 0.5) * 2.0 * spikeW;
      rX = ptX + frame.binormal.x * sideDisp;
      rY = ptY + frame.binormal.y * sideDisp;
      rZ = ptZ + frame.binormal.z * sideDisp;
      
      rX += (Math.random() - 0.5) * 0.02;
      rY += (Math.random() - 0.5) * 0.02;
      rZ += (Math.random() - 0.5) * 0.02;
      
      col = colorsList.plasmaMagenta.map((c, idx) => c * (1 - t) + colorsList.supernovaPink[idx] * t);
      energy = 0.85;
      glow = 0.75;

    } else if (type === 7) {
      // --- LIMBS: LEGS & CLAWS (4 volumetric limbs with sharp grasp talons) ---
      const side = Math.random() > 0.5 ? 1 : -1;
      const isFront = Math.random() < 0.5;
      const tAnchor = isFront ? 0.20 : 0.72; // Shoulder vs Hip anchor progress
      progress = tAnchor;
      
      const frame = getSpineFrame(tAnchor);
      const bodyRadius = 1.62 * (1.0 - tAnchor * 0.82);
      
      // 1. Joint Coordinate calculation
      const pShoulder: [number, number, number] = [
        frame.origin.x + frame.binormal.x * side * bodyRadius,
        frame.origin.y - 0.28,
        frame.origin.z
      ];
      
      const pKnee: [number, number, number] = [
        pShoulder[0] + side * 1.65,
        pShoulder[1] - 1.45,
        pShoulder[2] - 0.32
      ];
      
      const pAnkle: [number, number, number] = [
        pKnee[0] - side * 0.32,
        pKnee[1] - 1.35,
        pKnee[2] - 0.48
      ];
      
      const legPart = Math.random(); // Distribute particles inside leg segments

      if (legPart < 0.30) {
        // A. Upper limb tube (Shoulder/Thigh)
        const pt = sampleLine(pShoulder, pKnee, 0.02);
        const thickness = 0.44 * (1.0 - pt.progress * 0.3); // Tapering
        const theta = Math.random() * 2.0 * Math.PI;
        const rad = Math.sqrt(Math.random()) * thickness;
        rX = pt.x + Math.cos(theta) * rad;
        rY = pt.y + Math.sin(theta) * rad;
        rZ = pt.z + (Math.random() - 0.5) * thickness * 0.25;
        col = colorsList.nebulaPurple;
        energy = 0.6;
        glow = 0.5;
      } else if (legPart < 0.60) {
        // B. Lower limb tube (Shin/Forearm)
        const pt = sampleLine(pKnee, pAnkle, 0.02);
        const thickness = 0.32 * (1.0 - pt.progress * 0.3);
        const theta = Math.random() * 2.0 * Math.PI;
        const rad = Math.sqrt(Math.random()) * thickness;
        rX = pt.x + Math.cos(theta) * rad;
        rY = pt.y + Math.sin(theta) * rad;
        rZ = pt.z + (Math.random() - 0.5) * thickness * 0.25;
        col = colorsList.electricBlue;
        energy = 0.7;
        glow = 0.6;
      } else {
        // C. Sharp Claws/Talons (4 detailed curved cones)
        const clawId = Math.floor(Math.random() * 4);
        let clawOffset = [0, 0, 0];
        if (clawId === 0) clawOffset = [side * 0.68, -0.58, -0.78];      // Front-outer toe
        else if (clawId === 1) clawOffset = [side * 0.12, -0.78, -1.02];  // Front-center toe
        else if (clawId === 2) clawOffset = [side * -0.48, -0.58, -0.78]; // Front-inner toe
        else clawOffset = [side * 0.12, -0.22, 0.58];                    // Back spur toe
        
        const pClawTip: [number, number, number] = [
          pAnkle[0] + clawOffset[0],
          pAnkle[1] + clawOffset[1],
          pAnkle[2] + clawOffset[2]
        ];
        
        const pt = sampleLine(pAnkle, pClawTip, 0.008);
        const thickness = 0.14 * (1.0 - pt.progress); // Sharp tip taper
        const theta = Math.random() * 2.0 * Math.PI;
        const rad = Math.sqrt(Math.random()) * thickness;
        rX = pt.x + Math.cos(theta) * rad;
        rY = pt.y + Math.sin(theta) * rad;
        rZ = pt.z;
        
        col = colorsList.electricBlue.map((c, idx) => c * (1.0 - pt.progress) + colorsList.starlightWhite[idx] * pt.progress);
        glow = 0.95;
        energy = 0.95;
      }

    } else if (type === 8) {
      // --- COSMIC WINGS (Flying pose stardust wings with thickness) ---
      const wingSide = Math.random() > 0.5 ? 1 : -1;
      const wProgress = Math.random();
      progress = wProgress;
      
      const zAnchor = 6.4; // shoulder attachment Z
      const frame = getSpineFrame(zAnchor / bodyLength);
      const bodyRadius = 1.62 * (1.0 - (zAnchor / bodyLength) * 0.82);
      
      const pShoulder: [number, number, number] = [
        frame.origin.x + frame.binormal.x * wingSide * bodyRadius,
        frame.origin.y + 0.32,
        frame.origin.z
      ];
      
      // Wing bone tips (matching bat-like wing structures)
      const pTip1: [number, number, number] = [frame.origin.x + wingSide * 9.5, frame.origin.y + 5.2, zAnchor - 1.2]; // Top spar tip
      const pTip2: [number, number, number] = [frame.origin.x + wingSide * 11.5, frame.origin.y + 2.0, zAnchor + 1.8]; // Mid spar tip
      const pTip3: [number, number, number] = [frame.origin.x + wingSide * 8.5, frame.origin.y - 1.2, zAnchor + 4.2]; // Bottom spar tip
      
      const isBone = Math.random() < 0.24;
      
      if (isBone) {
        // Volumetric bone spars (starlight white/electric blue)
        const sparId = Math.floor(Math.random() * 3);
        const tip = sparId === 0 ? pTip1 : sparId === 1 ? pTip2 : pTip3;
        const pt = sampleLine(pShoulder, tip, 0.02);
        
        const thickness = 0.28 * (1.0 - pt.progress * 0.72);
        const theta = Math.random() * 2.0 * Math.PI;
        const rad = Math.sqrt(Math.random()) * thickness;
        
        rX = pt.x + Math.cos(theta) * rad;
        rY = pt.y + Math.sin(theta) * rad;
        rZ = pt.z + (Math.random() - 0.5) * thickness * 0.28;
        
        col = colorsList.electricBlue.map((c, idx) => c * (1 - wProgress) + colorsList.starlightWhite[idx] * wProgress);
        energy = 0.9;
        glow = 0.8;
      } else {
        // Volumetric membrane stardust web
        const webId = Math.floor(Math.random() * 2);
        const t1 = Math.random();
        const t2 = Math.random();
        
        const sparA = webId === 0 ? pTip1 : pTip2;
        const sparB = webId === 0 ? pTip2 : pTip3;
        
        const pA = [
          pShoulder[0] + (sparA[0] - pShoulder[0]) * t1,
          pShoulder[1] + (sparA[1] - pShoulder[1]) * t1,
          pShoulder[2] + (sparA[2] - pShoulder[2]) * t1
        ];
        const pB = [
          pShoulder[0] + (sparB[0] - pShoulder[0]) * t2,
          pShoulder[1] + (sparB[1] - pShoulder[1]) * t2,
          pShoulder[2] + (sparB[2] - pShoulder[2]) * t2
        ];
        
        const weight = Math.random();
        const pt = sampleLine(pA as [number, number, number], pB as [number, number, number], 0.045);
        
        rX = pt.x;
        rY = pt.y;
        rZ = pt.z + (Math.random() - 0.5) * 0.12; // Web thickness
        
        col = colorsList.nebulaPurple.map((c, idx) => c * (1 - weight) + colorsList.plasmaMagenta[idx] * weight);
        energy = 0.5;
        glow = 0.45;
      }

    } else if (type === 5) {
      // --- TAIL PLUME (Flowing flame-like ribbons) ---
      const tz = 32.0 + Math.random() * 5.0; // tail length 5 units
      const tProgress = (tz - 32.0) / 5.0;
      progress = tProgress;
      
      const spine = getSpinePoint(32.0 / bodyLength);
      
      // Generate 6 distinct waving ribbons
      const ribbonId = Math.floor(Math.random() * 6);
      const angle = (ribbonId / 6.0) * 2.0 * Math.PI;
      
      const flareRadius = 0.32 + 3.4 * tProgress * (0.4 + 0.6 * Math.sin(tProgress * Math.PI));
      const radThickness = 0.24 * (1.0 - tProgress * 0.68);
      
      const rAngle = angle + Math.sin(tProgress * 5.0) * 0.35;
      const targetX = spine.x + Math.cos(rAngle) * flareRadius;
      const targetY = spine.y + Math.sin(rAngle) * flareRadius;
      
      const theta = Math.random() * 2.0 * Math.PI;
      const rad = Math.sqrt(Math.random()) * radThickness;
      
      rX = targetX + Math.cos(theta) * rad;
      rY = targetY + Math.sin(theta) * rad;
      rZ = tz;
      
      col = colorsList.supernovaPink.map((c, idx) => c * (1 - tProgress) + colorsList.galaxyCyan[idx] * tProgress);
      energy = 0.9;
      glow = 0.85;
    }

    targetPositions[i * 3] = rX;
    targetPositions[i * 3 + 1] = rY;
    targetPositions[i * 3 + 2] = rZ;

    // 3. LOGO TARGET GEOMETRY
    const letterIdx = i % letterOffsets.length;
    const letterChar = letterKeys[letterIdx];
    const letterOffset = letterOffsets[letterIdx];
    
    const logoPt = sampleLetter(letterChar, letterOffset);
    const thickZ = (Math.random() - 0.5) * 1.2;
    const noiseX = (Math.random() - 0.5) * 0.12;
    const noiseY = (Math.random() - 0.5) * 0.12;
    
    logoPositions[i * 3] = logoPt.x + noiseX;
    logoPositions[i * 3 + 1] = logoPt.y + noiseY;
    logoPositions[i * 3 + 2] = thickZ;

    // 4. ATTRIBUTE MAP
    colors[i * 3] = col[0];
    colors[i * 3 + 1] = col[1];
    colors[i * 3 + 2] = col[2];

    randoms[i * 4] = 0.5 + Math.random() * 1.0;
    randoms[i * 4 + 1] = 0.4 + Math.random() * 2.0;
    randoms[i * 4 + 2] = progress;
    randoms[i * 4 + 3] = type;

    extras[i * 3] = energy;
    extras[i * 3 + 1] = Math.random();
    extras[i * 3 + 2] = glow;
  }

  return {
    positions,
    targetPositions,
    colors,
    randoms,
    velocities,
    extras,
    logoPositions
  };
}
