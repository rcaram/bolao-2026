/**
 * Scoring System for Bolão Copa 2026
 *
 * Exact score:                 10 points
 * Correct outcome + goal diff:  7 points
 * Correct outcome only:         5 points
 * Wrong outcome:                0 points
 *
 * Bonus:
 *   Champion prediction:       15 points
 *   Top scorer prediction:     10 points
 */

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
  actualAway: number
): BetScoreResult {
  const betOutcome = getOutcome(betHome, betAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  const exactScore = betHome === actualHome && betAway === actualAway;
  const correctOutcome = betOutcome === actualOutcome;
  const correctGoalDiff =
    betHome - betAway === actualHome - actualAway && !exactScore;

  let points = 0;
  if (exactScore) {
    points = 10;
  } else if (correctOutcome && correctGoalDiff) {
    points = 7;
  } else if (correctOutcome) {
    points = 5;
  }

  return { points, exactScore, correctOutcome, correctGoalDiff };
}
