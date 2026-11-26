import { describe, expect, it } from 'vitest';
import {
  encodeBandCommand,
  encodeVitalsPacket,
  parseBandCommand,
  parseVitalsPacket,
} from '../src/protocol.js';

describe('protocol (12-byte brief layout)', () => {
  it('round-trips a vitals packet', () => {
    const encoded = encodeVitalsPacket({
      seq: 42,
      heartRate: 78,
      skinTempC: 36.55,
      signalQuality: 90,
      batteryPct: 80,
      sos: false,
      demo: true,
    });
    expect(encoded.length).toBe(12);
    expect(encoded[0]).toBe(1);
    const parsed = parseVitalsPacket(encoded, 1_000);
    expect(parsed).toMatchObject({
      seq: 42,
      heartRate: 78,
      skinTempC: 36.55,
      signalQuality: 90,
      batteryPct: 80,
      sos: false,
      demo: true,
      tsMs: 1_000,
    });
  });

  it('marks missing hr/temp as null', () => {
    const encoded = encodeVitalsPacket({
      seq: 1,
      heartRate: null,
      skinTempC: null,
      signalQuality: 10,
      batteryPct: null,
      sos: true,
      demo: false,
    });
    const parsed = parseVitalsPacket(encoded, 2_000);
    expect(parsed?.heartRate).toBeNull();
    expect(parsed?.skinTempC).toBeNull();
    expect(parsed?.batteryPct).toBeNull();
    expect(parsed?.sos).toBe(true);
  });

  it('rejects short packets and wrong version', () => {
    expect(parseVitalsPacket(new Uint8Array(11), 0)).toBeNull();
    const bad = encodeVitalsPacket({
      seq: 1,
      heartRate: 70,
      skinTempC: 36.5,
      signalQuality: 80,
      batteryPct: 50,
      sos: false,
      demo: false,
    });
    bad[0] = 2;
    expect(parseVitalsPacket(bad, 0)).toBeNull();
  });

  it('nulls out physically impossible HR', () => {
    const encoded = encodeVitalsPacket({
      seq: 1,
      heartRate: 400,
      skinTempC: 36.5,
      signalQuality: 80,
      batteryPct: 50,
      sos: false,
      demo: false,
    });
    // Encoder clamps to 220; craft a raw 400 bpm packet instead.
    const view = new DataView(encoded.buffer);
    encoded[1] = 0b0011; // hr+temp valid
    view.setUint16(2, 400, true);
    const parsed = parseVitalsPacket(encoded, 0);
    expect(parsed?.heartRate).toBeNull();
  });

  it('round-trips 2-byte band commands', () => {
    const cmds = [
      { kind: 'led' as const, color: 'red' as const },
      { kind: 'vibrate' as const, pattern: 'sos' as const },
      { kind: 'demo' as const, scenario: 3 as const },
    ];
    for (const cmd of cmds) {
      const bytes = encodeBandCommand(cmd);
      expect(bytes.length).toBe(2);
      expect(parseBandCommand(bytes)).toEqual(cmd);
    }
  });
});
