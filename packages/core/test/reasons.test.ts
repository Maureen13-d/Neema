import { describe, expect, it } from 'vitest';
import { evaluateTriage } from '../src/triage.js';
import { scenarioC, scenarioD } from '../src/demoScenarios.js';
import { buildAlertSmsText, reasonPhrase, topReason } from '../src/messages/reasons.js';

const NOW = Date.UTC(2026, 10, 26, 2, 0, 0);

describe('alert reasons', () => {
  it('picks the most urgent reason, not the first one fired', () => {
    // Scenario D fires R6 (fever) before R7 (fever + fast pulse).
    const result = evaluateTriage(scenarioD.buildInput(NOW));
    expect(result.reasons[0]).toBe('fever');
    expect(topReason(result.reasons)).toBe('fever_fast_pulse');
  });

  it('builds a RED SMS with a plain reason, location and no raw vitals', () => {
    const result = evaluateTriage(scenarioC.buildInput(NOW));
    const sms = buildAlertSmsText({
      level: 'RED',
      motherName: 'Amina',
      reasons: result.reasons,
      locationUrl: 'https://maps.google.com/?q=-1.28,36.82',
    });
    expect(sms).toContain('Mama Amina yuko RED');
    expect(sms).toContain('shinikizo la damu juu sana');
    expect(sms).toContain('https://maps.google.com/?q=-1.28,36.82');
    expect(sms).not.toMatch(/\d{2,3}\/\d{2,3}/); // no BP numbers
    expect(sms).not.toContain('bp_');
  });

  it('builds a quiet YELLOW heads-up', () => {
    const sms = buildAlertSmsText({ level: 'YELLOW', motherName: 'Amina', reasons: ['bp_raised'] });
    expect(sms).toContain('YELLOW');
    expect(sms).toContain('shinikizo la damu limeinuka');
    expect(sms).not.toContain('Mahali');
  });

  it('never doubles the honorific', () => {
    expect(buildAlertSmsText({ level: 'RED', motherName: 'Mama', reasons: ['sos'] })).toContain('NEEMA: Mama yuko RED');
    expect(buildAlertSmsText({ level: 'RED', motherName: 'Mama Amina', reasons: ['sos'] })).toContain('NEEMA: Mama Amina yuko');
    expect(buildAlertSmsText({ level: 'RED', motherName: '  ', reasons: ['sos'] })).toContain('NEEMA: Mama yuko');
  });

  it('falls back to a neutral phrase for unknown codes', () => {
    expect(reasonPhrase('something_new')).toBe('anahitaji msaada');
    expect(reasonPhrase(undefined, 'en')).toBe('she needs help');
  });

  it('never uses diagnosis wording', () => {
    const codes = ['sos', 'bp_severe', 'bp_raised_with_symptom', 'heavy_bleeding', 'fever_fast_pulse',
      'bp_raised_persists', 'bp_raised', 'fever', 'pulse_above_baseline', 'baby_moving_less'];
    for (const code of codes) {
      const text = `${reasonPhrase(code, 'en')} ${reasonPhrase(code, 'sw')}`.toLowerCase();
      expect(text).not.toMatch(/eclampsia|sepsis|infection|haemorrhage|hemorrhage|diagnos/);
    }
  });
});
