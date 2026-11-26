/**
 * Deterministic GREEN / YELLOW / RED / UNKNOWN triage.
 * Rules decide the level. Baseline z-scores may only escalate to YELLOW.
 * No diagnosis wording — action keys only.
 */

import triageConfig from './config/triage.config.json';
import type {
  BpReading,
  RuleId,
  SymptomCode,
  SymptomReport,
  TriageInput,
  TriageLevel,
  TriageResult,
  VitalsMinute,
} from './types.js';

/** Shape of triage.config.json (placeholders pending clinician review). */
export interface TriageConfig {
  version: string;
  notes: string;
  severeBp: { systolic: number; diastolic: number };
  raisedBp: { systolic: number; diastolic: number };
  feverTempC: number;
  feverConfirmMinutes: number;
  postpartumFastPulseBpm: number;
  postpartumFastPulseMinutes: number;
  baselineHrZThreshold: number;
  baselineHrMinutes: number;
  yellowRecheckMinutes: number;
  bpRecheckWindowMinutes: number;
  reducedMovementMinGestationWeeks: number;
  sleepWindow: { startHour: number; endHour: number };
  tempCalibrationOffsetC: number;
  warningBpSymptoms: SymptomCode[];
  /** Latest band minute older than this counts as stale (UNKNOWN, never GREEN). */
  vitalsStaleMinutes: number;
}

const DEFAULT_CONFIG = triageConfig as TriageConfig;

const LEVEL_RANK: Record<TriageLevel, number> = {
  UNKNOWN: 0,
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
};

interface PartialHit {
  level: TriageLevel;
  rule: RuleId;
  reason: string;
  messageKey: string;
  recheckInMinutes?: number;
}

/**
 * Evaluates triage from a pure input object.
 * Safety: UNKNOWN never becomes GREEN; ML/baseline can only raise to YELLOW.
 */
