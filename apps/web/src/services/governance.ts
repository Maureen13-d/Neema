/**
 * Persistence helpers for clinician sign-off, message review, and hardware QA reports.
 */

import {
  applyMessageReview,
  finishHardwareValidation,
  getMessageCatalog,
  getUnsignedTriageConfig,
  recordClinicianSignOff,
  recordHardwareCheck,
  startHardwareValidation,
  type HardwareCheckId,
  type HardwareCheckResult,
  type HardwareValidationReport,
  type MessageEntry,
  type MessageReviewStatus,
  type SignedTriageConfig,
} from '@neema/core';
import { db } from '../storage/db';

/** Saves a clinician/CHP supervisor attestation for the current triage config version. */
export async function saveClinicianSignOff(input: {
  reviewerName: string;
  reviewerRole: string;
  reviewedOn: string;
  notes?: string;
}): Promise<SignedTriageConfig> {
  const unsigned = getUnsignedTriageConfig();
  const signed = recordClinicianSignOff(unsigned, input);
  await db.signOff.put({
    id: 'triage',
    configVersion: signed.signOff.configVersion,
    reviewerName: signed.signOff.reviewerName,
    reviewerRole: signed.signOff.reviewerRole,
    reviewedOn: signed.signOff.reviewedOn,
    attestation: signed.signOff.attestation,
    signed: true,
    ...(signed.signOff.notes !== undefined ? { notes: signed.signOff.notes } : {}),
    savedAtMs: Date.now(),
  });
  return signed;
}

/** Seeds message review rows from the bundled catalog if empty. */
export async function ensureMessageReviewRows(): Promise<MessageEntry[]> {
  const existing = await db.messageReviews.count();
  const catalog = getMessageCatalog();
  if (existing === 0) {
    await db.messageReviews.bulkPut(
      catalog.map((e) => ({
        key: e.key,
        status: e.status,
        sw: e.sw,
        enGloss: e.enGloss,
      })),
    );
  }
  const rows = await db.messageReviews.toArray();
  return rows.map((r) => ({
    key: r.key,
    sw: r.sw,
    enGloss: r.enGloss,
    status: r.status,
    ...(r.reviewerName !== undefined ? { reviewerName: r.reviewerName } : {}),
    ...(r.reviewedOn !== undefined ? { reviewedOn: r.reviewedOn } : {}),
    ...(r.notes !== undefined ? { notes: r.notes } : {}),
  }));
}

/** Records a native-speaker / CHP review for one message key. */
export async function saveMessageReview(input: {
  key: string;
  status: Exclude<MessageReviewStatus, 'draft'>;
  reviewerName: string;
  reviewedOn: string;
  sw?: string;
  notes?: string;
}): Promise<MessageEntry[]> {
  const catalog = await ensureMessageReviewRows();
  const updated = applyMessageReview(catalog, input.key, input);
  const entry = updated.find((e) => e.key === input.key);
  if (!entry) throw new Error(`Unknown message key: ${input.key}`);
  await db.messageReviews.put({
    key: entry.key,
    status: entry.status,
    sw: entry.sw,
    enGloss: entry.enGloss,
    ...(entry.reviewerName !== undefined ? { reviewerName: entry.reviewerName } : {}),
    ...(entry.reviewedOn !== undefined ? { reviewedOn: entry.reviewedOn } : {}),
    ...(entry.notes !== undefined ? { notes: entry.notes } : {}),
  });
  return updated;
}

/** Starts and persists a hardware validation report shell. */
export async function beginHardwareReport(
  deviceLabel: string,
  operatorName: string,
): Promise<HardwareValidationReport> {
  const report = startHardwareValidation(deviceLabel, operatorName);
  await persistHardwareReport(report);
  return report;
}

export async function saveHardwareCheck(
  reportId: string,
  check: { id: HardwareCheckId; result: HardwareCheckResult; notes?: string },
): Promise<HardwareValidationReport> {
  const row = await db.hardwareReports.get(reportId);
  if (!row) throw new Error('Hardware report not found.');
  let report: HardwareValidationReport = {
    id: row.id,
    deviceLabel: row.deviceLabel,
    operatorName: row.operatorName,
    startedAtMs: row.startedAtMs,
    ...(row.finishedAtMs !== undefined ? { finishedAtMs: row.finishedAtMs } : {}),
    outcomes: JSON.parse(row.outcomesJson),
    engineeringPass: row.engineeringPass,
    disclaimer: row.disclaimer,
  };
  report = recordHardwareCheck(report, check);
  await persistHardwareReport(report);
  return report;
}

export async function completeHardwareReport(reportId: string): Promise<HardwareValidationReport> {
  const row = await db.hardwareReports.get(reportId);
  if (!row) throw new Error('Hardware report not found.');
  let report: HardwareValidationReport = {
    id: row.id,
    deviceLabel: row.deviceLabel,
    operatorName: row.operatorName,
    startedAtMs: row.startedAtMs,
    outcomes: JSON.parse(row.outcomesJson),
    engineeringPass: row.engineeringPass,
    disclaimer: row.disclaimer,
  };
  report = finishHardwareValidation(report);
  await persistHardwareReport(report);
  return report;
}

async function persistHardwareReport(report: HardwareValidationReport): Promise<void> {
  await db.hardwareReports.put({
    id: report.id,
    deviceLabel: report.deviceLabel,
    operatorName: report.operatorName,
    startedAtMs: report.startedAtMs,
    ...(report.finishedAtMs !== undefined ? { finishedAtMs: report.finishedAtMs } : {}),
    outcomesJson: JSON.stringify(report.outcomes),
    engineeringPass: report.engineeringPass,
    disclaimer: report.disclaimer,
  });
}
