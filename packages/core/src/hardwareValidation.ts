/**
 * Hardware validation protocol for the hobby-sensor prototype band.
 * This is engineering QA — not clinical accuracy validation.
 * Pitch language must still say "prototype; clinical validation planned".
 */

export type HardwareCheckId =
  | 'ble_advertise'
  | 'ble_connect'
  | 'packet_parse'
  | 'hr_skin_contact'
  | 'hr_plausible_range'
  | 'temp_plausible_range'
  | 'sos_long_press'
  | 'led_green'
  | 'led_yellow'
  | 'led_red'
  | 'vibrate'
  | 'demo_scenario_a'
  | 'demo_scenario_c'
  | 'battery_or_usb_power';

export type HardwareCheckResult = 'pass' | 'fail' | 'skip';

export interface HardwareCheckDef {
  id: HardwareCheckId;
  title: string;
  /** How a human/tester should verify. */
  procedure: string;
  required: boolean;
}

export interface HardwareCheckOutcome {
  id: HardwareCheckId;
  result: HardwareCheckResult;
  notes?: string;
  atMs: number;
}

export interface HardwareValidationReport {
  id: string;
  deviceLabel: string;
  operatorName: string;
  startedAtMs: number;
  finishedAtMs?: number;
  outcomes: HardwareCheckOutcome[];
  /** Engineering pass only — never implies clinical validation. */
  engineeringPass: boolean;
  disclaimer: string;
}

export const HARDWARE_DISCLAIMER =
  'Engineering QA only. MAX30102/DS18B20 hobby sensors are not clinically validated. Do not claim accuracy figures.';

/** Ordered checklist for band bring-up and stage rehearsal. */
export const HARDWARE_CHECKS: HardwareCheckDef[] = [
  {
    id: 'ble_advertise',
    title: 'BLE advertising as Neema-Band',
    procedure: 'Power the band and confirm it appears in Chrome Web Bluetooth / nRF Connect.',
    required: true,
  },
  {
    id: 'ble_connect',
    title: 'GATT connect + notify',
    procedure: 'Connect from the harness and confirm vitals packets arrive about once per second.',
    required: true,
  },
  {
    id: 'packet_parse',
    title: 'Packet parse',
    procedure: 'Confirm seq increments and magic/version decode without nulls on every frame.',
    required: true,
  },
  {
    id: 'hr_skin_contact',
    title: 'HR skin-contact invalid when off-finger',
    procedure: 'Remove sensor from skin; heartRate should become null / low signalQuality.',
    required: true,
  },
  {
    id: 'hr_plausible_range',
    title: 'HR plausible at rest (engineering)',
    procedure: 'At rest, reading roughly 50–120 bpm. Record that this is not a clinical claim.',
    required: true,
  },
  {
    id: 'temp_plausible_range',
    title: 'Skin temp plausible (engineering)',
    procedure: 'Skin probe reads roughly 32–38 C on skin; note calibration offset is applied in app.',
    required: true,
  },
  {
    id: 'sos_long_press',
    title: 'SOS long-press (3s)',
    procedure: 'Hold SOS 3 seconds; sos flag appears in packets.',
    required: true,
  },
  {
    id: 'led_green',
    title: 'LED green command',
    procedure: 'Send led green from harness; green LED lights.',
    required: true,
  },
  {
    id: 'led_yellow',
    title: 'LED yellow command',
    procedure: 'Send led yellow; yellow LED lights.',
    required: true,
  },
  {
    id: 'led_red',
    title: 'LED red command',
    procedure: 'Send led red; red LED lights.',
    required: true,
  },
  {
    id: 'vibrate',
    title: 'Vibration motor',
    procedure: 'Send vibrate short/sos; motor buzzes.',
    required: true,
  },
  {
    id: 'demo_scenario_a',
    title: 'Demo scenario A (normal)',
    procedure: 'Switch demo scenario 1; harness stays GREEN with calm vitals.',
    required: true,
  },
  {
    id: 'demo_scenario_c',
    title: 'Demo scenario path to RED',
    procedure: 'Run scenario C inputs (or demo 3 + BP/symptoms); confirm RED chain.',
    required: true,
  },
  {
    id: 'battery_or_usb_power',
    title: 'Power source stable for demo',
    procedure: 'Confirm USB or 18650 + TP4056 keeps the board up for a 10-minute dry run.',
    required: false,
  },
];

/** Builds an empty report for an operator. */
export function startHardwareValidation(
  deviceLabel: string,
  operatorName: string,
  nowMs: number = Date.now(),
): HardwareValidationReport {
  return {
    id: `hw-${nowMs}`,
    deviceLabel,
    operatorName,
    startedAtMs: nowMs,
    outcomes: [],
    engineeringPass: false,
    disclaimer: HARDWARE_DISCLAIMER,
  };
}

/** Records one check outcome on a report. */
export function recordHardwareCheck(
  report: HardwareValidationReport,
  outcome: Omit<HardwareCheckOutcome, 'atMs'> & { atMs?: number },
): HardwareValidationReport {
  const next: HardwareCheckOutcome = {
    id: outcome.id,
    result: outcome.result,
    atMs: outcome.atMs ?? Date.now(),
    ...(outcome.notes !== undefined ? { notes: outcome.notes } : {}),
  };
  const outcomes = [...report.outcomes.filter((o) => o.id !== next.id), next];
  return { ...report, outcomes };
}

/** Finalises engineering pass/fail from required checks. */
export function finishHardwareValidation(
  report: HardwareValidationReport,
  nowMs: number = Date.now(),
): HardwareValidationReport {
  const byId = new Map(report.outcomes.map((o) => [o.id, o]));
  const engineeringPass = HARDWARE_CHECKS.filter((c) => c.required).every((c) => {
    const outcome = byId.get(c.id);
    return outcome?.result === 'pass';
  });
  return {
    ...report,
    finishedAtMs: nowMs,
    engineeringPass,
    disclaimer: HARDWARE_DISCLAIMER,
  };
}
