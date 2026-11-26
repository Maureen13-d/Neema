/**
 * Scripted band source with the same interface as Web Bluetooth.
 * Used for demos when hardware is noisy or unavailable.
 */

import { encodeVitalsPacket, parseVitalsPacket, type BandCommand, type VitalsSample } from '@neema/core';
import type { BandSource, VitalsListener } from './bandSource';

export type DemoScenario = 0 | 1 | 2 | 3;

/** Simulator extras that the real band does not have. */
export interface SimulatorBand extends BandSource {
  /** Holds the SOS flag on for a few seconds, like a 3 s long-press on the band. */
  pressSos(holdMs?: number): void;
  /** Commands the app sent, newest last (the simulator has no LEDs to look at). */
  commandLog(): BandCommand[];
}

/** True when a band source is the simulator. */
export function isSimulatorBand(band: BandSource): band is SimulatorBand {
  return band.id === 'simulator';
}

/**
 * Builds a simulator that emits one sample per second.
 * Scenarios: 0 idle/normal, 1 normal night, 2 warning drift, 3 fever+fast pulse.
 */
export function createSimulatorBand(initial: DemoScenario = 1): SimulatorBand {
  let connected = false;
  let scenario: DemoScenario = initial;
  let seq = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<VitalsListener>();
  let sos = false;
  let sosTimer: ReturnType<typeof setTimeout> | null = null;
  const log: BandCommand[] = [];

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
      log.push(command);
      if (log.length > 50) log.shift();
      if (command.kind === 'demo') scenario = command.scenario;
      // LED and vibrate are feedback TO the mother. They must never set the SOS flag,
      // or RED would re-trigger itself forever (vibrate 'sos' is just a pattern name).
    },
    pressSos(holdMs = 3000) {
      sos = true;
      if (sosTimer) clearTimeout(sosTimer);
      // Firmware clears SOS on release; the app's sticky RED keeps the alert active.
      sosTimer = setTimeout(() => {
        sos = false;
        sosTimer = null;
      }, holdMs);
      if (connected) emit();
    },
    commandLog() {
      return [...log];
    },
  };
}
