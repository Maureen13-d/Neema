/**
 * Contact book helpers for CHP / family / supervisor escalation.
 */

import type { AlertRecord, Contact } from '@neema/core';
import { db } from '../storage/db';

/** Upserts a contact. */
export async function saveContact(contact: Contact): Promise<void> {
  await db.contacts.put(contact);
}

export async function listContacts(): Promise<Contact[]> {
  return db.contacts.orderBy('escalationOrder').toArray();
}

export async function deleteContact(id: string): Promise<void> {
  await db.contacts.delete(id);
}

/** Contacts sorted for SMS escalation (CHP/family first, supervisor last by order). */
export async function contactsForEscalation(): Promise<Contact[]> {
  return listContacts();
}

/** Records the human outcome of an alert (impact metrics). */
export async function setAlertOutcome(
  alertId: string,
  outcome: NonNullable<AlertRecord['outcome']>,
): Promise<void> {
  const row = await db.alerts.get(alertId);
  if (!row) return;
  await db.alerts.put({ ...row, outcome });
}
