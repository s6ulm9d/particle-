// Structured High-Definition Dragon Particle Generator for Algoryx

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

export function generateCosmicDragonParticles(count: number): CosmicParticlesData {
  const positions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const logoPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count * 4); // x: speed, y: size, z: progress along path, w: type
  const velocities = new Float32Array(count * 3);
  const extras = new Float32Array(count * 3); // x: energyLevel, y: noiseSeed, z: glowStrength

  // Color Palettes
  const colorsList = {
    deepIndigo: [0.03, 0.01, 0.32],
    nebulaPurple: [0.35, 0.05, 0.5],
    plasmaMagenta: [0.95, 0.02, 0.45],
    electricBlue: [0.0, 0.72, 1.0],
    galaxyCyan: [0.0, 0.98, 0.92],
    starlightWhite: [1.0, 1.0, 1.0],
    supernovaPink: [1.0, 0.1, 0.6],
  };

  // Define particle segments for complete anatomy:
  // Types (aRandom.w):
  // 0: Body (Serpentine strands + core)
  // 1: Head (Crown horn tines, Jaws, Snout profile, teeth/fangs)
  // 2: Horns (Branching structures)
  // 3: Whiskers (Snout flowing whiskers)
  // 4: Back Scales (Glowing triangular dorsal fin comb)
  // 5: Tail (Expanding plume)
  // 6: Eyes (Glowing core spheres)
  // 7: Legs & Claws (4 legs, each with 4 sharp claws)

  const ratioEyes = 0.015;
  const ratioHorns = 0.08;
  const ratioWhiskers = 0.06;
  const ratioBackScales = 0.11; // Triangular back comb
  const ratioLegs = 0.12;       // 4 legs and sharp claws
  const ratioWings = 0.16;      // Wings
  const ratioTail = 0.10;
  const ratioHead = 0.12;       // Muzzle, jaws, and sharp fangs
  // Body takes remaining (~23.5%)

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

    // Assign type category
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
      type = 8; // Wings
    } else if (i < countEyes + countHead + countHorns + countWhiskers + countBackScales + countLegs + countWings + countTail) {
      type = 5;
    } else {
      type = 0;
    }

    // 1. GENERATE SCATTERED INITIAL GALAXY POSITIONS
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

    // 2. GENERATE DRAGON SHAPE (Accurate Eastern Serpentine Dragon with limbs and back plates)
    const bodyLength = 32.0;

    if (type === 0) {
      // --- BODY (Serpentine strands + internal core) ---
      const isCore = Math.random() < 0.3;
      const t = Math.random();
      progress = t;
      const pzSpine = t * bodyLength;
      
      const spineX = Math.sin(pzSpine * 0.25) * 1.8;
      const spineY = Math.cos(pzSpine * 0.16) * 1.2;
      const radius = 1.5 * (1.0 - t * 0.93);

      if (isCore) {
        const pt = randomInSphere(radius * 0.22);
        rX = spineX + pt.x;
        rY = spineY + pt.y;
        rZ = pzSpine;
        col = colorsList.galaxyCyan.map((c, idx) => c * 0.5 + colorsList.starlightWhite[idx] * 0.5);
        energy = 1.0;
        glow = 0.85;
      } else {
        const numStrands = 6;
        const strandId = Math.floor(Math.random() * numStrands);
        const strandAngle = (strandId / numStrands) * 2 * Math.PI + t * 9.0;
        const thickness = radius * 0.12;
        const pt = randomInSphere(thickness);

        rX = spineX + Math.cos(strandAngle) * radius + pt.x;
        rY = spineY + Math.sin(strandAngle) * radius + pt.y;
        rZ = pzSpine + pt.z * 0.2;

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
      // --- HEAD (Jaws, snout profile, fangs) ---
      const hz = -Math.random() * 3.2; // snout length
      const t = Math.abs(hz) / 3.2; // progress along snout
      progress = t;
      
      const featureType = Math.random();
      
      if (featureType < 0.18) {
        // Sharp fangs (Upper and Lower) - straight lines
        const side = Math.random() > 0.5 ? 1 : -1;
        const isUpper = Math.random() > 0.5;
        // Upper fangs point down, lower fangs point up
        const fangStart: [number, number, number] = [side * 0.36, isUpper ? 0.15 : -0.2, -2.4];
        const fangEnd: [number, number, number] = [side * 0.36, isUpper ? -0.3 : 0.05, -2.4];
        
        const pt = sampleLine(fangStart, fangEnd, 0.01);
        rX = pt.x;
        rY = pt.y;
        rZ = pt.z;
        col = colorsList.starlightWhite; // sharp white teeth
        glow = 1.0;
        energy = 1.0;
      } else if (featureType < 0.45) {
        // Upper snout profile line (sharp edge)
        const pt = randomInSphere(0.04);
        rX = pt.x;
        rY = 0.36 + (1.0 - t) * 0.35 + pt.y; // tapers down to nose
        rZ = hz;
        col = colorsList.galaxyCyan;
        glow = 0.8;
      } else if (featureType < 0.65) {
        // Lower jaw line
        const pt = randomInSphere(0.04);
        rX = pt.x;
        rY = -0.35 + t * 0.12 + pt.y;
        rZ = hz;
        col = colorsList.electricBlue;
      } else {
        // Skull & Cheek structures
        const pt = randomInSphere(1.0);
        rX = pt.x * 0.5 * (1.0 - t * 0.4);
        rY = pt.y * 0.45 * (1.0 - t * 0.4) + 0.05;
        rZ = hz;
        col = colorsList.electricBlue.map((c, idx) => c * 0.6 + colorsList.nebulaPurple[idx] * 0.4);
      }

    } else if (type === 6) {
      // --- EYES (Glowing spheres) ---
      const side = Math.random() > 0.5 ? 1 : -1;
      const eyePos = { x: side * 0.48, y: 0.55, z: -1.7 };
      const pt = randomInSphere(0.12);
      rX = eyePos.x + pt.x;
      rY = eyePos.y + pt.y;
      rZ = eyePos.z + pt.z;
      progress = 0.0;
      col = colorsList.starlightWhite;
      energy = 1.0;
      glow = 1.0;

    } else if (type === 2) {
      // --- HORNS (Branching deer antlers) ---
      // Curves back, then splits into two sharp tines
      const hornSide = Math.random() > 0.5 ? 1 : -1;
      const tineType = Math.random() > 0.4 ? 0 : 1; // 0 = main tine, 1 = sub tine
      const hProg = Math.random();
      progress = hProg;

      const base: [number, number, number] = [hornSide * 0.42, 0.75, -0.6];
      
      if (tineType === 0) {
        // Main antler curves back and up
        const target: [number, number, number] = [hornSide * 1.8, 2.6, 2.0];
        const mid: [number, number, number] = [hornSide * 0.9, 1.6, 0.6];
        
        // Quadratic bezier
        const mt = hProg;
        rX = (1-mt)*(1-mt)*base[0] + 2*(1-mt)*mt*mid[0] + mt*mt*target[0];
        rY = (1-mt)*(1-mt)*base[1] + 2*(1-mt)*mt*mid[1] + mt*mt*target[1];
        rZ = (1-mt)*(1-mt)*base[2] + 2*(1-mt)*mt*mid[2] + mt*mt*target[2];
      } else {
        // Sub branch antler forks off halfway
        const mid: [number, number, number] = [hornSide * 0.9, 1.6, 0.6]; // start at split point
        const target: [number, number, number] = [hornSide * 2.2, 1.8, 1.1]; // forks outward
        
        const pt = sampleLine(mid, target);
        rX = pt.x;
        rY = pt.y;
        rZ = pt.z;
      }
      
      // Small horn thickness taper
      const pt = randomInSphere(0.12 * (1.0 - hProg * 0.6));
      rX += pt.x;
      rY += pt.y;
      rZ += pt.z;
      
      col = colorsList.electricBlue.map((c, idx) => c * (1 - hProg) + colorsList.starlightWhite[idx] * hProg);
      energy = 0.8;
      glow = 0.65;

    } else if (type === 3) {
      // --- WHISKERS (Long flowing snout trails) ---
      const whiskerSide = Math.random() > 0.5 ? 1 : -1;
      const whiskerPair = Math.random() > 0.5 ? 0 : 1;
      const wProgress = Math.random();
      progress = wProgress;
      
      const startX = whiskerSide * 0.28;
      const startY = whiskerPair === 0 ? 0.05 : -0.25;
      const startZ = -2.9;
      
      const spread = whiskerPair === 0 ? 3.6 : 2.5;
      const drop = whiskerPair === 0 ? -1.8 : -2.6;
      
      rX = startX + whiskerSide * (spread * wProgress * wProgress + Math.sin(wProgress * 5.0) * 0.2);
      rY = startY + drop * wProgress + Math.cos(wProgress * 3.0) * 0.15;
      rZ = startZ + 6.0 * wProgress;
      
      const pt = randomInSphere(0.04);
      rX += pt.x;
      rY += pt.y;
      rZ += pt.z;
      
      col = colorsList.galaxyCyan;
      energy = 0.95;
      glow = 0.8;

    } else if (type === 4) {
      // --- BACK SCALES (60+ Sharp triangular dorsal fin plates) ---
      // We distribute particles along the edges of triangular scales along the back Z=2 to Z=30
      const numScales = 75;
      const scaleId = Math.floor(Math.random() * numScales);
      const scaleProgress = scaleId / numScales; // progress along body
      
      const zScale = 2.0 + scaleProgress * 28.0; // scale Z anchor
      
      // Spine base coordinate
      const spineX = Math.sin(zScale * 0.25) * 1.8;
      const spineY = Math.cos(zScale * 0.16) * 1.2;
      const radius = 1.5 * (1.0 - (zScale / bodyLength) * 0.93);
      
      const sHeight = 1.2 * (1.0 - scaleProgress * 0.6); // scale height tapers
      
      // Define triangle vertices
      const pBaseFront: [number, number, number] = [spineX, spineY + radius, zScale];
      const pPeak: [number, number, number] = [spineX, spineY + radius + sHeight, zScale + 0.15];
      const pBaseBack: [number, number, number] = [spineX, spineY + radius, zScale + 0.35];
      
      // Pick a random edge of the triangle to distribute particles along (creates sharp edge lines!)
      const edge = Math.floor(Math.random() * 3);
      let pt;
      if (edge === 0) {
        pt = sampleLine(pBaseFront, pPeak, 0.015);
      } else if (edge === 1) {
        pt = sampleLine(pPeak, pBaseBack, 0.015);
      } else {
        pt = sampleLine(pBaseBack, pBaseFront, 0.015);
      }
      
      rX = pt.x;
      rY = pt.y;
      rZ = pt.z;
      progress = scaleProgress; // waves in sync with spine
      
      col = colorsList.plasmaMagenta.map((c, idx) => c * (1 - scaleProgress) + colorsList.supernovaPink[idx] * scaleProgress);
      energy = 0.8;
      glow = 0.7;

    } else if (type === 7) {
      // --- LEGS & CLAWS (4 detailed limbs with sharp toes) ---
      // Legs placed at Z = 6.5 (front legs) and Z = 22.0 (back legs)
      const isFront = Math.random() < 0.5;
      const side = Math.random() > 0.5 ? 1 : -1;
      const zAnchor = isFront ? 6.5 : 22.0;
      
      const spineX = Math.sin(zAnchor * 0.25) * 1.8;
      const spineY = Math.cos(zAnchor * 0.16) * 1.2;
      const radius = 1.5 * (1.0 - (zAnchor / bodyLength) * 0.93);
      
      // Leg joints
      const pShoulder: [number, number, number] = [spineX + side * radius, spineY - 0.2, zAnchor];
      const pKnee: [number, number, number] = [spineX + side * (radius + 1.6), spineY - 1.2, zAnchor - 0.4];
      const pAnkle: [number, number, number] = [spineX + side * (radius + 1.2), spineY - 2.4, zAnchor - 0.8];
      
      const member = Math.random();
      progress = zAnchor / bodyLength; // Wave in sync with their attachment point

      if (member < 0.25) {
        // Upper leg (Shoulder to Knee)
        const pt = sampleLine(pShoulder, pKnee, 0.06);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        col = colorsList.nebulaPurple;
      } else if (member < 0.5) {
        // Lower leg (Knee to Ankle)
        const pt = sampleLine(pKnee, pAnkle, 0.05);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        col = colorsList.electricBlue;
      } else {
        // Sharp Claws! 4 claws extending from the ankle.
        // We define claw tip targets
        const clawId = Math.floor(Math.random() * 4);
        
        let clawOffset = [0, 0, 0];
        if (clawId === 0) clawOffset = [side * 0.6, -0.4, -0.6];       // outer toe
        else if (clawId === 1) clawOffset = [side * 0.1, -0.5, -0.8];  // center toe
        else if (clawId === 2) clawOffset = [side * -0.4, -0.4, -0.6]; // inner toe
        else clawOffset = [side * 0.1, -0.2, 0.5];                    // back spur
        
        const pClawTip: [number, number, number] = [
          pAnkle[0] + clawOffset[0],
          pAnkle[1] + clawOffset[1],
          pAnkle[2] + clawOffset[2]
        ];
        
        // Distribute particles tightly along the claw line for sharp spikes
        const pt = sampleLine(pAnkle, pClawTip, 0.012);
        rX = pt.x;
        rY = pt.y;
        rZ = pt.z;
        
        // Claws have glowing starlight tips
        col = colorsList.electricBlue.map((c, idx) => c * (1 - pt.progress) + colorsList.starlightWhite[idx] * pt.progress);
        glow = 0.9;
        energy = 0.9;
      }

    } else if (type === 8) {
      // --- WINGS (Type 8) ---
      const wingSide = Math.random() > 0.5 ? 1 : -1;
      const wProgress = Math.random(); // from shoulder to tip
      progress = wProgress;
      
      const zAnchor = 6.5;
      const spineX = Math.sin(zAnchor * 0.25) * 1.8;
      const spineY = Math.cos(zAnchor * 0.16) * 1.2;
      const radius = 1.5 * (1.0 - (zAnchor / bodyLength) * 0.93);
      
      const pShoulder: [number, number, number] = [spineX + wingSide * radius, spineY + 0.3, zAnchor];
      
      // Wing tips extending back, outward and upward/downward (matching flying pose bat structure)
      const pTip1: [number, number, number] = [spineX + wingSide * 9.5, spineY + 5.2, zAnchor - 1.2]; // Top tip
      const pTip2: [number, number, number] = [spineX + wingSide * 11.5, spineY + 2.0, zAnchor + 1.8]; // Mid tip
      const pTip3: [number, number, number] = [spineX + wingSide * 8.5, spineY - 1.2, zAnchor + 4.2]; // Bottom tip
      
      const isBone = Math.random() < 0.25;
      
      if (isBone) {
        // Wing spars (bones)
        const sparId = Math.floor(Math.random() * 3);
        const tip = sparId === 0 ? pTip1 : sparId === 1 ? pTip2 : pTip3;
        const pt = sampleLine(pShoulder, tip, 0.05);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        
        col = colorsList.electricBlue.map((c, idx) => c * (1 - wProgress) + colorsList.starlightWhite[idx] * wProgress);
        energy = 0.9;
        glow = 0.8;
      } else {
        // Wing membrane (translucent stardust web)
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
        const pt = sampleLine(pA as [number, number, number], pB as [number, number, number], 0.15);
        rX = pt.x; rY = pt.y; rZ = pt.z;
        
        col = colorsList.nebulaPurple.map((c, idx) => c * (1 - weight) + colorsList.plasmaMagenta[idx] * weight);
        energy = 0.5;
        glow = 0.45;
      }

    } else if (type === 5) {
      // --- TAIL ---
      const tz = 32.0 + Math.random() * 4.5;
      const tProgress = (tz - 32.0) / 4.5;
      progress = tProgress;
      
      const spineX = Math.sin(32.0 * 0.25) * 1.8;
      const spineY = Math.cos(32.0 * 0.16) * 1.2;
      
      const fanAngle = Math.random() * 2 * Math.PI;
      const fanRadius = 0.1 + 3.2 * tProgress * (0.3 + 0.7 * Math.random());
      
      rX = spineX + Math.cos(fanAngle) * fanRadius;
      rY = spineY + Math.sin(fanAngle) * fanRadius;
      rZ = tz;
      
      col = colorsList.supernovaPink.map((c, idx) => c * (1 - tProgress) + colorsList.galaxyCyan[idx] * tProgress);
      energy = 0.85;
      glow = 0.8;
    }

    targetPositions[i * 3] = rX;
    targetPositions[i * 3 + 1] = rY;
    targetPositions[i * 3 + 2] = rZ;

    // 3. GENERATE LOGO TARGET POSITIONS
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

    // 4. MAP ATTRIBUTES
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
    logoPositions,
    colors,
    randoms,
    velocities,
    extras,
  };
}
