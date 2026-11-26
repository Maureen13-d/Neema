"""
Fetch only the conversational How2Sign-MV3D clips Neema's multi-chapter script needs.
Research ASL (CC BY-NC 4.0) — never label as KSL.
Merges into apps/web/public/signing/asl/packets without wiping CareLoop originals.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "signing" / "asl" / "packets"
TAR_URL = "https://huggingface.co/datasets/mage0001/How2Sign-MV3D/resolve/main/data/test-00001.tar"
TAR_SIZE = 52_193_280
MAX_FRAMES = 140

# Short care-relevant lines researched from How2Sign test shard.
WANT: dict[str, str] = {
    "FzQPg4aqNYc_0-1": "Hi!",
    "FzQPg4aqNYc_2-1": "We're back.",
    "FzUdcaxw_vs_10-2": "Why?",
    "FzUdcaxw_vs_16-2": "Before you know it, your chores are all going to be done.",
    "FzUdcaxw_vs_17-2": "Make it fun.",
    "G06Irzcwxiw_19-1": "To get through all that.",
    "G06Irzcwxiw_21-1": "You enjoy the moment of what you're doing.",
    "G06Irzcwxiw_25-1": "You're having a good time along the way.",
    "G095RWKQ39g_17-1": "So after a night of doing that, that can be a little bit strenuous.",
}


def fetch(start: int, end: int) -> bytes:
    last_error: Exception | None = None
    for _ in range(5):
        request = urllib.request.Request(
            TAR_URL,
            headers={"User-Agent": "Neema-research/0.1", "Range": f"bytes={start}-{end}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"range {start}-{end} failed") from last_error


def members() -> list[tuple[str, str, int, int]]:
    found: list[tuple[str, str, int, int]] = []
    offset = 0
    while offset + 512 <= TAR_SIZE:
        header = fetch(offset, offset + 511)
        if header[0:4] == b"\0\0\0\0":
            break
        name = header[0:100].split(b"\0", 1)[0].decode("utf-8", "replace")
        size = int(header[124:136].split(b"\0", 1)[0].strip() or b"0", 8)
        data_at = offset + 512
        if name.endswith(".npz") and size:
            sid = Path(name).stem
            if sid in WANT:
                found.append((sid, name, data_at, size))
        offset = data_at + ((size + 511) // 512) * 512
    return found


def packet(name: str, blob: bytes, sentence: str) -> dict | None:
    path = OUT / "_one.npz"
    path.write_bytes(blob)
    try:
        with np.load(path, allow_pickle=False) as loaded:
            sample_id = str(loaded["sample_id"])
            proj = loaded["smplx_joint_proj"][:, :55].copy()
            hands = loaded["wilor_hand_valid_mask"].copy()
            fps = float(loaded["mocap_framerate"])
    finally:
        path.unlink(missing_ok=True)

    if proj.shape[0] > MAX_FRAMES:
        print(f"skip long {sample_id} frames={proj.shape[0]}", flush=True)
        return None

    frames = []
    for index in range(proj.shape[0]):
        frames.append(
            {
                "proj": [
                    [round(float(point[0]), 1), round(float(point[1]), 1)] for point in proj[index]
                ],
                "left_hand": bool(hands[index, 0]),
                "right_hand": bool(hands[index, 1]),
            }
        )
    return {
        "id": sample_id,
        "sentence": sentence or WANT.get(sample_id, ""),
        "sample_id": sample_id,
        "fps": fps,
        "source": f"How2Sign-MV3D {name}",
        "license": "CC BY-NC 4.0",
        "label": "ASL RESEARCH: How2Sign sentence. Not a patient message. Not Kenyan Sign Language. Not reviewed.",
        "citation": "Duarte et al. How2Sign. CVPR 2021. Motion: How2Sign-MV3D. CC BY-NC 4.0.",
        "frames": frames,
    }


def rewrite_manifest() -> int:
    rows: list[dict] = []
    for path in OUT.glob("*.json"):
        if path.name in {"manifest.json"}:
            continue
        try:
            body = json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        if not body.get("id"):
            continue
        rows.append(
            {
                "id": body["id"],
                "sentence": body.get("sentence", ""),
                "frames": len(body.get("frames", [])),
            }
        )
    rows.sort(key=lambda r: (str(r.get("sentence") or r["id"]).lower()))
    (OUT / "manifest.json").write_text(json.dumps(rows), encoding="utf-8")
    return len(rows)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    found = members()
    print(f"found {len(found)} / {len(WANT)}: {[f[0] for f in found]}", flush=True)
    kept = 0
    for sid, name, data_at, size in found:
        body = packet(name, fetch(data_at, data_at + size - 1), WANT[sid])
        if not body:
            continue
        (OUT / f"{body['id']}.json").write_text(
            json.dumps(body, separators=(",", ":")), encoding="utf-8"
        )
        kept += 1
        print(f"kept {body['id']} {len(body['frames'])}f {body['sentence']!r}", flush=True)
    total = rewrite_manifest()
    print(f"done kept={kept} manifest={total}", flush=True)
    missing = sorted(set(WANT) - {f[0] for f in found})
    if missing:
        print(f"missing {missing}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
