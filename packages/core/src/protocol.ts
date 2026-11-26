/**
 * Band ↔ phone BLE packet codec (Nov 2025 Cursor build brief).
 *
 * Notify packet (12 bytes, little-endian):
 *   0     version      always 1 (reject others)
 *   1     flags        bit0 hrValid, bit1 tempValid, bit2 sos, bit3 demo
 *   2-3   hr           uint16 bpm (ignore when hrValid is 0)
 *   4-5   temp         int16, °C × 100, RAW (calibration applied in the app)
 *   6-7   seq          uint16, wraps at 65535
 *   8     battery      0–100, 255 = unknown
 *   9     signal       0–100
 *   10-11 reserved     send 0
 *
 * Command packet (2 bytes):
 *   0  id   0x01 led / 0x02 vibrate / 0x03 demo
 *   1  arg  led: 0 off / 1 green / 2 yellow / 3 red
 *           vibrate: 1 short / 2 long / 3 sos
 *           demo: 0..3 scenario
 */

import type { BandCommand, VitalsSample } from './types.js';

/** BLE service and characteristic UUIDs shared with firmware. */
export const NEEMA_BLE = {
  serviceUuid: '7a1c0001-5e3b-4f6d-9a21-8c4e2f1b0d00',
  vitalsCharUuid: '7a1c0002-5e3b-4f6d-9a21-8c4e2f1b0d00',
  commandCharUuid: '7a1c0003-5e3b-4f6d-9a21-8c4e2f1b0d00',
  /** Web Bluetooth / advertising name prefix. */
  namePrefix: 'Neema-',
} as const;

const VERSION = 0x01;
const PACKET_LEN = 12;
const CMD_LEN = 2;

const FLAG_HR_VALID = 1 << 0;
const FLAG_TEMP_VALID = 1 << 1;
const FLAG_SOS = 1 << 2;
const FLAG_DEMO = 1 << 3;

/**
 * Decode one 12-byte vitals packet.
 * Returns null for malformed packets (never throws).
 * Alias: decodeVitals (brief name).
 */
export function parseVitalsPacket(bytes: Uint8Array, receivedAtMs: number): VitalsSample | null {
  if (bytes.length < PACKET_LEN) return null;
  if (bytes[0] !== VERSION) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const flags = bytes[1] ?? 0;
  const hr = view.getUint16(2, true);
  const tempRaw = view.getInt16(4, true);
  const seq = view.getUint16(6, true);
  const battery = bytes[8] ?? 255;
  const signalQuality = Math.min(100, bytes[9] ?? 0);
  const hrValid = (flags & FLAG_HR_VALID) !== 0;
  const tempValid = (flags & FLAG_TEMP_VALID) !== 0;

  return {
    seq,
    tsMs: receivedAtMs,
    heartRate: hrValid && hr >= 30 && hr <= 220 ? hr : null,
    skinTempC: tempValid && tempRaw > 2000 && tempRaw < 4500 ? tempRaw / 100 : null,
    signalQuality,
    batteryPct: battery === 255 ? null : battery,
    sos: (flags & FLAG_SOS) !== 0,
    demo: (flags & FLAG_DEMO) !== 0,
  };
}

/** Brief name for parseVitalsPacket. */
export const decodeVitals = parseVitalsPacket;

/** Encodes a VitalsSample into the 12-byte notify packet (used by the simulator). */
export function encodeVitalsPacket(sample: Omit<VitalsSample, 'tsMs'>): Uint8Array {
  const out = new Uint8Array(PACKET_LEN);
  const view = new DataView(out.buffer);
  out[0] = VERSION;

  let flags = 0;
  if (sample.heartRate !== null) {
    flags |= FLAG_HR_VALID;
    view.setUint16(2, Math.max(0, Math.min(220, Math.round(sample.heartRate))), true);
  }
  if (sample.skinTempC !== null) {
    flags |= FLAG_TEMP_VALID;
    view.setInt16(4, Math.round(sample.skinTempC * 100), true);
  }
  if (sample.sos) flags |= FLAG_SOS;
  if (sample.demo) flags |= FLAG_DEMO;
  out[1] = flags;

  view.setUint16(6, sample.seq & 0xffff, true);
  out[8] =
    sample.batteryPct === null
      ? 255
      : Math.max(0, Math.min(100, Math.round(sample.batteryPct)));
  out[9] = Math.max(0, Math.min(100, Math.round(sample.signalQuality)));
  // bytes 10-11 reserved
  return out;
}

/** Encodes a BandCommand into the 2-byte write payload. */
export function encodeBandCommand(command: BandCommand): Uint8Array {
  const out = new Uint8Array(CMD_LEN);
  switch (command.kind) {
    case 'led': {
      out[0] = 0x01;
      const map = { off: 0, green: 1, yellow: 2, red: 3 } as const;
      out[1] = map[command.color];
      break;
    }
    case 'vibrate': {
      out[0] = 0x02;
      const map = { short: 1, long: 2, sos: 3 } as const;
      out[1] = map[command.pattern];
      break;
    }
    case 'demo': {
      out[0] = 0x03;
      out[1] = command.scenario;
      break;
    }
  }
  return out;
}

/** Parses a command packet (firmware side / tests). Returns null if invalid. */
export function parseBandCommand(bytes: Uint8Array): BandCommand | null {
  if (bytes.length < CMD_LEN) return null;
  const id = bytes[0];
  const arg = bytes[1] ?? 0;
  if (id === 0x01) {
    const colors = ['off', 'green', 'yellow', 'red'] as const;
    const color = colors[arg];
    return color ? { kind: 'led', color } : null;
  }
  if (id === 0x02) {
    if (arg === 1) return { kind: 'vibrate', pattern: 'short' };
    if (arg === 2) return { kind: 'vibrate', pattern: 'long' };
    if (arg === 3) return { kind: 'vibrate', pattern: 'sos' };
    return null;
  }
  if (id === 0x03 && arg >= 0 && arg <= 3) {
    return { kind: 'demo', scenario: arg as 0 | 1 | 2 | 3 };
  }
  return null;
}
