/**
 * Mama Passport profile save/load.
 * Sensitive fields are encrypted at rest when a PIN is provided.
 */

import type { Stage } from '@neema/core';
import { decryptString, deriveKeyFromPin, encryptString } from '../storage/crypto';
import { db, type ConsentRow, type ProfileRow } from '../storage/db';

const PROFILE_ID = 'primary';

/** Plain profile fields stored on-device. */
export interface MamaProfile {
  displayName: string;
  /** Optional age band or ISO birth date string. */
  ageOrDob?: string;
  language: 'sw' | 'en' | 'sheng';
  phoneForAlerts?: string;
  stage: Stage;
  expectedDeliveryDate?: string;
  gestationWeeks?: number;
  previousPregnancies?: number;
  pastComplications?: string[];
  medications?: string[];
  allergies?: string[];
  discreetMode?: boolean;
}

export interface SaveProfileOptions {
  /** When set, payload is encrypted with a PIN-derived key. */
  pin?: string;
  nowMs?: number;
}

/** Saves the profile; encrypts when a PIN is supplied. */
export async function saveProfile(profile: MamaProfile, options: SaveProfileOptions = {}): Promise<ProfileRow> {
  const nowMs = options.nowMs ?? Date.now();
  const json = JSON.stringify(profile);

  if (options.pin) {
    const existing = await db.profile.get(PROFILE_ID);
    const material = await deriveKeyFromPin(options.pin, existing?.saltB64);
    const payload = await encryptString(material.key, json);
    const row: ProfileRow = {
      id: PROFILE_ID,
      payload,
      encrypted: true,
      saltB64: material.saltB64,
      updatedAtMs: nowMs,
    };
    await db.profile.put(row);
    return row;
  }

  const row: ProfileRow = {
    id: PROFILE_ID,
    payload: json,
    encrypted: false,
    updatedAtMs: nowMs,
  };
  await db.profile.put(row);
  return row;
}

/**
 * Loads and decrypts the profile.
 * Throws if encrypted and PIN is missing/wrong.
 */
export async function loadProfile(pin?: string): Promise<MamaProfile | null> {
  const row = await db.profile.get(PROFILE_ID);
  if (!row) return null;

  if (!row.encrypted) {
    return JSON.parse(row.payload) as MamaProfile;
  }
  if (!pin) throw new Error('PIN required to unlock Mama Passport.');
  if (!row.saltB64) throw new Error('Encrypted profile is missing salt.');

  const material = await deriveKeyFromPin(pin, row.saltB64);
  try {
    const json = await decryptString(material.key, row.payload);
    return JSON.parse(json) as MamaProfile;
  } catch {
    throw new Error('Incorrect PIN or corrupted profile.');
  }
}

/** Deletes the local profile row (mother-initiated). */
export async function deleteProfile(): Promise<void> {
  await db.profile.delete(PROFILE_ID);
}

/** Records explicit sharing consent (Swahili/English versioned text lives in UI). */
export async function saveConsent(consent: Omit<ConsentRow, 'id'>): Promise<ConsentRow> {
  const row: ConsentRow = { id: 'latest', ...consent };
  await db.consent.put(row);
  return row;
}

export async function loadConsent(): Promise<ConsentRow | null> {
  return (await db.consent.get('latest')) ?? null;
}
