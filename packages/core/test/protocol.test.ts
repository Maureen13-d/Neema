import { describe, expect, it } from 'vitest';
import {
  encodeBandCommand,
  encodeVitalsPacket,
  parseBandCommand,
  parseVitalsPacket,
} from '../src/protocol.js';

describe('protocol', () => {
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

  it('rejects bad magic', () => {
    expect(parseVitalsPacket(new Uint8Array(10), 0)).toBeNull();
  });

  it('round-trips band commands', () => {
    const cmds = [
      { kind: 'led' as const, color: 'red' as const },
      { kind: 'vibrate' as const, pattern: 'sos' as const },
      { kind: 'demo' as const, scenario: 3 as const },
    ];
    for (const cmd of cmds) {
      expect(parseBandCommand(encodeBandCommand(cmd))).toEqual(cmd);
    }
  });
});
