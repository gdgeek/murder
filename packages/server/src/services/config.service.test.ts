import { describe, it, expect } from 'vitest';
import { validate, calculateRoundStructure } from './config.service.js';
import { GameType, AgeGroup } from '@murder-mystery/shared';

function validInput() {
  return {
    playerCount: 4,
    durationHours: 3,
    gameType: GameType.HONKAKU,
    ageGroup: AgeGroup.ADULT,
    restorationRatio: 60,
    deductionRatio: 40,
    era: '民国',
    location: '上海',
    theme: '悬疑推理',
  };
}

describe('ConfigService.validate', () => {
  it('should pass for a valid input', () => {
    const result = validate(validInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass for boundary playerCount values (1 and 6)', () => {
    expect(validate({ ...validInput(), playerCount: 1 }).valid).toBe(true);
    expect(validate({ ...validInput(), playerCount: 6 }).valid).toBe(true);
  });

  it('should pass for boundary durationHours values (2 and 6)', () => {
    expect(validate({ ...validInput(), durationHours: 2 }).valid).toBe(true);
    expect(validate({ ...validInput(), durationHours: 6 }).valid).toBe(true);
  });

  it('should pass for all valid gameType values', () => {
    for (const gt of Object.values(GameType)) {
      expect(validate({ ...validInput(), gameType: gt }).valid).toBe(true);
    }
  });

  it('should pass for all valid ageGroup values', () => {
    for (const ag of Object.values(AgeGroup)) {
      expect(validate({ ...validInput(), ageGroup: ag }).valid).toBe(true);
    }
  });

  it('should pass when ratios are 0 and 100', () => {
    expect(validate({ ...validInput(), restorationRatio: 0, deductionRatio: 100 }).valid).toBe(true);
    expect(validate({ ...validInput(), restorationRatio: 100, deductionRatio: 0 }).valid).toBe(true);
  });

  // --- playerCount errors ---
  it('should reject playerCount below 1', () => {
    const result = validate({ ...validInput(), playerCount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'playerCount')).toBe(true);
  });

  it('should reject playerCount above 6', () => {
    const result = validate({ ...validInput(), playerCount: 7 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'playerCount')).toBe(true);
  });

  it('should reject non-integer playerCount', () => {
    const result = validate({ ...validInput(), playerCount: 3.5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'playerCount' && e.constraint === 'integer')).toBe(true);
  });

  it('should reject missing playerCount', () => {
    const { playerCount, ...rest } = validInput();
    const result = validate(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'playerCount' && e.constraint === 'required')).toBe(true);
  });

  // --- durationHours errors ---
  it('should reject durationHours below 2', () => {
    const result = validate({ ...validInput(), durationHours: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'durationHours')).toBe(true);
  });

  it('should reject durationHours above 6', () => {
    const result = validate({ ...validInput(), durationHours: 7 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'durationHours')).toBe(true);
  });

  it('should reject non-integer durationHours', () => {
    const result = validate({ ...validInput(), durationHours: 2.5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'durationHours' && e.constraint === 'integer')).toBe(true);
  });

  // --- gameType errors ---
  it('should reject invalid gameType', () => {
    const result = validate({ ...validInput(), gameType: 'invalid_type' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'gameType')).toBe(true);
  });

  // --- ageGroup errors ---
  it('should reject invalid ageGroup', () => {
    const result = validate({ ...validInput(), ageGroup: 'toddler' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'ageGroup')).toBe(true);
  });

  // --- ratio errors ---
  it('should reject restorationRatio below 0', () => {
    const result = validate({ ...validInput(), restorationRatio: -1, deductionRatio: 101 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'restorationRatio')).toBe(true);
  });

  it('should reject deductionRatio above 100', () => {
    const result = validate({ ...validInput(), restorationRatio: -10, deductionRatio: 110 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'deductionRatio')).toBe(true);
  });

  it('should reject when ratios do not sum to 100', () => {
    const result = validate({ ...validInput(), restorationRatio: 50, deductionRatio: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'restorationRatio+deductionRatio')).toBe(true);
  });

  it('should not report ratio sum error when individual ratios are non-numeric', () => {
    const result = validate({ ...validInput(), restorationRatio: 'abc', deductionRatio: 40 });
    expect(result.errors.some(e => e.field === 'restorationRatio' && e.constraint === 'number')).toBe(true);
    expect(result.errors.some(e => e.field === 'restorationRatio+deductionRatio')).toBe(false);
  });

  // --- text field errors ---
  it('should reject empty era', () => {
    const result = validate({ ...validInput(), era: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'era' && e.constraint === 'non-empty')).toBe(true);
  });

  it('should reject whitespace-only location', () => {
    const result = validate({ ...validInput(), location: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'location' && e.constraint === 'non-empty')).toBe(true);
  });

  it('should reject missing theme', () => {
    const { theme, ...rest } = validInput();
    const result = validate(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'theme' && e.constraint === 'required')).toBe(true);
  });

  it('should reject non-string era', () => {
    const result = validate({ ...validInput(), era: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'era' && e.constraint === 'string')).toBe(true);
  });

  // --- multiple errors ---
  it('should return multiple errors for multiple invalid fields', () => {
    const result = validate({
      playerCount: 10,
      durationHours: 0,
      gameType: 'bad',
      ageGroup: 'bad',
      restorationRatio: -5,
      deductionRatio: -5,
      era: '',
      location: '',
      theme: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(7);
  });

  // --- edge: null/undefined input ---
  it('should handle null input gracefully', () => {
    const result = validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle undefined input gracefully', () => {
    const result = validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});


describe('calculateRoundStructure', () => {
  it('should return 2 rounds for 2-hour duration', () => {
    const result = calculateRoundStructure(2);
    expect(result.totalRounds).toBe(2);
    expect(result.phases).toHaveLength(2);
  });

  it('should return 3 rounds for 3-hour duration', () => {
    const result = calculateRoundStructure(3);
    expect(result.totalRounds).toBe(3);
    expect(result.phases).toHaveLength(3);
  });

  it('should return 4 rounds for 4-hour duration', () => {
    const result = calculateRoundStructure(4);
    expect(result.totalRounds).toBe(4);
    expect(result.phases).toHaveLength(4);
  });

  it('should return 4 rounds for 5-hour duration', () => {
    const result = calculateRoundStructure(5);
    expect(result.totalRounds).toBe(4);
    expect(result.phases).toHaveLength(4);
  });

  it('should return 5 rounds for 6-hour duration', () => {
    const result = calculateRoundStructure(6);
    expect(result.totalRounds).toBe(5);
    expect(result.phases).toHaveLength(5);
  });

  it('should have summary time of ~20 min for 2-hour duration', () => {
    const result = calculateRoundStructure(2);
    expect(result.finalVoteMinutes + result.revealMinutes).toBe(20);
  });

  it('should have summary time of ~30 min for 3-hour duration', () => {
    const result = calculateRoundStructure(3);
    expect(result.finalVoteMinutes + result.revealMinutes).toBe(30);
  });

  it('should have summary time of ~40 min for 5-hour duration', () => {
    const result = calculateRoundStructure(5);
    expect(result.finalVoteMinutes + result.revealMinutes).toBe(40);
  });

  it('should keep each phase within valid ranges', () => {
    for (let hours = 2; hours <= 6; hours++) {
      const result = calculateRoundStructure(hours);
      for (const phase of result.phases) {
        expect(phase.reading).toBeGreaterThanOrEqual(10);
        expect(phase.reading).toBeLessThanOrEqual(15);
        expect(phase.investigation).toBeGreaterThanOrEqual(15);
        expect(phase.investigation).toBeLessThanOrEqual(20);
        expect(phase.discussion).toBeGreaterThanOrEqual(15);
        expect(phase.discussion).toBeLessThanOrEqual(20);
      }
    }
  });

  it('should fit total time within durationHours * 60 minutes', () => {
    for (let hours = 2; hours <= 6; hours++) {
      const result = calculateRoundStructure(hours);
      const totalRoundTime = result.phases.reduce(
        (sum: number, p: { reading: number; investigation: number; discussion: number }) =>
          sum + p.reading + p.investigation + p.discussion,
        0,
      );
      const totalTime = totalRoundTime + result.finalVoteMinutes + result.revealMinutes;
      expect(totalTime).toBeLessThanOrEqual(hours * 60);
    }
  });

  it('should have positive finalVoteMinutes and revealMinutes', () => {
    for (let hours = 2; hours <= 6; hours++) {
      const result = calculateRoundStructure(hours);
      expect(result.finalVoteMinutes).toBeGreaterThan(0);
      expect(result.revealMinutes).toBeGreaterThan(0);
    }
  });

  it('should produce per-round time of approximately 50 min for 2-3h durations', () => {
    for (const hours of [2, 3]) {
      const result = calculateRoundStructure(hours);
      for (const phase of result.phases) {
        const roundTime = phase.reading + phase.investigation + phase.discussion;
        expect(roundTime).toBeGreaterThanOrEqual(40);
        expect(roundTime).toBeLessThanOrEqual(55);
      }
    }
  });

  it('should produce per-round time of approximately 55 min for 5-6h durations', () => {
    for (const hours of [5, 6]) {
      const result = calculateRoundStructure(hours);
      for (const phase of result.phases) {
        const roundTime = phase.reading + phase.investigation + phase.discussion;
        expect(roundTime).toBeGreaterThanOrEqual(40);
        expect(roundTime).toBeLessThanOrEqual(55);
      }
    }
  });
});
