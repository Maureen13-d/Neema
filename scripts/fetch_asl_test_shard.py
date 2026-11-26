"""
Download How2Sign-MV3D test-00001 (~52MB) and write short JSON packets for Neema.
Research ASL only (CC BY-NC 4.0) — never label as KSL.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "signing" / "asl" / "packets"
CARELOOP_MANIFEST = Path(r"C:\Users\Administrator\CareLoop\data\external\asl\packets\manifest.json")
TAR_URL = "https://huggingface.co/datasets/mage0001/How2Sign-MV3D/resolve/main/data/test-00001.tar"
TAR_SIZE = 52_193_280
# Prefer short lines that can support conversation turns.
MAX_FRAMES = 120


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


def sentence_map() -> dict[str, str]:
    text: dict[str, str] = {}
    if CARELOOP_MANIFEST.is_file():
        for row in json.loads(CARELOOP_MANIFEST.read_text(encoding="utf-8")):
            if isinstance(row, dict) and row.get("id") and row.get("sentence"):
                text[str(row["id"])] = str(row["sentence"])
    # Keep existing Neema packets' sentences too.
    for path in OUT.glob("*.json"):
        if path.name == "manifest.json":
            continue
        try:
            body = json.loads(path.read_text(encoding="utf-8"))
            if body.get("id") and body.get("sentence"):
                text[str(body["id"])] = str(body["sentence"])
        except Exception:  # noqa: BLE001
            continue
    return text


def members() -> list[tuple[str, int, int]]:
    found: list[tuple[str, int, int]] = []
    offset = 0
    while offset + 512 <= TAR_SIZE:
        header = fetch(offset, offset + 511)
        if header[0:4] == b"\0\0\0\0":
            break
        name = header[0:100].split(b"\0", 1)[0].decode("utf-8", "replace")
        size = int(header[124:136].split(b"\0", 1)[0].strip() or b"0", 8)
        data_at = offset + 512
        if name.endswith(".npz") and size:
            found.append((name, data_at, size))
        offset = data_at + ((size + 511) // 512) * 512
    return found


def packet(name: str, blob: bytes, text: dict[str, str]) -> dict | None:
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
    sentence = text.get(sample_id, "")
    return {
        "id": sample_id,
        "sentence": sentence,
        "sample_id": sample_id,
        "fps": fps,
        "source": f"How2Sign-MV3D {name}",
        "license": "CC BY-NC 4.0",
        "label": "ASL RESEARCH: How2Sign sentence. Not a patient message. Not Kenyan Sign Language. Not reviewed.",
        "citation": "Duarte et al. How2Sign. CVPR 2021. Motion: How2Sign-MV3D. CC BY-NC 4.0.",
        "frames": frames,
    }


def remember(rows: list[dict]) -> None:
    # Merge with existing packet files.
    by_id: dict[str, dict] = {}
    for path in OUT.glob("*.json"):
        if path.name in {"manifest.json", "_one.npz"}:
            continue
        try:
            body = json.loads(path.read_text(encoding="utf-8"))
            if body.get("id"):
                by_id[str(body["id"])] = {
                    "id": body["id"],
                    "sentence": body.get("sentence", ""),
                    "frames": len(body.get("frames", [])),
                }
        except Exception:  # noqa: BLE001
            continue
    for row in rows:
        by_id[row["id"]] = row
    ordered = sorted(by_id.values(), key=lambda r: (r.get("sentence") or r["id"]).lower())
    (OUT / "manifest.json").write_text(json.dumps(ordered), encoding="utf-8")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    text = sentence_map()
    print(f"sentence map: {len(text)} ids", flush=True)
    kept: list[dict] = []
    for name, data_at, size in members():
        body = packet(name, fetch(data_at, data_at + size - 1), text)
        if not body:
            print(f"skip long {name}", flush=True)
            continue
        (OUT / f"{body['id']}.json").write_text(json.dumps(body, separators=(",", ":")), encoding="utf-8")
        kept.append({"id": body["id"], "sentence": body["sentence"], "frames": len(body["frames"])})
        print(f"kept {body['id']} {len(body['frames'])}f {body['sentence']!r}", flush=True)
    remember(kept)
    print(f"done kept={len(kept)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
