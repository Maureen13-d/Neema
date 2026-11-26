/**
 * Canvas signer ported from CareLoop AslSample.
 * Plays a How2Sign pose packet. Research demo only — not KSL.
 */

import { useEffect, useRef, useState } from 'react';
import { ASL_CITATION, ASL_LABEL, clipUrl } from './aslLibrary';

type Frame = {
  proj: number[][];
  left_hand: boolean;
  right_hand: boolean;
};

type Clip = {
  id: string;
  sentence: string;
  fps: number;
  frames: Frame[];
  label?: string;
  citation?: string;
};

const SKIN = '#c4a484';
const HAND = '#8a5a3c';
const HAIR = '#3a2a22';
const SHIRT = '#6b5ce7';
const PANTS = '#3d3a5c';
const SHOE = '#1b2428';
const INK = '#2a2450';
const STAGE = '#ebe8fb';

function paint(canvas: HTMLCanvasElement | null, clip: Clip | null, index: number) {
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
  for (const point of points) {
    minX = Math.min(minX, point[0]!);
    minY = Math.min(minY, point[1]!);
    maxX = Math.max(maxX, point[0]!);
    maxY = Math.max(maxY, point[1]!);
  }
  const scale = Math.min(
    (width * 0.78) / Math.max(maxX - minX, 1),
    (height * 0.86) / Math.max(maxY - minY, 1),
  );
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = height / 2 - ((minY + maxY) / 2) * scale;
  const at = (joint: number) => [
    originX + points[joint]![0]! * scale,
    originY + points[joint]![1]! * scale,
  ];
  const span = Math.hypot(at(16)[0]! - at(17)[0]!, at(16)[1]! - at(17)[1]!);
  const thick = Math.max(8, span * 0.22);
  const footL = at(10);
  const footR = at(11);
  context.fillStyle = 'rgba(42,36,80,0.08)';
  context.beginPath();
  context.ellipse(
    (footL[0]! + footR[0]!) / 2,
    Math.max(footL[1]!, footR[1]!),
    span * 0.85,
    span * 0.14,
    0,
    0,
    Math.PI * 2,
  );
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
  limb(1, 4, PANTS, thick);
  limb(4, 7, PANTS, thick * 0.85);
  limb(7, 10, SHOE, thick * 0.55);
  limb(2, 5, PANTS, thick);
  limb(5, 8, PANTS, thick * 0.85);
  limb(8, 11, SHOE, thick * 0.55);
  limb(16, 18, SHIRT, thick * 0.72);
  limb(17, 19, SHIRT, thick * 0.72);
  limb(18, 20, SKIN, thick * 0.48);
  limb(19, 21, SKIN, thick * 0.48);
  const widen = (joint: number, away: number, extra: number) => {
    const point = at(joint);
    const other = at(away);
    const dx = point[0]! - other[0]!;
    const dy = point[1]! - other[1]!;
    const length = Math.hypot(dx, dy) || 1;
    return [point[0]! + (dx / length) * extra, point[1]! + (dy / length) * extra];
  };
  const leftShoulder = widen(16, 17, span * 0.08);
  const rightShoulder = widen(17, 16, span * 0.08);
  const leftHip = widen(1, 2, span * 0.06);
  const rightHip = widen(2, 1, span * 0.06);
  context.fillStyle = SHIRT;
  context.beginPath();
  context.moveTo(leftShoulder[0]!, leftShoulder[1]!);
  context.lineTo(rightShoulder[0]!, rightShoulder[1]!);
  context.lineTo(rightHip[0]!, rightHip[1]!);
  context.lineTo(leftHip[0]!, leftHip[1]!);
  context.closePath();
  context.fill();
  limb(12, 15, SKIN, thick * 0.42);
  const neck = at(12);
  const crown = at(15);
  const eyeL = at(23);
  const eyeR = at(24);
  const headR = Math.max(span * 0.28, Math.hypot(crown[0]! - neck[0]!, crown[1]! - neck[1]!) * 0.72);
  const headX = crown[0]! * 0.4 + (eyeL[0]! + eyeR[0]!) * 0.3;
  const headY = crown[1]! * 0.4 + (eyeL[1]! + eyeR[1]!) * 0.3;
  context.fillStyle = SKIN;
  context.beginPath();
  context.ellipse(headX, headY, headR * 0.86, headR, 0, 0, Math.PI * 2);
  context.fill();
  context.save();
  context.beginPath();
  context.ellipse(headX, headY, headR * 0.86, headR, 0, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = HAIR;
  context.fillRect(headX - headR, headY - headR * 1.15, headR * 2, headR * 0.7);
  context.restore();
  context.fillStyle = INK;
  context.beginPath();
  context.arc(eyeL[0]!, eyeL[1]!, Math.max(2, headR * 0.07), 0, Math.PI * 2);
  context.arc(eyeR[0]!, eyeR[1]!, Math.max(2, headR * 0.07), 0, Math.PI * 2);
  context.fill();
  const jaw = at(22);
  context.strokeStyle = '#6b3a32';
  context.lineWidth = Math.max(2, headR * 0.06);
  context.beginPath();
  context.arc(headX, (eyeL[1]! + eyeR[1]! + jaw[1]!) / 3, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
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
    context.arc(palm[0]!, palm[1]!, thick * 0.28, 0, Math.PI * 2);
    context.fill();
  };
  hand(20, 25, frame.left_hand);
  hand(21, 40, frame.right_hand);
}

/** Plays one How2Sign clip by id from the static packets folder. */
export function AslPlayer({
  clipId,
  paused = false,
  speed = 1,
}: {
  clipId: string;
  paused?: boolean;
  speed?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let cancelled = false;
    setClip(null);
    setProblem('');
    void fetch(clipUrl(clipId))
      .then(async (res) => {
        if (!res.ok) throw new Error('Clip missing');
        return res.json() as Promise<Clip>;
      })
      .then((body) => {
        if (cancelled) return;
        setClip({
          ...body,
          label: body.label ?? ASL_LABEL,
          citation: body.citation ?? ASL_CITATION,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProblem('Signed line could not load.');
      });
    return () => {
      cancelled = true;
    };
  }, [clipId]);

  useEffect(() => {
    const frames = clip?.frames ?? [];
    let index = 0;
    let last = 0;
    let handle = 0;
    const rate = (clip?.fps || 24) * speed;
    const draw = (now: number) => {
      const node = canvas.current;
      if (node) {
        const rect = node.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width * ratio));
        const height = Math.max(1, Math.round(rect.height * ratio));
        if (node.width !== width || node.height !== height) {
          node.width = width;
          node.height = height;
        }
      }
      if (!last || now - last >= 1000 / rate) {
        last = now;
        paint(canvas.current, clip, frames.length ? index % frames.length : 0);
        if (frames.length && !paused) index = (index + 1) % frames.length;
      }
      handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [clip, paused, speed]);

  return (
    <div className="asl-player">
      <canvas
        ref={canvas}
        role="img"
        aria-label={clip ? `Signing figure: ${clip.sentence}` : 'Signing figure'}
        className="asl-player__canvas"
      />
      {problem ? <p className="asl-player__problem">{problem}</p> : null}
      {clip ? (
        <p className="asl-player__caption soft-note">
          {clip.sentence} · {clip.label ?? ASL_LABEL}
        </p>
      ) : null}
    </div>
  );
}
