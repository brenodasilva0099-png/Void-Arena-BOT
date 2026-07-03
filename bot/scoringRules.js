const VOID_ARENA_SCORING_RULES = Object.freeze({
  name: 'Void Arena Points',
  abbreviation: 'VAP',
  description: 'Pontuação oficial da Void Arena para rankings de times e jogadores.',
  match: Object.freeze({
    win: 3,
    draw: 1,
    loss: 0,
    goal: 0.5,
    cleanSheet: 1,
    walkoverWin: 2,
    walkoverLoss: -2,
    participation: 2
  }),
  placement: Object.freeze({
    champion: 30,
    runnerUp: 20,
    thirdPlace: 14,
    fourthPlace: 10,
    semifinalist: 8,
    quarterfinalist: 5
  }),
  eventMultiplier: Object.freeze({
    scrim: 0.5,
    small: 1,
    official: 1.5,
    main: 2,
    elite: 2.5
  }),
  tiebreakers: Object.freeze([
    'points',
    'wins',
    'goalDifference',
    'goalsFor',
    'headToHead',
    'fewestLosses',
    'manualAdminDecision'
  ])
});

function roundPoints(value = 0) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 10) / 10;
}

function resultPoints({ result = 'loss', goalsFor = 0, goalsAgainst = 0, multiplier = 1 } = {}) {
  const safeResult = ['win', 'draw', 'loss'].includes(result) ? result : 'loss';
  const base =
    VOID_ARENA_SCORING_RULES.match[safeResult] +
    (Number(goalsFor || 0) * VOID_ARENA_SCORING_RULES.match.goal) +
    (Number(goalsAgainst || 0) === 0 ? VOID_ARENA_SCORING_RULES.match.cleanSheet : 0);

  return roundPoints(base * (Number(multiplier || 1) || 1));
}

function eventTypeMultiplier(type = 'small') {
  const key = String(type || 'small').trim().toLowerCase();
  return VOID_ARENA_SCORING_RULES.eventMultiplier[key] || VOID_ARENA_SCORING_RULES.eventMultiplier.small;
}

module.exports = {
  VOID_ARENA_SCORING_RULES,
  roundPoints,
  resultPoints,
  eventTypeMultiplier
};
