/**
 * Scoring System for Bolão Copa 2026
 *
 * Points are configurable via the admin panel and stored in scoring_config table.
 * Defaults: Exact=10, OutcomeGoalDiff=7, Outcome=5, Wrong=0
 * Bonus: Champion=15, TopScorer=10
 */

export interface ScoringConfig {
  exactScore: number;
  correctOutcomeGoalDiff: number;
  correctOutcome: number;
  wrongOutcome: number;
  bonusChampion: number;
  bonusTopScorer: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  exactScore: 10,
  correctOutcomeGoalDiff: 7,
  correctOutcome: 5,
  wrongOutcome: 0,
  bonusChampion: 15,
  bonusTopScorer: 10,
};

export interface BetScoreResult {
  points: number;
  exactScore: boolean;
  correctOutcome: boolean;
  correctGoalDiff: boolean;
}

function getOutcome(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calculateBetPoints(
  betHome: number,
  betAway: number,
  actualHome: number,
  actualAway: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): BetScoreResult {
  const betOutcome = getOutcome(betHome, betAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  const exactScore = betHome === actualHome && betAway === actualAway;
  const correctOutcome = betOutcome === actualOutcome;
  const correctGoalDiff =
    betHome - betAway === actualHome - actualAway && !exactScore;

  let points = config.wrongOutcome;
  if (exactScore) {
    points = config.exactScore;
  } else if (correctOutcome && correctGoalDiff) {
    points = config.correctOutcomeGoalDiff;
  } else if (correctOutcome) {
    points = config.correctOutcome;
  }

  return { points, exactScore, correctOutcome, correctGoalDiff };
}
