/**
 * Public exports for @neema/core.
 * Consumers import only from this barrel — keep it free of browser APIs.
 */

export type {
  AlertRecord,
  BandCommand,
  BpReading,
  Contact,
  RuleId,
  Stage,
  SymptomCode,
  SymptomReport,
  TriageInput,
  TriageLevel,
  TriageResult,
  VitalsMinute,
  VitalsSample,
} from './types.js';

export {
  NEEMA_BLE,
  encodeBandCommand,
  encodeVitalsPacket,
  parseBandCommand,
  parseVitalsPacket,
} from './protocol.js';

export {
  calibrateSkinTempC,
  evaluateTriage,
  getDefaultTriageConfig,
  type TriageConfig,
} from './triage.js';

export {
  createBaseline,
  updateBaseline,
  zScore,
  type BaselineSignal,
  type BaselineState,
  type BaselineUpdate,
} from './baseline.js';

export {
  buildNurseSummary,
  type NurseSummary,
  type NurseSummaryInput,
  type SummaryShareChoices,
} from './summary.js';

export { default as triageConfigJson } from './config/triage.config.json';
export { default as swMessages } from './messages/sw.json';
