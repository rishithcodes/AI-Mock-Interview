import { describe, it, expect } from 'vitest';
import { getRubric, computeOverallScore } from '../utils/domainRubrics';

const ALL_DOMAINS = [
  'Artificial Intelligence',
  'Web Development',
  'Data Science',
  'Cybersecurity',
  'Data analytics',
  'Chartered Accountant',
  'Sales Executive',
];

describe('domainRubrics', () => {
  describe('getRubric', () => {
    it.each(ALL_DOMAINS)('returns a rubric with 3 categories for "%s"', (domain) => {
      const rubric = getRubric(domain);
      expect(rubric.categories).toHaveLength(3);
    });

    it.each(ALL_DOMAINS)('each category has key, label, weight, description for "%s"', (domain) => {
      const rubric = getRubric(domain);
      for (const cat of rubric.categories) {
        expect(cat).toHaveProperty('key');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('weight');
        expect(cat).toHaveProperty('description');
        expect(typeof cat.key).toBe('string');
        expect(typeof cat.weight).toBe('number');
      }
    });

    it.each(ALL_DOMAINS)('weights sum to 1.0 for "%s"', (domain) => {
      const rubric = getRubric(domain);
      const totalWeight = rubric.categories.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it.each(ALL_DOMAINS)('all category keys are unique for "%s"', (domain) => {
      const rubric = getRubric(domain);
      const keys = rubric.categories.map(c => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('returns default rubric for unknown domain', () => {
      const rubric = getRubric('Unknown Domain');
      expect(rubric.categories).toHaveLength(3);
      expect(rubric.categories[0].key).toBe('technicalSkills');
    });
  });

  describe('computeOverallScore', () => {
    it('computes weighted average correctly for AI domain', () => {
      const rubric = getRubric('Artificial Intelligence');
      const scores = { mlFundamentals: 80, toolsAndFrameworks: 70, problemSolving: 90 };
      // 80*0.4 + 70*0.3 + 90*0.3 = 32 + 21 + 27 = 80
      expect(computeOverallScore(scores, rubric)).toBe(80);
    });

    it('computes weighted average correctly for Web Development', () => {
      const rubric = getRubric('Web Development');
      const scores = { frontendSkills: 60, backendSkills: 80, systemDesign: 100 };
      // 60*0.35 + 80*0.35 + 100*0.3 = 21 + 28 + 30 = 79
      expect(computeOverallScore(scores, rubric)).toBe(79);
    });

    it('returns 0 when all scores are 0', () => {
      const rubric = getRubric('Data Science');
      const scores = { statisticalKnowledge: 0, dataEngineering: 0, modelingSkills: 0 };
      expect(computeOverallScore(scores, rubric)).toBe(0);
    });

    it('returns 100 when all scores are 100', () => {
      const rubric = getRubric('Cybersecurity');
      const scores = { securityFundamentals: 100, offensiveSecurity: 100, defensiveSecurity: 100 };
      expect(computeOverallScore(scores, rubric)).toBe(100);
    });

    it('handles missing score keys by treating them as 0', () => {
      const rubric = getRubric('Sales Executive');
      const scores = { salesStrategy: 80 }; // missing communicationSkills, businessAcumen
      // 80*0.35 + 0*0.35 + 0*0.3 = 28
      expect(computeOverallScore(scores, rubric)).toBe(28);
    });
  });
});
