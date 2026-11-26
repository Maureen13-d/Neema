import { describe, expect, it } from 'vitest';
import {
  advanceFollowUp,
  chaseList,
  confirmArrival,
  openFollowUp,
} from '../src/followup.js';
import { avatarState } from '../src/avatar.js';

describe('follow-up loop', () => {
  it('opens at watch and advances toward chase', () => {
    let f = openFollowUp('a1');
    expect(f.stage).toBe('watch');
    f = advanceFollowUp(f, 1000);
    expect(f.stage).toBe('warn');
    f = advanceFollowUp(f, 2000);
    expect(f.stage).toBe('act');
    f = advanceFollowUp(f, 3000);
    expect(f.stage).toBe('chase');
    expect(f.chaseCount).toBe(1);
    expect(f.lastChaseAtMs).toBe(3000);
  });

  it('ranks chase loops first and excludes arrived', () => {
    const open = openFollowUp('a');
    const chased = advanceFollowUp(
      advanceFollowUp(advanceFollowUp(openFollowUp('b'), 1), 2),
      3,
    );
    const arrived = confirmArrival(openFollowUp('c'), 'chp', 9);
    const ranked = chaseList([open, chased, arrived], 10);
    expect(ranked.map((f) => f.alertId)).toEqual(['b', 'a']);
  });

  it('only confirmArrival sets arrive — advance cannot', () => {
    let f = openFollowUp('x');
    for (let i = 0; i < 5; i++) f = advanceFollowUp(f, i);
    expect(f.stage).toBe('chase');
    expect(f.arrivalConfirmedAtMs).toBeUndefined();
    f = confirmArrival(f, 'nurse', 99);
    expect(f.stage).toBe('arrive');
    expect(f.arrivalConfirmedBy).toBe('nurse');
    expect(f.arrivalConfirmedAtMs).toBe(99);
  });
});

describe('avatarState', () => {
  it('maps levels without deciding triage', () => {
    expect(avatarState('GREEN', false)).toBe('calm');
    expect(avatarState('UNKNOWN', false)).toBe('calm');
    expect(avatarState('YELLOW', false)).toBe('watchful');
    expect(avatarState('RED', false)).toBe('urgent');
    expect(avatarState('RED', true)).toBe('waiting');
  });
});
