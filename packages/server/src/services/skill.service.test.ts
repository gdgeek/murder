import { describe, it, expect } from 'vitest';
import {
  getByCategory,
  getByGameType,
  getForGeneration,
  serialize,
  deserialize,
  getAllTemplates,
} from './skill.service.js';
import { SkillCategory, GameType } from '@murder-mystery/shared';

describe('SkillService', () => {
  describe('getAllTemplates', () => {
    it('should load templates from all JSON files', () => {
      const all = getAllTemplates();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should have unique ids across all templates', () => {
      const all = getAllTemplates();
      const ids = all.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should cover all 7 skill categories', () => {
      const all = getAllTemplates();
      const categories = new Set(all.map((t) => t.category));
      for (const cat of Object.values(SkillCategory)) {
        expect(categories.has(cat)).toBe(true);
      }
    });
  });

  describe('getByCategory', () => {
    it('should return only templates of the requested category', async () => {
      const results = await getByCategory(SkillCategory.TRICK);
      expect(results.length).toBeGreaterThan(0);
      for (const t of results) {
        expect(t.category).toBe(SkillCategory.TRICK);
      }
    });

    it('should return templates from multiple game types for a shared category', async () => {
      const results = await getByCategory(SkillCategory.CHARACTER_DESIGN);
      const gameTypeSets = results.map((t) => t.gameTypes);
      // Should have honkaku-specific, shin-honkaku-specific, henkaku-specific, and common
      const allGameTypes = new Set(gameTypeSets.flat());
      expect(allGameTypes.size).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for a category with no templates if one existed', async () => {
      // All categories have templates, so just verify the filter works
      const results = await getByCategory(SkillCategory.DEDUCTION_CHAIN);
      for (const t of results) {
        expect(t.category).toBe(SkillCategory.DEDUCTION_CHAIN);
      }
    });
  });

  describe('getByGameType', () => {
    it('should return templates applicable to honkaku, sorted by priority desc', async () => {
      const results = await getByGameType(GameType.HONKAKU);
      expect(results.length).toBeGreaterThan(0);
      for (const t of results) {
        expect(t.gameTypes).toContain(GameType.HONKAKU);
      }
      // Verify sorted by priority descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].priority).toBeGreaterThanOrEqual(results[i].priority);
      }
    });

    it('should return templates applicable to shin_honkaku', async () => {
      const results = await getByGameType(GameType.SHIN_HONKAKU);
      expect(results.length).toBeGreaterThan(0);
      for (const t of results) {
        expect(t.gameTypes).toContain(GameType.SHIN_HONKAKU);
      }
    });

    it('should return templates applicable to henkaku', async () => {
      const results = await getByGameType(GameType.HENKAKU);
      expect(results.length).toBeGreaterThan(0);
      for (const t of results) {
        expect(t.gameTypes).toContain(GameType.HENKAKU);
      }
    });

    it('should include common templates for any game type', async () => {
      const honkaku = await getByGameType(GameType.HONKAKU);
      const commonIds = honkaku.filter((t) => t.gameTypes.length > 1).map((t) => t.id);
      expect(commonIds.length).toBeGreaterThan(0);
    });
  });

  describe('getForGeneration', () => {
    it('should return templates matching both game type and categories', async () => {
      const results = await getForGeneration(GameType.HONKAKU, [
        SkillCategory.TRICK,
        SkillCategory.CLUE_DESIGN,
      ]);
      expect(results.length).toBeGreaterThan(0);
      for (const t of results) {
        expect(t.gameTypes).toContain(GameType.HONKAKU);
        expect([SkillCategory.TRICK, SkillCategory.CLUE_DESIGN]).toContain(t.category);
      }
    });

    it('should prioritize type-specific templates over common ones', async () => {
      const results = await getForGeneration(GameType.HONKAKU, [SkillCategory.CHARACTER_DESIGN]);
      // honkaku-specific template should come before common template
      const specificIdx = results.findIndex(
        (t) => t.gameTypes.length === 1 && t.gameTypes[0] === GameType.HONKAKU,
      );
      const commonIdx = results.findIndex((t) => t.gameTypes.length > 1);
      if (specificIdx !== -1 && commonIdx !== -1) {
        expect(specificIdx).toBeLessThan(commonIdx);
      }
    });

    it('should return empty array when no templates match', async () => {
      // Use a game type with a category that only exists for another type
      // Actually all categories have common templates, so let's use an empty categories array
      const results = await getForGeneration(GameType.HONKAKU, []);
      expect(results).toHaveLength(0);
    });

    it('should return all categories when all are requested', async () => {
      const allCategories = Object.values(SkillCategory);
      const results = await getForGeneration(GameType.HONKAKU, allCategories);
      const resultCategories = new Set(results.map((t) => t.category));
      expect(resultCategories.size).toBe(allCategories.length);
    });
  });

  describe('serialize / deserialize', () => {
    it('should round-trip a valid SkillTemplate', () => {
      const template = getAllTemplates()[0];
      const json = serialize(template);
      const restored = deserialize(json);
      expect(restored).toEqual(template);
    });

    it('should round-trip all loaded templates', () => {
      for (const template of getAllTemplates()) {
        const json = serialize(template);
        const restored = deserialize(json);
        expect(restored).toEqual(template);
      }
    });

    it('should produce valid JSON from serialize', () => {
      const template = getAllTemplates()[0];
      const json = serialize(template);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should throw on invalid JSON string', () => {
      expect(() => deserialize('not json')).toThrow();
    });

    it('should throw on missing id', () => {
      const json = JSON.stringify({
        category: 'trick',
        name: 'test',
        description: 'test',
        gameTypes: ['honkaku'],
        priority: 1,
        content: 'test',
      });
      expect(() => deserialize(json)).toThrow(/id/);
    });

    it('should throw on invalid category', () => {
      const json = JSON.stringify({
        id: 'test-1',
        category: 'invalid_category',
        name: 'test',
        description: 'test',
        gameTypes: ['honkaku'],
        priority: 1,
        content: 'test',
      });
      expect(() => deserialize(json)).toThrow(/category/);
    });

    it('should throw on invalid gameTypes', () => {
      const json = JSON.stringify({
        id: 'test-1',
        category: 'trick',
        name: 'test',
        description: 'test',
        gameTypes: ['invalid_type'],
        priority: 1,
        content: 'test',
      });
      expect(() => deserialize(json)).toThrow(/gameTypes/);
    });

    it('should throw on empty gameTypes array', () => {
      const json = JSON.stringify({
        id: 'test-1',
        category: 'trick',
        name: 'test',
        description: 'test',
        gameTypes: [],
        priority: 1,
        content: 'test',
      });
      expect(() => deserialize(json)).toThrow(/gameTypes/);
    });

    it('should throw on non-numeric priority', () => {
      const json = JSON.stringify({
        id: 'test-1',
        category: 'trick',
        name: 'test',
        description: 'test',
        gameTypes: ['honkaku'],
        priority: 'high',
        content: 'test',
      });
      expect(() => deserialize(json)).toThrow(/priority/);
    });

    it('should throw on non-object JSON', () => {
      expect(() => deserialize('"just a string"')).toThrow();
      expect(() => deserialize('42')).toThrow();
      expect(() => deserialize('null')).toThrow();
    });
  });
});
