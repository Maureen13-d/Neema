/**
 * Canvas signer ported from CareLoop AslSample.
 * Plays a How2Sign pose packet. Research demo only — not KSL.
 */

import { useEffect, useRef, useState } from 'react';
import { ASL_CITATION, ASL_LABEL, clipUrl } from './aslLibrary';
import { paintWomanSigner } from './paintWoman';

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

export type SignedLine = {
  id: string;
  sentence: string;
  label: string;
  citation: string;
};

/** Plays one How2Sign clip by id from the static packets folder. */
export function AslPlayer({
  clipId,
  paused = false,
  speed = 1,
  replay = 0,
  tall = false,
  showCaption = true,
  onLine,
  onProblem,
}: {
  clipId: string;
  paused?: boolean;
  speed?: number;
  /** Bump to restart from frame 0. */
  replay?: number;
  tall?: boolean;
  showCaption?: boolean;
  onLine?: (line: SignedLine | null) => void;
  onProblem?: (message: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let cancelled = false;
    setClip(null);
    setProblem('');
    onLine?.(null);
    void fetch(clipUrl(clipId))
      .then(async (res) => {
        if (!res.ok) throw new Error('Clip missing');
        return res.json() as Promise<Clip>;
      })
      .then((body) => {
        if (cancelled) return;
        const next = {
          ...body,
          label: body.label ?? ASL_LABEL,
          citation: body.citation ?? ASL_CITATION,
        };
        setClip(next);
        onLine?.({
          id: next.id,
          sentence: next.sentence,
          label: next.label ?? ASL_LABEL,
          citation: next.citation ?? ASL_CITATION,
        });
      })
      .catch(() => {
        if (cancelled) return;
        const message = 'Signed line could not load.';
        setProblem(message);
        onProblem?.(message);
        onLine?.(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clipId, onLine, onProblem]);

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
        paintWomanSigner(canvas.current, clip, frames.length ? index % frames.length : 0);
        if (frames.length && !paused) index = (index + 1) % frames.length;
      }
      handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [clip, paused, speed, replay]);

  return (
    <div className={tall ? 'asl-player asl-player--tall' : 'asl-player'}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={clip ? `Signing figure: ${clip.sentence}` : 'Signing figure'}
        className="asl-player__canvas"
      />
      {problem ? <p className="asl-player__problem">{problem}</p> : null}
      {showCaption && clip ? (
        <p className="asl-player__caption soft-note">
          {clip.sentence} · {clip.label ?? ASL_LABEL}
        </p>
      ) : null}
    </div>
  );
}
