import { describe, expect, it } from 'vitest';
import {
  HARDWARE_CHECKS,
  finishHardwareValidation,
  recordHardwareCheck,
  startHardwareValidation,
} from '../src/hardwareValidation.js';

describe('hardware validation', () => {
  it('fails engineering pass until required checks pass', () => {
    let report = startHardwareValidation('ESP32-proto-1', 'Blessings');
    report = finishHardwareValidation(report);
    expect(report.engineeringPass).toBe(false);
  });

  it('passes when all required checks pass', () => {
    let report = startHardwareValidation('ESP32-proto-1', 'Blessings');
    for (const check of HARDWARE_CHECKS.filter((c) => c.required)) {
      report = recordHardwareCheck(report, { id: check.id, result: 'pass' });
    }
    report = finishHardwareValidation(report);
    expect(report.engineeringPass).toBe(true);
    expect(report.disclaimer).toMatch(/not clinically validated/i);
  });
});
