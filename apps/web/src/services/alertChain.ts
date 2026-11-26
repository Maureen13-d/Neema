/**
 * Automatic alert chain for YELLOW/RED transitions.
 * Speaks the action, prepares sms: links, starts escalation on RED.
 * Web cannot silent-send SMS — returns hrefs the UI must open.
 */

import type { Contact, TriageResult } from '@neema/core';
import { raiseAlert, type RaiseAlertOptions } from './alerts';
import { listContacts, saveContact } from './contacts';
import { startEscalation, type EscalationHandle } from './escalation';
import { LocationError, requestAlertLocation } from './location';
import { speakMessageKey } from './speech';
import { ensureFollowUp } from './followUp';
import { loadProfile } from './passport';

export interface AlertChainResult {
  alertId: string;
  level: 'YELLOW' | 'RED';
  smsLinks: { contact: Contact; href: string }[];
  primarySmsHref: string | null;
  spoken: boolean;
  locationAttached: boolean;
  escalation: EscalationHandle | null;
}

async function ensureContacts(): Promise<Contact[]> {
  let contacts = await listContacts();
  if (contacts.length > 0) return contacts;
  const demo: Contact = {
    id: 'demo-chp',
    name: 'CHP',
    role: 'chp',
    phone: '+254700000000',
    escalationOrder: 1,
  };
  await saveContact(demo);
  contacts = [demo];
  const family: Contact = {
    id: 'demo-family',
    name: 'Family',
    role: 'family',
    phone: '+254711111111',
    escalationOrder: 2,
  };
  await saveContact(family);
  const supervisor: Contact = {
    id: 'demo-sup',
    name: 'Supervisor',
    role: 'supervisor',
    phone: '+254722222222',
    escalationOrder: 3,
  };
  await saveContact(supervisor);
  return listContacts();
}

/**
 * Runs the product alert chain for a new YELLOW or RED result.
 * Idempotent callers should only invoke on level transitions.
 */
export async function runAlertChain(
  result: TriageResult,
  options: RaiseAlertOptions = { allowDemo: true, skipConsent: true },
): Promise<AlertChainResult | null> {
  if (result.level !== 'YELLOW' && result.level !== 'RED') return null;

  const spokenResult = await speakMessageKey(result.messageKey);
  let locationUrl: string | undefined;
  let locationAttached = false;
  if (result.level === 'RED') {
    try {
      locationUrl = (await requestAlertLocation()).mapsUrl;
      locationAttached = true;
    } catch (err) {
      if (!(err instanceof LocationError)) throw err;
    }
  }

  const profile = await loadProfile().catch(() => null);
  const contacts = await ensureContacts();
  const { alert, smsLinks } = await raiseAlert(
    {
      level: result.level,
      firedRules: result.firedRules,
      motherName: profile?.displayName ?? 'Mama',
      reasons: result.reasons,
      ...(locationUrl ? { locationUrl } : {}),
    },
    contacts,
    options,
  );

  const escalation =
    result.level === 'RED' ? startEscalation(alert.id, contacts) : null;

  // Open a CareLoop-style chase loop for every YELLOW/RED alert.
  await ensureFollowUp(alert.id);

  return {
    alertId: alert.id,
    level: result.level,
    smsLinks,
    primarySmsHref: smsLinks[0]?.href ?? null,
    spoken: spokenResult !== 'text-only',
    locationAttached,
    escalation,
  };
}
