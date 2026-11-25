/**
 * Band ↔ phone BLE packet codec.
 *
 * ASSUMPTION: The backend PDF cut off before the exact byte layout, so this
 * layout is the contract we implement in firmware and the app. Change both
 * sides together if clinicians or hardware force a revision.
 *
 * Notify packet (10 bytes, little-endian):
 *   0  magic        0x4E ('N')
 *   1  version      0x01
 *   2  seq          uint16
 *   4  flags        bit0 sos, bit1 demo, bit2 hrValid, bit3 tempValid, bit4 battValid
 *   5  heartRate    uint8 bpm (ignored unless hrValid)
 *   6  skinTempC    int16, centi-degrees C (raw skin, ignored unless tempValid)
 *   8  signalQuality uint8 0..100
 *   9  batteryPct   uint8 0..100, or 0xFF when unknown
 *
 * Command packet (3 bytes):
 *   0  magic 0x4E
 *   1  kind  1=led, 2=vibrate, 3=demo
 *   2  arg   led: 0 off / 1 green / 2 yellow / 3 red
 *            vibrate: 1 short / 2 long / 3 sos
 *            demo: 0..3 scenario
 */

import type { BandCommand, VitalsSample } from './types.js';

/** BLE service and characteristic UUIDs shared with firmware. */
export const NEEMA_BLE = {
  serviceUuid: '6e65656d-6100-1000-8000-00805f9b34fb',
  vitalsCharUuid: '6e65656d-6101-1000-8000-00805f9b34fb',
  commandCharUuid: '6e65656d-6102-1000-8000-00805f9b34fb',
} as const;

const MAGIC = 0x4e;
const VERSION = 0x01;
const PACKET_LEN = 10;
const CMD_LEN = 3;

const FLAG_SOS = 1 << 0;
const FLAG_DEMO = 1 << 1;
const FLAG_HR_VALID = 1 << 2;
const FLAG_TEMP_VALID = 1 << 3;
const FLAG_BATT_VALID = 1 << 4;

/**
 * Parses a BLE notify payload into a VitalsSample.
 * Returns null when magic/version/length are wrong so the pipeline can drop bad frames.
 */
export function parseVitalsPacket(bytes: Uint8Array, receivedAtMs: number): VitalsSample | null {
  if (bytes.length < PACKET_LEN) return null;
  if (bytes[0] !== MAGIC || bytes[1] !== VERSION) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const seq = view.getUint16(2, true);
  const flags = bytes[4] ?? 0;
  const hrRaw = bytes[5] ?? 0;
  const tempCenti = view.getInt16(6, true);
  const signalQuality = Math.min(100, bytes[8] ?? 0);
  const battRaw = bytes[9] ?? 0xff;

  return {
    seq,
    tsMs: receivedAtMs,
    heartRate: flags & FLAG_HR_VALID ? hrRaw : null,
    skinTempC: flags & FLAG_TEMP_VALID ? tempCenti / 100 : null,
    signalQuality,
    batteryPct: flags & FLAG_BATT_VALID && battRaw !== 0xff ? battRaw : null,
    sos: Boolean(flags & FLAG_SOS),
    demo: Boolean(flags & FLAG_DEMO),
  };
}

/** Encodes a VitalsSample into the 10-byte notify packet (used by the simulator). */
export function encodeVitalsPacket(sample: Omit<VitalsSample, 'tsMs'>): Uint8Array {
  const out = new Uint8Array(PACKET_LEN);
  const view = new DataView(out.buffer);
  out[0] = MAGIC;
  out[1] = VERSION;
  view.setUint16(2, sample.seq & 0xffff, true);

  let flags = 0;
  if (sample.sos) flags |= FLAG_SOS;
  if (sample.demo) flags |= FLAG_DEMO;
  if (sample.heartRate !== null) {
    flags |= FLAG_HR_VALID;
    out[5] = Math.max(0, Math.min(255, Math.round(sample.heartRate)));
  }
  if (sample.skinTempC !== null) {
    flags |= FLAG_TEMP_VALID;
    view.setInt16(6, Math.round(sample.skinTempC * 100), true);
  }
  if (sample.batteryPct !== null) {
    flags |= FLAG_BATT_VALID;
    out[9] = Math.max(0, Math.min(100, Math.round(sample.batteryPct)));
  } else {
    out[9] = 0xff;
  }
  out[4] = flags;
  out[8] = Math.max(0, Math.min(100, Math.round(sample.signalQuality)));
  return out;
}

/** Encodes a BandCommand into the 3-byte write payload. */
export function encodeBandCommand(command: BandCommand): Uint8Array {
  const out = new Uint8Array(CMD_LEN);
  out[0] = MAGIC;
  switch (command.kind) {
    case 'led': {
      out[1] = 1;
      const map = { off: 0, green: 1, yellow: 2, red: 3 } as const;
      out[2] = map[command.color];
      break;
    }
    case 'vibrate': {
      out[1] = 2;
      const map = { short: 1, long: 2, sos: 3 } as const;
      out[2] = map[command.pattern];
      break;
    }
    case 'demo': {
      out[1] = 3;
      out[2] = command.scenario;
      break;
    }
  }
  return out;
}

/** Parses a command packet (firmware side / tests). Returns null if invalid. */
export function parseBandCommand(bytes: Uint8Array): BandCommand | null {
  if (bytes.length < CMD_LEN || bytes[0] !== MAGIC) return null;
  const kind = bytes[1];
  const arg = bytes[2] ?? 0;
  if (kind === 1) {
    const colors = ['off', 'green', 'yellow', 'red'] as const;
    const color = colors[arg];
    return color ? { kind: 'led', color } : null;
  }
  if (kind === 2) {
    if (arg === 1) return { kind: 'vibrate', pattern: 'short' };
    if (arg === 2) return { kind: 'vibrate', pattern: 'long' };
    if (arg === 3) return { kind: 'vibrate', pattern: 'sos' };
    return null;
  }
  if (kind === 3 && arg >= 0 && arg <= 3) {
    return { kind: 'demo', scenario: arg as 0 | 1 | 2 | 3 };
  }
  return null;
}