export function evaluateTriage(
  input: TriageInput,
  config: TriageConfig = DEFAULT_CONFIG,
): TriageResult {
  const hits: PartialHit[] = [];

  // R9 SOS — immediate RED
  if (input.sosActive) {
    hits.push({
      level: 'RED',
      rule: 'R9_SOS',
      reason: 'sos',
      messageKey: 'red_sos',
    });
  }

  // R11 invalid / missing vitals when we have no usable BP/symptoms path either
  const latest = latestMinute(input.vitals);
  const vitalsStaleOrMissing =
    !latest ||
    latest.validFraction < 0.2 ||
    (latest.hrMean === null && latest.tempMeanC === null) ||
    input.nowMs - latest.tsMs > config.vitalsStaleMinutes * 60_000;

  const latestBp = latestReading(input.bp);
  const recentSymptoms = flattenCodes(input.symptoms);

  if (vitalsStaleOrMissing && !latestBp && recentSymptoms.length === 0 && !input.sosActive) {
    return resultOf(
      [
        {
          level: 'UNKNOWN',
          rule: 'R11_SIGNAL_INVALID',
          reason: 'signal_invalid',
          messageKey: 'unknown_check_band',
        },
      ],
      input.nowMs,
      config.version,
    );
  }

  // Blood pressure rules R1–R4
  if (latestBp) {
    if (
      latestBp.systolic >= config.severeBp.systolic ||
      latestBp.diastolic >= config.severeBp.diastolic
    ) {
      hits.push({
        level: 'RED',
        rule: 'R1_SEVERE_BP',
        reason: 'bp_severe',
        messageKey: 'red_go_now',
      });
    } else if (
      latestBp.systolic >= config.raisedBp.systolic ||
      latestBp.diastolic >= config.raisedBp.diastolic
    ) {
      const warningSymptom = config.warningBpSymptoms.some((c) => recentSymptoms.includes(c));
      if (warningSymptom) {
        hits.push({
          level: 'RED',
          rule: 'R3_RAISED_BP_WITH_SYMPTOM',
          reason: 'bp_raised_with_symptom',
          messageKey: 'red_go_now',
        });
      } else if (raisedBpPersists(input.bp, latestBp, config)) {
        hits.push({
          level: 'RED',
          rule: 'R4_RAISED_BP_PERSISTS',
          reason: 'bp_raised_persists',
          messageKey: 'red_go_now',
        });
      } else {
        hits.push({
          level: 'YELLOW',
          rule: 'R2_RAISED_BP',
          reason: 'bp_raised',
          messageKey: 'yellow_recheck_bp',
          recheckInMinutes: config.yellowRecheckMinutes,
        });
      }
    }
  }

  // R5 heavy bleeding
  if (recentSymptoms.includes('heavy_bleeding')) {
    hits.push({
      level: 'RED',
      rule: 'R5_HEAVY_BLEEDING',
      reason: 'heavy_bleeding',
      messageKey: 'red_bleeding',
    });
  }

  // R6 / R7 fever (+ postpartum fast pulse)
  const feverConfirmed = hasSustainedFever(input.vitals, config);
  if (feverConfirmed) {
    hits.push({
      level: 'YELLOW',
      rule: 'R6_FEVER',
      reason: 'fever',
      messageKey: 'yellow_fever',
      recheckInMinutes: config.yellowRecheckMinutes,
    });

    if (
      input.stage === 'postpartum' &&
      hasSustainedFastPulse(
        input.vitals,
        config,
        input.markedResting,
        input.nowMs,
        input.timeZone,
      )
    ) {
      hits.push({
        level: 'RED',
        rule: 'R7_FEVER_FAST_PULSE_POSTPARTUM',
        reason: 'fever_fast_pulse',
        messageKey: 'red_go_now',
      });
    }
  }

  // R8 personal baseline — escalate only (YELLOW max from this rule)
  if (
    input.baselineZ.hr !== null &&
    input.baselineZ.hr > config.baselineHrZThreshold &&
    isRestContext(input.markedResting, input.nowMs, config, input.timeZone) &&
    hasSustainedHighHrForBaseline(input.vitals, config)
  ) {
    hits.push({
      level: 'YELLOW',
      rule: 'R8_PULSE_ABOVE_BASELINE',
      reason: 'pulse_above_baseline',
      messageKey: 'yellow_pulse_baseline',
      recheckInMinutes: config.yellowRecheckMinutes,
    });
  }

  // R10 reduced baby movement (pregnancy, >= configured weeks)
  if (
    input.stage === 'pregnancy' &&
    (input.gestationWeeks ?? 0) >= config.reducedMovementMinGestationWeeks &&
    recentSymptoms.includes('baby_moving_less')
  ) {
    hits.push({
      level: 'YELLOW',
      rule: 'R10_REDUCED_BABY_MOVEMENT',
      reason: 'baby_moving_less',
      messageKey: 'yellow_baby_movement',
    });
  }

  // If we only had invalid vitals but also had BP/symptoms, still note R11 as info when band bad
  if (vitalsStaleOrMissing && hits.length === 0) {
    hits.push({
      level: 'UNKNOWN',
      rule: 'R11_SIGNAL_INVALID',
      reason: 'signal_invalid',
      messageKey: 'unknown_check_band',
    });
  }

  if (hits.length === 0) {
    hits.push({
      level: 'GREEN',
      rule: 'R12_NOTHING_CONCERNING',
      reason: 'nothing_concerning',
      messageKey: 'green_calm',
    });
  }

  return resultOf(hits, input.nowMs, config.version);
}

/** Applies skin-temperature calibration offset from config. */
export function calibrateSkinTempC(
  rawC: number,
  config: TriageConfig = DEFAULT_CONFIG,
): number {
  return rawC + config.tempCalibrationOffsetC;
}

function resultOf(hits: PartialHit[], nowMs: number, configVersion: string): TriageResult {
  let best = hits[0]!;
  for (const hit of hits) {
    if (LEVEL_RANK[hit.level] > LEVEL_RANK[best.level]) best = hit;
  }

  // Safety: never present UNKNOWN as GREEN (already enforced by ranks)
  const firedRules = hits.map((h) => h.rule);
  const reasons = [...new Set(hits.map((h) => h.reason))];
  const recheck = hits.find((h) => h.level === best.level && 'recheckInMinutes' in h && h.recheckInMinutes !== undefined);

  const result: TriageResult = {
    level: best.level,
    firedRules,
    reasons,
    messageKey: best.messageKey,
    configVersion,
    evaluatedAtMs: nowMs,
  };
  if (recheck && 'recheckInMinutes' in recheck && recheck.recheckInMinutes !== undefined) {
    result.recheckInMinutes = recheck.recheckInMinutes;
  }
  return result;
}

