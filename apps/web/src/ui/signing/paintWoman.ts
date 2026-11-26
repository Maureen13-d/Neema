/**
 * Passport-framed woman signing figure for How2Sign pose packets.
 * Chest-up only (no legs). Research ASL visualisation — not KSL.
 * Inspired by readable signing-avatar demos: dark stage, human face, white tee.
 */

type Frame = {
  proj: number[][];
  left_hand: boolean;
  right_hand: boolean;
};

type Clip = {
  frames: Frame[];
};

const SKIN = '#c68642';
const SKIN_LIGHT = '#d9a066';
const SKIN_DEEP = '#8d5524';
const SKIN_SHADOW = '#6b3f1a';
const HAND = '#b87333';
const HAIR = '#1a0f0c';
const HAIR_MID = '#2e1b14';
const TEE = '#f4f6f8';
const TEE_SHADOW = '#d5dae0';
const INK = '#1c1410';
const LIP = '#a33a3a';
const STAGE = '#152038';
const STAGE_EDGE = '#0e1628';

/** Upper-body joints for framing (exclude hips/legs). */
const UPPER = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

export function paintWomanSigner(
  canvas: HTMLCanvasElement | null,
  clip: Clip | null,
  index: number,
): void {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;

  // Passport-card stage (dark navy).
  const bg = context.createLinearGradient(0, 0, width * 0.2, height);
  bg.addColorStop(0, '#1c2a44');
  bg.addColorStop(0.55, STAGE);
  bg.addColorStop(1, STAGE_EDGE);
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const frame = clip?.frames[index];
  if (!frame) return;
  const points = frame.proj;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const joint of UPPER) {
    const p = points[joint];
    if (!p) continue;
    minX = Math.min(minX, p[0]!);
    minY = Math.min(minY, p[1]!);
    maxX = Math.max(maxX, p[0]!);
    maxY = Math.max(maxY, p[1]!);
  }
  for (let joint = 25; joint <= 54; joint += 1) {
    const p = points[joint];
    if (!p) continue;
    minX = Math.min(minX, p[0]!);
    minY = Math.min(minY, p[1]!);
    maxX = Math.max(maxX, p[0]!);
    maxY = Math.max(maxY, p[1]!);
  }

  // Passport crop: enlarge head/chest, leave room for signing hands.
  const padX = (maxX - minX) * 0.18;
  const padTop = (maxY - minY) * 0.22;
  const padBot = (maxY - minY) * 0.08;
  minX -= padX;
  maxX += padX;
  minY -= padTop;
  maxY += padBot;

  const scale = Math.min(
    (width * 0.88) / Math.max(maxX - minX, 1),
    (height * 0.92) / Math.max(maxY - minY, 1),
  );
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  // Bias figure slightly high — passport ID framing.
  const originY = height * 0.46 - ((minY + maxY) / 2) * scale;
  const at = (joint: number) => [
    originX + points[joint]![0]! * scale,
    originY + points[joint]![1]! * scale,
  ];

  const span = Math.hypot(at(16)[0]! - at(17)[0]!, at(16)[1]! - at(17)[1]!) || 40;
  const thick = Math.max(10, span * 0.28);

  const widen = (joint: number, away: number, extra: number) => {
    const point = at(joint);
    const other = at(away);
    const dx = point[0]! - other[0]!;
    const dy = point[1]! - other[1]!;
    const length = Math.hypot(dx, dy) || 1;
    return [point[0]! + (dx / length) * extra, point[1]! + (dy / length) * extra];
  };

  const leftShoulder = widen(16, 17, span * 0.12);
  const rightShoulder = widen(17, 16, span * 0.12);
  const midX = (at(16)[0]! + at(17)[0]!) / 2;
  const shoulderY = (leftShoulder[1]! + rightShoulder[1]!) / 2;
  // Chest-up hem — passport crop ends mid-torso.
  const hemY = Math.min(height - 4, shoulderY + span * 1.35);
  const waistL = [midX - span * 0.5, hemY];
  const waistR = [midX + span * 0.5, hemY];

  const neck = at(12);
  const crown = at(15);
  const eyeL = at(23);
  const eyeR = at(24);
  const jaw = at(22);
  const headR = Math.max(span * 0.34, Math.hypot(crown[0]! - neck[0]!, crown[1]! - neck[1]!) * 0.82);
  const headX = crown[0]! * 0.3 + (eyeL[0]! + eyeR[0]!) * 0.35;
  const headY = crown[1]! * 0.3 + (eyeL[1]! + eyeR[1]!) * 0.35;

  // Soft cast shadow behind figure (directional light from upper left).
  context.fillStyle = 'rgba(0,0,0,0.28)';
  context.beginPath();
  context.ellipse(midX + span * 0.12, hemY - span * 0.05, span * 0.55, span * 0.12, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(headX + headR * 0.35, headY + headR * 0.2, headR * 0.95, headR * 1.15, 0.08, 0, Math.PI * 2);
  context.fill();

  const limb = (a: number, b: number, color: string, weight: number) => {
    const start = at(a);
    const end = at(b);
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(start[0]!, start[1]!);
    context.lineTo(end[0]!, end[1]!);
    context.stroke();
  };

  // White crew-neck tee (passport-demo look).
  const teeGrad = context.createLinearGradient(midX - span, shoulderY, midX + span, hemY);
  teeGrad.addColorStop(0, TEE);
  teeGrad.addColorStop(0.45, '#ffffff');
  teeGrad.addColorStop(1, TEE_SHADOW);
  context.fillStyle = teeGrad;
  context.beginPath();
  context.moveTo(leftShoulder[0]!, leftShoulder[1]!);
  context.lineTo(rightShoulder[0]!, rightShoulder[1]!);
  context.quadraticCurveTo(waistR[0]! + span * 0.04, shoulderY + span * 0.5, waistR[0]!, waistR[1]!);
  context.lineTo(waistL[0]!, waistL[1]!);
  context.quadraticCurveTo(waistL[0]! - span * 0.04, shoulderY + span * 0.5, leftShoulder[0]!, leftShoulder[1]!);
  context.closePath();
  context.fill();

  // Soft sleeve caps.
  context.fillStyle = TEE_SHADOW;
  context.beginPath();
  context.ellipse(leftShoulder[0]!, leftShoulder[1]! + span * 0.08, thick * 0.55, thick * 0.35, -0.4, 0, Math.PI * 2);
  context.ellipse(rightShoulder[0]!, rightShoulder[1]! + span * 0.08, thick * 0.55, thick * 0.35, 0.4, 0, Math.PI * 2);
  context.fill();

  // Crew neckline + skin.
  context.fillStyle = SKIN;
  context.beginPath();
  context.moveTo(midX - span * 0.16, shoulderY + span * 0.02);
  context.quadraticCurveTo(midX, shoulderY + span * 0.32, midX + span * 0.16, shoulderY + span * 0.02);
  context.closePath();
  context.fill();

  // Small chest mark (muted, not a brand claim).
  context.fillStyle = 'rgba(70, 110, 180, 0.55)';
  context.beginPath();
  context.moveTo(midX - span * 0.28, shoulderY + span * 0.42);
  context.lineTo(midX - span * 0.18, shoulderY + span * 0.55);
  context.lineTo(midX - span * 0.28, shoulderY + span * 0.68);
  context.lineTo(midX - span * 0.38, shoulderY + span * 0.55);
  context.closePath();
  context.fill();

  // Arms — volume first (sleeve), then skin forearm.
  limb(16, 18, TEE, thick * 0.78);
  limb(17, 19, TEE, thick * 0.78);
  limb(18, 20, SKIN, thick * 0.52);
  limb(19, 21, SKIN, thick * 0.52);

  // Neck.
  const neckW = Math.max(6, headR * 0.42);
  const neckGrad = context.createLinearGradient(midX - neckW, neck[1]!, midX + neckW, neck[1]!);
  neckGrad.addColorStop(0, SKIN_DEEP);
  neckGrad.addColorStop(0.35, SKIN);
  neckGrad.addColorStop(1, SKIN_LIGHT);
  context.fillStyle = neckGrad;
  context.beginPath();
  context.moveTo(midX - neckW * 0.55, shoulderY + span * 0.02);
  context.quadraticCurveTo(midX - neckW * 0.35, (neck[1]! + headY) / 2, midX - neckW * 0.4, headY + headR * 0.55);
  context.lineTo(midX + neckW * 0.4, headY + headR * 0.55);
  context.quadraticCurveTo(midX + neckW * 0.35, (neck[1]! + headY) / 2, midX + neckW * 0.55, shoulderY + span * 0.02);
  context.closePath();
  context.fill();

  // Hair mass behind head (braid-inspired falls).
  context.fillStyle = HAIR;
  context.beginPath();
  context.ellipse(headX, headY + headR * 0.08, headR * 1.08, headR * 1.28, 0, 0, Math.PI * 2);
  context.fill();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      const bx = headX + side * (headR * (0.55 + i * 0.12));
      const by = headY + headR * (0.55 + i * 0.18);
      context.fillStyle = i % 2 === 0 ? HAIR : HAIR_MID;
      context.beginPath();
      context.ellipse(bx, by, headR * 0.16, headR * (0.7 + i * 0.08), side * 0.15, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Face oval with soft lighting.
  const faceGrad = context.createRadialGradient(
    headX - headR * 0.25,
    headY - headR * 0.15,
    headR * 0.1,
    headX,
    headY + headR * 0.1,
    headR,
  );
  faceGrad.addColorStop(0, SKIN_LIGHT);
  faceGrad.addColorStop(0.55, SKIN);
  faceGrad.addColorStop(1, SKIN_DEEP);
  context.fillStyle = faceGrad;
  context.beginPath();
  context.ellipse(headX, headY + headR * 0.1, headR * 0.78, headR * 0.95, 0, 0, Math.PI * 2);
  context.fill();

  // Freckle dust (very soft).
  context.fillStyle = 'rgba(120, 70, 40, 0.18)';
  for (const [fx, fy] of [
    [-0.18, 0.05],
    [0.12, 0.02],
    [-0.05, 0.12],
    [0.22, 0.1],
    [-0.28, 0.14],
  ] as const) {
    context.beginPath();
    context.arc(headX + headR * fx, headY + headR * fy, Math.max(0.8, headR * 0.025), 0, Math.PI * 2);
    context.fill();
  }

  // Cornrow / braid part lines across scalp.
  context.strokeStyle = HAIR_MID;
  context.lineWidth = Math.max(1.2, headR * 0.04);
  for (let i = -2; i <= 2; i += 1) {
    context.beginPath();
    context.moveTo(headX + i * headR * 0.22, headY - headR * 0.75);
    context.quadraticCurveTo(
      headX + i * headR * 0.2,
      headY - headR * 0.35,
      headX + i * headR * 0.18,
      headY - headR * 0.05,
    );
    context.stroke();
  }

  // Hair bangs / hairline over forehead.
  context.fillStyle = HAIR;
  context.beginPath();
  context.ellipse(headX, headY - headR * 0.42, headR * 0.8, headR * 0.38, 0, Math.PI, Math.PI * 2);
  context.fill();

  // Brows.
  context.strokeStyle = SKIN_SHADOW;
  context.lineWidth = Math.max(1.5, headR * 0.05);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(eyeL[0]! - headR * 0.14, eyeL[1]! - headR * 0.16);
  context.quadraticCurveTo(eyeL[0]!, eyeL[1]! - headR * 0.22, eyeL[0]! + headR * 0.12, eyeL[1]! - headR * 0.14);
  context.moveTo(eyeR[0]! - headR * 0.12, eyeR[1]! - headR * 0.14);
  context.quadraticCurveTo(eyeR[0]!, eyeR[1]! - headR * 0.22, eyeR[0]! + headR * 0.14, eyeR[1]! - headR * 0.16);
  context.stroke();

  // Eyes (white + iris + pupil).
  const eyeRsize = Math.max(2.4, headR * 0.09);
  for (const eye of [eyeL, eyeR]) {
    context.fillStyle = '#f5f2ea';
    context.beginPath();
    context.ellipse(eye[0]!, eye[1]!, eyeRsize * 1.15, eyeRsize * 0.85, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#4a2e1a';
    context.beginPath();
    context.arc(eye[0]!, eye[1]!, eyeRsize * 0.55, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = INK;
    context.beginPath();
    context.arc(eye[0]!, eye[1]!, eyeRsize * 0.28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.65)';
    context.beginPath();
    context.arc(eye[0]! - eyeRsize * 0.25, eye[1]! - eyeRsize * 0.25, eyeRsize * 0.18, 0, Math.PI * 2);
    context.fill();
  }

  // Soft nose.
  context.strokeStyle = SKIN_DEEP;
  context.lineWidth = Math.max(1.2, headR * 0.035);
  context.beginPath();
  context.moveTo(headX, (eyeL[1]! + eyeR[1]!) / 2 + headR * 0.05);
  context.quadraticCurveTo(headX + headR * 0.06, headY + headR * 0.22, headX, headY + headR * 0.32);
  context.stroke();

  // Lips.
  context.fillStyle = LIP;
  context.beginPath();
  context.ellipse(headX, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3 + headR * 0.08, headR * 0.18, headR * 0.07, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.25)';
  context.lineWidth = Math.max(1, headR * 0.02);
  context.beginPath();
  context.moveTo(headX - headR * 0.12, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3 + headR * 0.05);
  context.quadraticCurveTo(headX, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3 + headR * 0.02, headX + headR * 0.12, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3 + headR * 0.05);
  context.stroke();

  // Cheeks.
  context.fillStyle = 'rgba(220, 120, 100, 0.22)';
  context.beginPath();
  context.ellipse(headX - headR * 0.4, headY + headR * 0.28, headR * 0.14, headR * 0.09, 0, 0, Math.PI * 2);
  context.ellipse(headX + headR * 0.4, headY + headR * 0.28, headR * 0.14, headR * 0.09, 0, 0, Math.PI * 2);
  context.fill();

  const hand = (wrist: number, start: number, show: boolean) => {
    if (!show) return;
    const palm = at(wrist);
    // Palm pad first for a more human hand mass.
    context.fillStyle = SKIN;
    context.beginPath();
    context.ellipse(palm[0]!, palm[1]!, thick * 0.38, thick * 0.32, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = HAND;
    context.lineWidth = Math.max(2.5, thick * 0.22);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    for (let finger = 0; finger < 5; finger += 1) {
      const joint = start + finger * 3;
      const chain = [wrist, joint, joint + 1, joint + 2];
      for (let link = 0; link < chain.length - 1; link += 1) {
        const from = at(chain[link]!);
        const to = at(chain[link + 1]!);
        context.moveTo(from[0]!, from[1]!);
        context.lineTo(to[0]!, to[1]!);
      }
    }
    context.stroke();
    // Fingertip pads.
    context.fillStyle = SKIN_LIGHT;
    for (let finger = 0; finger < 5; finger += 1) {
      const tip = at(start + finger * 3 + 2);
      context.beginPath();
      context.arc(tip[0]!, tip[1]!, Math.max(2, thick * 0.12), 0, Math.PI * 2);
      context.fill();
    }
  };
  hand(20, 25, frame.left_hand);
  hand(21, 40, frame.right_hand);
}
