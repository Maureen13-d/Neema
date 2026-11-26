/**
 * Waist-up woman signing figure for How2Sign pose packets.
 * No legs. Research ASL visualisation only — not KSL.
 */

type Frame = {
  proj: number[][];
  left_hand: boolean;
  right_hand: boolean;
};

type Clip = {
  frames: Frame[];
};

const SKIN = '#d4a574';
const SKIN_DEEP = '#c49262';
const HAND = '#b8845a';
const HAIR = '#2c1a14';
const HAIR_SHEEN = '#4a2f24';
const BLOUSE = '#7b6cf0';
const BLOUSE_DEEP = '#5a4dd4';
const INK = '#2a2450';
const STAGE = '#ebe8fb';

/** Joints used for framing (upper body only). */
const UPPER = [9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

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
  context.clearRect(0, 0, width, height);
  context.fillStyle = STAGE;
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
  // Include hands if present.
  for (let joint = 25; joint <= 54; joint += 1) {
    const p = points[joint];
    if (!p) continue;
    minX = Math.min(minX, p[0]!);
    minY = Math.min(minY, p[1]!);
    maxX = Math.max(maxX, p[0]!);
    maxY = Math.max(maxY, p[1]!);
  }

  const padY = (maxY - minY) * 0.12;
  minY -= padY;
  maxY += padY * 0.4;

  const scale = Math.min(
    (width * 0.82) / Math.max(maxX - minX, 1),
    (height * 0.9) / Math.max(maxY - minY, 1),
  );
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = height * 0.52 - ((minY + maxY) / 2) * scale;
  const at = (joint: number) => [
    originX + points[joint]![0]! * scale,
    originY + points[joint]![1]! * scale,
  ];

  const span = Math.hypot(at(16)[0]! - at(17)[0]!, at(16)[1]! - at(17)[1]!) || 40;
  const thick = Math.max(9, span * 0.24);

  const widen = (joint: number, away: number, extra: number) => {
    const point = at(joint);
    const other = at(away);
    const dx = point[0]! - other[0]!;
    const dy = point[1]! - other[1]!;
    const length = Math.hypot(dx, dy) || 1;
    return [point[0]! + (dx / length) * extra, point[1]! + (dy / length) * extra];
  };

  const leftShoulder = widen(16, 17, span * 0.1);
  const rightShoulder = widen(17, 16, span * 0.1);
  // Soft waist ends (no legs) — blouse hem above where hips would be.
  const midX = (at(16)[0]! + at(17)[0]!) / 2;
  const shoulderY = (leftShoulder[1]! + rightShoulder[1]!) / 2;
  const hemY = shoulderY + span * 1.55;
  const waistL = [midX - span * 0.42, hemY];
  const waistR = [midX + span * 0.42, hemY];

  // Soft ground oval under torso only (no feet).
  context.fillStyle = 'rgba(42,36,80,0.07)';
  context.beginPath();
  context.ellipse(midX, hemY + span * 0.08, span * 0.7, span * 0.1, 0, 0, Math.PI * 2);
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

  // Blouse torso (woman-coded silhouette, waist-up).
  const blouseGrad = context.createLinearGradient(midX, shoulderY, midX, hemY);
  blouseGrad.addColorStop(0, BLOUSE);
  blouseGrad.addColorStop(1, BLOUSE_DEEP);
  context.fillStyle = blouseGrad;
  context.beginPath();
  context.moveTo(leftShoulder[0]!, leftShoulder[1]!);
  context.lineTo(rightShoulder[0]!, rightShoulder[1]!);
  context.quadraticCurveTo(waistR[0]! + span * 0.05, shoulderY + span * 0.55, waistR[0]!, waistR[1]!);
  context.quadraticCurveTo(midX, hemY + span * 0.08, waistL[0]!, waistL[1]!);
  context.quadraticCurveTo(waistL[0]! - span * 0.05, shoulderY + span * 0.55, leftShoulder[0]!, leftShoulder[1]!);
  context.closePath();
  context.fill();

  // Soft neckline.
  context.fillStyle = SKIN;
  context.beginPath();
  context.moveTo(midX - span * 0.12, shoulderY + span * 0.05);
  context.quadraticCurveTo(midX, shoulderY + span * 0.28, midX + span * 0.12, shoulderY + span * 0.05);
  context.closePath();
  context.fill();

  // Arms (no legs drawn).
  limb(16, 18, BLOUSE, thick * 0.72);
  limb(17, 19, BLOUSE, thick * 0.72);
  limb(18, 20, SKIN, thick * 0.5);
  limb(19, 21, SKIN, thick * 0.5);

  // Neck + head.
  limb(12, 15, SKIN, thick * 0.38);
  const neck = at(12);
  const crown = at(15);
  const eyeL = at(23);
  const eyeR = at(24);
  const headR = Math.max(span * 0.3, Math.hypot(crown[0]! - neck[0]!, crown[1]! - neck[1]!) * 0.75);
  const headX = crown[0]! * 0.35 + (eyeL[0]! + eyeR[0]!) * 0.325;
  const headY = crown[1]! * 0.35 + (eyeL[1]! + eyeR[1]!) * 0.325;

  // Longer hair (woman).
  context.fillStyle = HAIR;
  context.beginPath();
  context.ellipse(headX, headY + headR * 0.05, headR * 1.05, headR * 1.25, 0, 0, Math.PI * 2);
  context.fill();
  // Side falls.
  context.beginPath();
  context.ellipse(headX - headR * 0.75, headY + headR * 0.55, headR * 0.38, headR * 0.95, -0.2, 0, Math.PI * 2);
  context.ellipse(headX + headR * 0.75, headY + headR * 0.55, headR * 0.38, headR * 0.95, 0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = HAIR_SHEEN;
  context.beginPath();
  context.ellipse(headX - headR * 0.2, headY - headR * 0.35, headR * 0.35, headR * 0.25, -0.4, 0, Math.PI * 2);
  context.fill();

  // Face.
  context.fillStyle = SKIN;
  context.beginPath();
  context.ellipse(headX, headY + headR * 0.08, headR * 0.78, headR * 0.92, 0, 0, Math.PI * 2);
  context.fill();
  // Soft cheek warmth.
  context.fillStyle = 'rgba(232, 140, 120, 0.28)';
  context.beginPath();
  context.ellipse(headX - headR * 0.38, headY + headR * 0.28, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
  context.ellipse(headX + headR * 0.38, headY + headR * 0.28, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
  context.fill();

  // Bangs over forehead.
  context.fillStyle = HAIR;
  context.beginPath();
  context.ellipse(headX, headY - headR * 0.35, headR * 0.78, headR * 0.42, 0, Math.PI, Math.PI * 2);
  context.fill();

  context.fillStyle = INK;
  context.beginPath();
  context.arc(eyeL[0]!, eyeL[1]!, Math.max(2.2, headR * 0.07), 0, Math.PI * 2);
  context.arc(eyeR[0]!, eyeR[1]!, Math.max(2.2, headR * 0.07), 0, Math.PI * 2);
  context.fill();

  const jaw = at(22);
  context.strokeStyle = SKIN_DEEP;
  context.lineWidth = Math.max(2, headR * 0.055);
  context.beginPath();
  context.arc(headX, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3, headR * 0.2, 0.18 * Math.PI, 0.82 * Math.PI);
  context.stroke();

  const hand = (wrist: number, start: number, show: boolean) => {
    if (!show) return;
    context.strokeStyle = HAND;
    context.lineWidth = thick * 0.2;
    context.lineCap = 'round';
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
    const palm = at(wrist);
    context.fillStyle = SKIN;
    context.beginPath();
    context.arc(palm[0]!, palm[1]!, thick * 0.3, 0, Math.PI * 2);
    context.fill();
  };
  hand(20, 25, frame.left_hand);
  hand(21, 40, frame.right_hand);
}
