/**
 * Local Mama Passport store (Dexie / IndexedDB).
 * Per-second vitals are never persisted — only minute aggregates (7-day retention).
 */

import Dexie, { type Table } from 'dexie';
import type {
  AlertRecord,
  BpReading,
  Contact,
  SymptomReport,
  VitalsMinute,
} from '@neema/core';

export interface ProfileRow {
  id: string;
  /** Encrypted JSON blob when a PIN is set; otherwise plaintext JSON. */
  payload: string;
  encrypted: boolean;
  saltB64?: string;
  updatedAtMs: number;
}

export interface ConsentRow {
  id: string;
  version: string;
  language: string;
  agreedAtMs: number;
  sharing: { chp: boolean; family: boolean; nurse: boolean };
}

export interface BaselineRow {
  id: string; // 'hr' | 'temp'
  mean: number;
  variance: number;
  samples: number;
  lastUpdatedMs: number;
  ready: boolean;
}

export class NeemaDb extends Dexie {
  profile!: Table<ProfileRow, string>;
  vitalsMinutes!: Table<VitalsMinute, number>;
  bp!: Table<BpReading, string>;
  symptoms!: Table<SymptomReport, string>;
  alerts!: Table<AlertRecord, string>;
  contacts!: Table<Contact, string>;
  consent!: Table<ConsentRow, string>;
  baseline!: Table<BaselineRow, string>;

  constructor() {
    super('neema-mama-passport');
    this.version(1).stores({
      profile: 'id',
      vitalsMinutes: 'tsMs',
      bp: 'id, tsMs',
      symptoms: 'id, tsMs',
      alerts: 'id, tsMs',
      contacts: 'id, escalationOrder',
      consent: 'id',
      baseline: 'id',
    });
  }
}

export const db = new NeemaDb();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes minute vitals older than 7 days.
 * Alerts / BP / symptoms are kept for the life of the profile unless deleted by the mother.
 */
export async function enforceVitalsRetention(nowMs: number = Date.now()): Promise<number> {
  const cutoff = nowMs - SEVEN_DAYS_MS;
  return db.vitalsMinutes.where('tsMs').below(cutoff).delete();
}
