/**
 * Shared interface for the real Web Bluetooth band and the scripted simulator.
 * The rest of the app depends only on this contract.
 */

import type { BandCommand, VitalsSample } from '@neema/core';

export type VitalsListener = (sample: VitalsSample) => void;

export interface BandSource {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onVitals(listener: VitalsListener): () => void;
  sendCommand(command: BandCommand): Promise<void>;
}
