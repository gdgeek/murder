import crypto from 'node:crypto';
import {
  GameType,
  AgeGroup,
  type CreateConfigInput,
  type ScriptConfig,
  type ValidationResult,
  type ValidationError,
  type RoundStructure,
  type RoundPhase,
} from '@murder-mystery/shared';
import { pool } from '../db/mysql.js';

const VALID_GAME_TYPES = Object.values(GameType);
const VALID_AGE_GROUPS = Object.values(AgeGroup);

export function validate(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  validatePlayerCount(obj.playerCount, errors);
  validateDurationHours(obj.durationHours, errors);
  validateGameType(obj.gameType, errors);
  validateAgeGroup(obj.ageGroup, errors);
  validateRestorationRatio(obj.restorationRatio, errors);
  validateDeductionRatio(obj.deductionRatio, errors);
  validateRatioSum(obj.restorationRatio, obj.deductionRatio, errors);
  validateNonEmptyString(obj.era, 'era', '时代背景', errors);
  validateNonEmptyString(obj.location, 'location', '地点设定', errors);
  validateNonEmptyString(obj.theme, 'theme', '主题风格', errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Calculates the round structure based on game duration.
 *
 * Adaptation rules (from design doc):
 * | Duration | Rounds | Per-round | Summary |
 * |----------|--------|-----------|---------|
 * | 2h       | 2      | ~50min    | 20min   |
 * | 3h       | 3      | ~50min    | 30min   |
 * | 4h       | 3-4    | ~50min    | 30min   |
 * | 5h       | 4      | ~55min    | 40min   |
 * | 6h       | 4-5    | ~55min    | 40min   |
 *
 * Each round: reading (10-15), investigation (15-20), discussion (15-20).
 * Summary time is split into finalVoteMinutes and revealMinutes.
 * Total must fit within durationHours * 60.
 */
export function calculateRoundStructure(durationHours: number): RoundStructure {
  const totalMinutes = durationHours * 60;
  const { totalRounds, summaryMinutes } = getRoundsAndSummary(durationHours);

  // Split summary time: ~60% for final vote, ~40% for reveal
  const finalVoteMinutes = Math.round(summaryMinutes * 0.6);
  const revealMinutes = summaryMinutes - finalVoteMinutes;

  // Time available for all rounds
  const availableForRounds = totalMinutes - finalVoteMinutes - revealMinutes;
  const perRoundMinutes = Math.floor(availableForRounds / totalRounds);

  const phases: RoundPhase[] = [];
  for (let i = 0; i < totalRounds; i++) {
    phases.push(distributePhaseTime(perRoundMinutes));
  }

  return { totalRounds, phases, finalVoteMinutes, revealMinutes };
}

function getRoundsAndSummary(durationHours: number): { totalRounds: number; summaryMinutes: number } {
  switch (durationHours) {
    case 2: return { totalRounds: 2, summaryMinutes: 20 };
    case 3: return { totalRounds: 3, summaryMinutes: 30 };
    case 4: return { totalRounds: 4, summaryMinutes: 30 };
    case 5: return { totalRounds: 4, summaryMinutes: 40 };
    case 6: return { totalRounds: 5, summaryMinutes: 40 };
    default:
      return { totalRounds: Math.max(2, Math.min(5, durationHours - 1)), summaryMinutes: 30 };
  }
}

/**
 * Distributes per-round time into reading, investigation, and discussion phases.
 * reading: 10-15 min, investigation: 15-20 min, discussion: 15-20 min
 */
function distributePhaseTime(perRoundMinutes: number): RoundPhase {
  // Min total: 40, Max total: 55
  const clamped = Math.max(40, Math.min(55, perRoundMinutes));
  const extra = clamped - 40;

  // Distribute extra: investigation and discussion get priority, then reading
  const investigationExtra = Math.min(5, Math.floor(extra / 3));
  const discussionExtra = Math.min(5, Math.floor((extra - investigationExtra) / 2));
  const readingExtra = Math.min(5, extra - investigationExtra - discussionExtra);

  return {
    reading: 10 + readingExtra,
    investigation: 15 + investigationExtra,
    discussion: 15 + discussionExtra,
  };
}

// --- Validation helpers (unchanged) ---

function validatePlayerCount(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'playerCount', message: 'playerCount is required', constraint: 'required' });
    return;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push({ field: 'playerCount', message: 'playerCount must be an integer', constraint: 'integer' });
    return;
  }
  if (value < 1 || value > 6) {
    errors.push({ field: 'playerCount', message: 'playerCount must be between 1 and 6', constraint: 'range:1-6' });
  }
}

