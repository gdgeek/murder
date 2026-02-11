import { type SkillTemplate, SkillCategory, GameType } from '@murder-mystery/shared';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const honkakuSkills = require('../skills/honkaku.json') as Record<string, unknown>[];
const shinHonkakuSkills = require('../skills/shin-honkaku.json') as Record<string, unknown>[];
const henkakuSkills = require('../skills/henkaku.json') as Record<string, unknown>[];
const commonSkills = require('../skills/common.json') as Record<string, unknown>[];

const VALID_CATEGORIES = new Set<string>(Object.values(SkillCategory));
const VALID_GAME_TYPES = new Set<string>(Object.values(GameType));

/** All skill templates loaded from JSON files. */
const allTemplates: SkillTemplate[] = [
  ...honkakuSkills,
  ...shinHonkakuSkills,
  ...henkakuSkills,
  ...commonSkills,
] as unknown as SkillTemplate[];

/**
 * Return all templates that belong to the given category.
 */
export async function getByCategory(category: SkillCategory): Promise<SkillTemplate[]> {
  return allTemplates.filter((t) => t.category === category);
}

/**
 * Return all templates whose `gameTypes` array includes the given type,
 * sorted by priority descending (highest priority first).
 */
export async function getByGameType(gameType: GameType): Promise<SkillTemplate[]> {
  return allTemplates
    .filter((t) => t.gameTypes.includes(gameType))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Return templates for generation: filtered by game type AND categories,
 * sorted by priority descending.
 *
 * Templates whose `gameTypes` includes the requested type are prioritised
 * (sorted first by whether they are type-specific, then by priority).
 */
export async function getForGeneration(
  gameType: GameType,
  categories: SkillCategory[],
): Promise<SkillTemplate[]> {
  const categorySet = new Set<string>(categories);

  const matched = allTemplates.filter(
    (t) => t.gameTypes.includes(gameType) && categorySet.has(t.category),
  );

  // Sort: type-specific templates first (fewer gameTypes = more specific), then by priority desc
  return matched.sort((a, b) => {
    const aSpecific = a.gameTypes.length === 1 && a.gameTypes[0] === gameType ? 1 : 0;
    const bSpecific = b.gameTypes.length === 1 && b.gameTypes[0] === gameType ? 1 : 0;
    if (bSpecific !== aSpecific) return bSpecific - aSpecific;
    return b.priority - a.priority;
  });
}

/**
 * Serialize a SkillTemplate to a JSON string.
 */
export function serialize(template: SkillTemplate): string {
  return JSON.stringify(template);
}

/**
 * Deserialize a JSON string into a SkillTemplate.
 * Throws if the JSON is invalid or missing required fields.
 */
export function deserialize(json: string): SkillTemplate {
  const parsed: unknown = JSON.parse(json);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid SkillTemplate JSON: expected an object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    throw new Error('Invalid SkillTemplate JSON: "id" must be a non-empty string');
  }
  if (typeof obj.category !== 'string' || !VALID_CATEGORIES.has(obj.category)) {
    throw new Error(`Invalid SkillTemplate JSON: "category" must be one of ${[...VALID_CATEGORIES].join(', ')}`);
  }
  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('Invalid SkillTemplate JSON: "name" must be a non-empty string');
  }
  if (typeof obj.description !== 'string') {
    throw new Error('Invalid SkillTemplate JSON: "description" must be a string');
  }
  if (
    !Array.isArray(obj.gameTypes) ||
    obj.gameTypes.length === 0 ||
    !obj.gameTypes.every((g: unknown) => typeof g === 'string' && VALID_GAME_TYPES.has(g))
  ) {
    throw new Error('Invalid SkillTemplate JSON: "gameTypes" must be a non-empty array of valid GameType values');
  }
  if (typeof obj.priority !== 'number' || !Number.isFinite(obj.priority)) {
    throw new Error('Invalid SkillTemplate JSON: "priority" must be a finite number');
  }
  if (typeof obj.content !== 'string') {
    throw new Error('Invalid SkillTemplate JSON: "content" must be a string');
  }

  return {
    id: obj.id,
    category: obj.category as SkillCategory,
    name: obj.name,
    description: obj.description as string,
    gameTypes: obj.gameTypes as GameType[],
    priority: obj.priority,
    content: obj.content as string,
  };
}

/** Expose the full list for seeding or testing purposes. */
export function getAllTemplates(): SkillTemplate[] {
  return [...allTemplates];
}
