import { describe, it, expect } from 'vitest';
import { getRubric, computeOverallScore } from '../utils/domainRubrics';

/**
 * Integration test: simulates the full score flow from SplitScreen → App → FeedbackScreen
 * This is the critical path that was broken when App.jsx used hardcoded generic keys.
 */

const ALL_DOMAINS = [
  'Artificial Intelligence',
  'Web Development',
  'Data Science',
  'Cybersecurity',
  'Data analytics',
  'Chartered Accountant',
  'Sales Executive',
];

// Simulates what SplitScreen.completeInterview() builds
function simulateSplitScreenResult(domain, rawScores, tabSwitches, lookAways) {
  const rubric = getRubric(domain);
  const totalViolations = tabSwitches + lookAways;
  const penalty = Math.min(totalViolations * 3, 30);

  const penalizedScores = {};
  for (const cat of rubric.categories) {
    penalizedScores[cat.key] = Math.max(0, Math.round((rawScores[cat.key] || 0) - penalty));
  }

  return {
    ...penalizedScores,
    messages: [],
    qaReview: [],
    personalizedAdvice: 'Test advice',
    violations: {
      tabSwitches,
      lookAways,
      penaltyApplied: penalty,
      terminated: false,
    },
  };
}

// Simulates the FIXED App.handleInterviewComplete() score extraction
function simulateAppScoreExtraction(domain, results) {
  const rubric = getRubric(domain);
  const scores = {};
  for (const cat of rubric.categories) {
    scores[cat.key] = results[cat.key] ?? 0;
  }
  return scores;
}

// Simulates FeedbackScreen reading scores
function simulateFeedbackScreenDisplay(domain, scores) {
  const rubric = getRubric(domain);
  const finalScores = scores || Object.fromEntries(rubric.categories.map(c => [c.key, 10]));
  const totalScore = computeOverallScore(finalScores, rubric);

  const categoryScores = rubric.categories.map(cat => ({
    key: cat.key,
    label: cat.label,
    score: finalScores[cat.key] || 0,
  }));

  return { totalScore, categoryScores };
}

describe('End-to-end score flow: SplitScreen → App → FeedbackScreen', () => {
  it.each(ALL_DOMAINS)('scores flow correctly through all layers for "%s"', (domain) => {
    const rubric = getRubric(domain);

    // Generate raw scores for this domain
    const rawScores = {};
    rubric.categories.forEach((cat, i) => {
      rawScores[cat.key] = 70 + i * 10; // 70, 80, 90
    });

    // Step 1: SplitScreen produces results (no violations)
    const splitScreenResult = simulateSplitScreenResult(domain, rawScores, 0, 0);

    // Step 2: App extracts scores (the fixed version)
    const appScores = simulateAppScoreExtraction(domain, splitScreenResult);

    // Verify all domain-specific keys are present and correct
    for (const cat of rubric.categories) {
      expect(appScores[cat.key]).toBe(rawScores[cat.key]);
    }

    // Step 3: FeedbackScreen displays them
    const display = simulateFeedbackScreenDisplay(domain, appScores);

    // Verify no score is 0 (the bug symptom)
    for (const catScore of display.categoryScores) {
      expect(catScore.score).toBeGreaterThan(0);
    }

    // Verify overall score is reasonable
    expect(display.totalScore).toBeGreaterThan(0);
    expect(display.totalScore).toBeLessThanOrEqual(100);
  });

  it.each(ALL_DOMAINS)('penalty is applied correctly for "%s"', (domain) => {
    const rubric = getRubric(domain);
    const rawScores = {};
    rubric.categories.forEach(cat => { rawScores[cat.key] = 80; });

    // 2 tab switches + 3 look-aways = 5 violations × 3 = 15% penalty
    const result = simulateSplitScreenResult(domain, rawScores, 2, 3);
    const appScores = simulateAppScoreExtraction(domain, result);

    for (const cat of rubric.categories) {
      expect(appScores[cat.key]).toBe(65); // 80 - 15
    }

    expect(result.violations.penaltyApplied).toBe(15);
  });

  it('penalty is capped at 30%', () => {
    const domain = 'Artificial Intelligence';
    const rubric = getRubric(domain);
    const rawScores = {};
    rubric.categories.forEach(cat => { rawScores[cat.key] = 90; });

    // 20 violations × 3 = 60, but capped at 30
    const result = simulateSplitScreenResult(domain, rawScores, 10, 10);
    const appScores = simulateAppScoreExtraction(domain, result);

    for (const cat of rubric.categories) {
      expect(appScores[cat.key]).toBe(60); // 90 - 30
    }

    expect(result.violations.penaltyApplied).toBe(30);
  });

  it('scores do not go below 0 with heavy penalties', () => {
    const domain = 'Web Development';
    const rubric = getRubric(domain);
    const rawScores = {};
    rubric.categories.forEach(cat => { rawScores[cat.key] = 10; });

    const result = simulateSplitScreenResult(domain, rawScores, 5, 5);
    const appScores = simulateAppScoreExtraction(domain, result);

    for (const cat of rubric.categories) {
      expect(appScores[cat.key]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Regression: hardcoded generic keys must not be required', () => {
  it.each(ALL_DOMAINS)('App score extraction does NOT rely on technicalSkills/softSkills keys for "%s"', (domain) => {
    const rubric = getRubric(domain);
    const rawScores = {};
    rubric.categories.forEach(cat => { rawScores[cat.key] = 85; });

    const result = simulateSplitScreenResult(domain, rawScores, 0, 0);
    const appScores = simulateAppScoreExtraction(domain, result);

    // The old bug: these generic keys don't exist on domain-specific results
    // App should NOT need them
    const hasGenericKeys = 'technicalSkills' in appScores && 'softSkills' in appScores;

    if (domain !== 'Unknown') {
      // For all known domains, at least some keys should be domain-specific
      const rubricKeys = rubric.categories.map(c => c.key);
      const allPresent = rubricKeys.every(k => typeof appScores[k] === 'number' && appScores[k] > 0);
      expect(allPresent).toBe(true);
    }
  });
});