function latestMinute(vitals: VitalsMinute[]): VitalsMinute | undefined {
  return vitals.length ? vitals[vitals.length - 1] : undefined;
}

function latestReading<T extends { tsMs: number }>(items: T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

function flattenCodes(reports: SymptomReport[]): SymptomCode[] {
  return reports.flatMap((r) => r.codes);
}

function raisedBpPersists(bp: BpReading[], latest: BpReading, config: TriageConfig): boolean {
  const windowStart = latest.tsMs - config.bpRecheckWindowMinutes * 60_000;
  const earlier = bp.filter((b) => b.tsMs >= windowStart && b.tsMs < latest.tsMs);
  if (earlier.length === 0) return false;
  return earlier.some(
    (b) => b.systolic >= config.raisedBp.systolic || b.diastolic >= config.raisedBp.diastolic,
  );
}

/**
 * True when every valid reading in the confirmation window meets the threshold
 * and the valid readings span the whole window (first to last ≥ minutes − 1),
 * so one odd minute never confirms a sustained sign.
 */
function sustainedAtOrAbove(
  vitals: VitalsMinute[],
  pick: (v: VitalsMinute) => number | null,
  threshold: number,
  minutes: number,
): boolean {
  if (vitals.length === 0) return false;
  const end = vitals[vitals.length - 1]!.tsMs;
  // One minute of slack so rows at t-10..t (11 rows) and t-9..t (10 rows) both count.
  const windowStart = end - minutes * 60_000;
  const valid = vitals.filter((v) => v.tsMs >= windowStart && pick(v) !== null);
  if (valid.length < 2) return false;
  const span = valid[valid.length - 1]!.tsMs - valid[0]!.tsMs;
  if (span < (minutes - 1) * 60_000) return false;
  return valid.every((v) => (pick(v) as number) >= threshold);
}

function hasSustainedFever(vitals: VitalsMinute[], config: TriageConfig): boolean {
  return sustainedAtOrAbove(vitals, (v) => v.tempMeanC, config.feverTempC, config.feverConfirmMinutes);
}

function hasSustainedFastPulse(
  vitals: VitalsMinute[],
  config: TriageConfig,
  markedResting: boolean,
  nowMs: number,
  timeZone?: string,
): boolean {
  if (!isRestContext(markedResting, nowMs, config, timeZone)) return false;
  return sustainedAtOrAbove(
    vitals,
    (v) => v.hrMean,
    config.postpartumFastPulseBpm,
    config.postpartumFastPulseMinutes,
  );
}

function hasSustainedHighHrForBaseline(vitals: VitalsMinute[], config: TriageConfig): boolean {
  const windowMs = config.baselineHrMinutes * 60_000;
  if (vitals.length === 0) return false;
  const end = vitals[vitals.length - 1]!.tsMs;
  const inWindow = vitals.filter((v) => v.tsMs >= end - windowMs && v.hrMean !== null);
  if (inWindow.length < Math.max(2, Math.floor(config.baselineHrMinutes / 2))) return false;
  return inWindow[inWindow.length - 1]!.tsMs - inWindow[0]!.tsMs >= (config.baselineHrMinutes - 1) * 60_000;
}

/**
 * Local hour (0–23) in an IANA zone, or UTC when zone is omitted/invalid.
 */
export function localHour(nowMs: number, timeZone?: string): number {
  if (!timeZone) return new Date(nowMs).getUTCHours();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date(nowMs));
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    return hourPart ? Number(hourPart) : new Date(nowMs).getUTCHours();
  } catch {
    return new Date(nowMs).getUTCHours();
  }
}

function isRestContext(
  markedResting: boolean,
  nowMs: number,
  config: TriageConfig,
  timeZone?: string,
): boolean {
  if (markedResting) return true;
  const hour = localHour(nowMs, timeZone);
  const { startHour, endHour } = config.sleepWindow;
  if (startHour > endHour) return hour >= startHour || hour < endHour;
  return hour >= startHour && hour < endHour;
}

/** Exported for tests and the config UI later. */
export function getDefaultTriageConfig(): TriageConfig {
  return DEFAULT_CONFIG;
}