function validateDurationHours(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'durationHours', message: 'durationHours is required', constraint: 'required' });
    return;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push({ field: 'durationHours', message: 'durationHours must be an integer', constraint: 'integer' });
    return;
  }
  if (value < 2 || value > 6) {
    errors.push({ field: 'durationHours', message: 'durationHours must be between 2 and 6', constraint: 'range:2-6' });
  }
}

function validateGameType(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'gameType', message: 'gameType is required', constraint: 'required' });
    return;
  }
  if (!VALID_GAME_TYPES.includes(value as GameType)) {
    errors.push({ field: 'gameType', message: `gameType must be one of: ${VALID_GAME_TYPES.join(', ')}`, constraint: `enum:${VALID_GAME_TYPES.join(',')}` });
  }
}

function validateAgeGroup(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'ageGroup', message: 'ageGroup is required', constraint: 'required' });
    return;
  }
  if (!VALID_AGE_GROUPS.includes(value as AgeGroup)) {
    errors.push({ field: 'ageGroup', message: `ageGroup must be one of: ${VALID_AGE_GROUPS.join(', ')}`, constraint: `enum:${VALID_AGE_GROUPS.join(',')}` });
  }
}

function validateRestorationRatio(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'restorationRatio', message: 'restorationRatio is required', constraint: 'required' });
    return;
  }
  if (typeof value !== 'number') {
    errors.push({ field: 'restorationRatio', message: 'restorationRatio must be a number', constraint: 'number' });
    return;
  }
  if (value < 0 || value > 100) {
    errors.push({ field: 'restorationRatio', message: 'restorationRatio must be between 0 and 100', constraint: 'range:0-100' });
  }
}

function validateDeductionRatio(value: unknown, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field: 'deductionRatio', message: 'deductionRatio is required', constraint: 'required' });
    return;
  }
  if (typeof value !== 'number') {
    errors.push({ field: 'deductionRatio', message: 'deductionRatio must be a number', constraint: 'number' });
    return;
  }
  if (value < 0 || value > 100) {
    errors.push({ field: 'deductionRatio', message: 'deductionRatio must be between 0 and 100', constraint: 'range:0-100' });
  }
}

function validateRatioSum(restorationRatio: unknown, deductionRatio: unknown, errors: ValidationError[]): void {
  if (typeof restorationRatio !== 'number' || typeof deductionRatio !== 'number') return;
  if (restorationRatio + deductionRatio !== 100) {
    errors.push({ field: 'restorationRatio+deductionRatio', message: 'restorationRatio + deductionRatio must equal 100', constraint: 'sum:100' });
  }
}

function validateNonEmptyString(value: unknown, field: string, _label: string, errors: ValidationError[]): void {
  if (value === undefined || value === null) {
    errors.push({ field, message: `${field} is required`, constraint: 'required' });
    return;
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: `${field} must be a string`, constraint: 'string' });
    return;
  }
  if (value.trim().length === 0) {
    errors.push({ field, message: `${field} must not be empty`, constraint: 'non-empty' });
  }
}


export async function create(input: CreateConfigInput): Promise<ScriptConfig> {
  const validation = validate(input);
  if (!validation.valid) {
    const err = new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`);
    (err as any).validationErrors = validation.errors;
    throw err;
  }

  const roundStructure = calculateRoundStructure(input.durationHours);
  const id = crypto.randomUUID();
  const language = input.language ?? 'zh';

  await pool.execute(
    `INSERT INTO script_configs (id, player_count, duration_hours, game_type, age_group, restoration_ratio, deduction_ratio, era, location, theme, language, round_structure)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.playerCount,
      input.durationHours,
      input.gameType,
      input.ageGroup,
      input.restorationRatio,
      input.deductionRatio,
      input.era,
      input.location,
      input.theme,
      language,
      JSON.stringify(roundStructure),
    ],
  );

  return {
    id,
    playerCount: input.playerCount,
    durationHours: input.durationHours,
    gameType: input.gameType,
    ageGroup: input.ageGroup,
    restorationRatio: input.restorationRatio,
    deductionRatio: input.deductionRatio,
    era: input.era,
    location: input.location,
    theme: input.theme,
    language,
    roundStructure,
  };
}

export async function getById(id: string): Promise<ScriptConfig | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM script_configs WHERE id = ?',
    [id],
  );

  const results = rows as any[];
  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: row.id,
    playerCount: row.player_count,
    durationHours: row.duration_hours,
    gameType: row.game_type as GameType,
    ageGroup: row.age_group as AgeGroup,
    restorationRatio: row.restoration_ratio,
    deductionRatio: row.deduction_ratio,
    era: row.era,
    location: row.location,
    theme: row.theme,
    language: row.language,
    roundStructure: typeof row.round_structure === 'string'
      ? JSON.parse(row.round_structure)
      : row.round_structure,
  };
}
