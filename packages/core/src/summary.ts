/**
 * Builds a one-page nurse summary payload for QR / on-screen handover.
 * Decision support only — no diagnosis wording.
 */

import type {
  AlertRecord,
  BpReading,
  Stage,
  SymptomReport,
  TriageLevel,
  VitalsMinute,
} from './types.js';

/** Fields the mother can choose to share at a visit. */
export interface SummaryShareChoices {
  includeBpTrend: boolean;
  includeAlerts: boolean;
  includeSymptoms: boolean;
  includeDueDate: boolean;
}

export interface NurseSummaryInput {
  displayName: string;
  stage: Stage;
  /** ISO date string YYYY-MM-DD when known. */
  expectedDeliveryDate?: string;
  gestationWeeks?: number;
  bp: BpReading[];
  symptoms: SymptomReport[];
  alerts: AlertRecord[];
  recentVitals: VitalsMinute[];
  latestLevel: TriageLevel;
  share: SummaryShareChoices;
  generatedAtMs: number;
}

export interface NurseSummary {
  title: string;
  generatedAtMs: number;
  mother: string;
  stage: Stage;
  expectedDeliveryDate?: string;
  gestationWeeks?: number;
  latestLevel: TriageLevel;
  bpTrend: Array<{ tsMs: number; systolic: number; diastolic: number }>;
  recentAlerts: Array<{ tsMs: number; level: string; rules: string[] }>;
  recentSymptoms: Array<{ tsMs: number; codes: string[] }>;
  questionsToAsk: string[];
  /** Compact JSON string suitable for QR encoding. */
  qrPayload: string;
}

const DEFAULT_QUESTIONS = [
  'Any severe headache, blurred vision, or upper abdominal pain?',
  'Any heavy bleeding or reduced baby movement?',
  'Clinic blood pressure and urine protein today?',
];

/**
 * Builds the nurse one-page summary honouring the mother's share choices.
 * TODO(clinician): replace default questions with approved visit prompts.
 */
export function buildNurseSummary(input: NurseSummaryInput): NurseSummary {
  const bpTrend = input.share.includeBpTrend
    ? input.bp.slice(-8).map((b) => ({
        tsMs: b.tsMs,
        systolic: b.systolic,
        diastolic: b.diastolic,
      }))
    : [];

  const recentAlerts = input.share.includeAlerts
    ? input.alerts.slice(-5).map((a) => ({
        tsMs: a.tsMs,
        level: a.level,
        rules: a.firedRules,
      }))
    : [];

  const recentSymptoms = input.share.includeSymptoms
    ? input.symptoms.slice(-5).map((s) => ({
        tsMs: s.tsMs,
        codes: s.codes,
      }))
    : [];

  const summary: NurseSummary = {
    title: 'Neema visit summary',
    generatedAtMs: input.generatedAtMs,
    mother: input.displayName,
    stage: input.stage,
    latestLevel: input.latestLevel,
    bpTrend,
    recentAlerts,
    recentSymptoms,
    questionsToAsk: DEFAULT_QUESTIONS,
    qrPayload: '',
  };

  if (input.share.includeDueDate && input.expectedDeliveryDate) {
    summary.expectedDeliveryDate = input.expectedDeliveryDate;
  }
  if (input.share.includeDueDate && input.gestationWeeks !== undefined) {
    summary.gestationWeeks = input.gestationWeeks;
  }

  summary.qrPayload = JSON.stringify({
    v: 1,
    mother: summary.mother,
    stage: summary.stage,
    level: summary.latestLevel,
    edd: summary.expectedDeliveryDate ?? null,
    bp: bpTrend,
    alerts: recentAlerts,
    symptoms: recentSymptoms,
  });

  return summary;
}
