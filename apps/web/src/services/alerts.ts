/**
 * Alert service: builds prefilled SMS links and tracks acknowledgment.
 * RED stays sticky until acknowledgeRed() is called.
 * Privacy: only status, top reason, and a location link leave the phone.
 */

import type { AlertRecord, Contact, RuleId, TriageLevel } from '@neema/core';
import { db } from '../storage/db';

export interface AlertDraft {
  level: Exclude<TriageLevel, 'GREEN' | 'UNKNOWN'>;
  firedRules: RuleId[];
  motherName: string;
  reasonCode: string;
  /** Optional maps link; ASSUMPTION: caller supplies after geolocation consent. */
  locationUrl?: string;
}

/** Builds a short alert body. Swahili wording still needs native review. */
export function buildAlertSmsBody(draft: AlertDraft): string {
  const place = draft.locationUrl ?? '(mahali hakijulikani)';
  return `NEEMA: Mama ${draft.motherName} yuko ${draft.level}. Sababu: ${draft.reasonCode}. Mahali: ${place}. Tafadhali mfikie sasa.`;
}

/** Builds an sms: URI for the prototype (user taps send). */
export function buildSmsLink(phone: string, body: string): string {
  const normalized = phone.replace(/\s+/g, '');
  return `sms:${normalized}?&body=${encodeURIComponent(body)}`;
}

/** Persists a new alert and returns SMS links for contacts in escalation order. */
export async function raiseAlert(
  draft: AlertDraft,
  contacts: Contact[],
): Promise<{ alert: AlertRecord; smsLinks: { contact: Contact; href: string }[] }> {
  const body = buildAlertSmsBody(draft);
  const ordered = [...contacts].sort((a, b) => a.escalationOrder - b.escalationOrder);
  const now = Date.now();
  const alert: AlertRecord = {
    id: crypto.randomUUID(),
    tsMs: now,
    level: draft.level,
    firedRules: draft.firedRules,
    notified: [],
  };
  await db.alerts.put(alert);
  return {
    alert,
    smsLinks: ordered.map((contact) => ({
      contact,
      href: buildSmsLink(contact.phone, body),
    })),
  };
}

/** Marks the latest RED alert as acknowledged so triage can leave RED. */
export async function acknowledgeRed(alertId: string, atMs: number = Date.now()): Promise<void> {
  const row = await db.alerts.get(alertId);
  if (!row) return;
  await db.alerts.put({ ...row, acknowledgedAtMs: atMs });
}

/** Records that an sms: link was opened for a contact. */
export async function markNotified(alertId: string, contactId: string, atMs: number = Date.now()): Promise<void> {
  const row = await db.alerts.get(alertId);
  if (!row) return;
  await db.alerts.put({
    ...row,
    notified: [...row.notified, { contactId, method: 'sms_link', atMs }],
  });
}
