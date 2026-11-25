/**
 * Scripted band source with the same interface as Web Bluetooth.
 * Used for demos when hardware is noisy or unavailable.
 */

import { encodeVitalsPacket, parseVitalsPacket, type BandCommand, type VitalsSample } from '@neema/core';
import type { BandSource, VitalsListener } from './bandSource';

export type DemoScenario = 0 | 1 | 2 | 3;

/**
 * Builds a simulator that emits one sample per second.
 * Scenarios: 0 idle/normal, 1 normal night, 2 warning drift, 3 fever+fast pulse.
 */
export function createSimulatorBand(initial: DemoScenario = 1): BandSource {
  let connected = false;
  let scenario: DemoScenario = initial;
  let seq = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<VitalsListener>();
  let sos = false;

  function emit() {
    const t = Math.floor(Date.now() / 1000);
    let heartRate = 72;
    let skinTempC = 36.5;
    switch (scenario) {
      case 1:
        heartRate = 72 + (t % 5);
        skinTempC = 36.5 + ((t % 3) * 0.05);
        break;
      case 2:
        heartRate = 88 + (t % 6);
        skinTempC = 37.2 + ((t % 4) * 0.05);
        break;
      case 3:
        heartRate = 116 + (t % 5);
        skinTempC = 38.3 + ((t % 3) * 0.05);
        break;
      default:
        break;
    }

    const sample: Omit<VitalsSample, 'tsMs'> = {
      seq: seq++ & 0xffff,
      heartRate,
      skinTempC,
      signalQuality: 95,
      batteryPct: 90,
      sos,
      demo: true,
    };
    // Round-trip through the real codec so simulator bugs match firmware bugs.
    const parsed = parseVitalsPacket(encodeVitalsPacket(sample), Date.now());
    if (!parsed) return;
    for (const listener of listeners) listener(parsed);
  }

  return {
    id: 'simulator',
    async connect() {
      if (connected) return;
      connected = true;
      timer = setInterval(emit, 1000);
      emit();
    },
    async disconnect() {
      connected = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
    isConnected() {
      return connected;
    },
    onVitals(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async sendCommand(command: BandCommand) {
      if (command.kind === 'demo') scenario = command.scenario;
      if (command.kind === 'led') {
        // no-op visually in simulator; harness shows command log
      }
      if (command.kind === 'vibrate' && command.pattern === 'sos') sos = true;
    },
  };
}
