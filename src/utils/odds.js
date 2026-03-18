import seedHistory from '../data/seedHistory.json';
import teamsData from '../data/teams.json';
import firstFourData from '../data/firstFour.json';

// American moneyline → implied probability
export function impliedProb(moneyline) {
  if (moneyline > 0) return 100 / (moneyline + 100);
  return -moneyline / (-moneyline + 100);
}

// Remove vig by normalizing probs to sum to 1
export function devig(probs) {
  const total = probs.reduce((a, b) => a + b, 0);
  return probs.map(p => p / total);
}

// Bill James Log5: P(A beats B) from each team's strength vs average opponent
export function log5(pA, pB) {
  if (pA == null || pB == null || Number.isNaN(pA) || Number.isNaN(pB)) {
    return 0.5;
  }

  // Clamp away from 0/1 to avoid degenerate probabilities and division issues
  const EPS = 1e-9;
  const clamp = (p) => {
    if (!Number.isFinite(p)) return 0.5;
    if (p <= 0) return EPS;
    if (p >= 1) return 1 - EPS;
    return p;
  };

  const a = clamp(pA);
  const b = clamp(pB);

  const denom = a + b - 2 * a * b;
  if (Math.abs(denom) < EPS) {
    return 0.5;
  }

  return (a - a * b) / denom;
}

const ROUND_TO_HISTORY_KEY = {
  64: 'R64',
  32: 'R32',
  16: 'S16',
  8: 'E8',
  4: 'F4',
  2: 'NCG',
  firstFour: 'R64',
};

const ROUND_TO_ADVANCEMENT_KEY = {
  64: 'R32',
  32: 'S16',
  16: 'E8',
  8: 'F4',
  4: 'NCG',
  2: 'NC',
  firstFour: 'R32',
};

const SEED_RANGE_MIN = 1;
const SEED_RANGE_MAX = 16;
const EPS = 1e-9;

const seedToChampProbs = {};
for (const team of teamsData) {
  if (!team || team.isFirstFourSlot) continue;
  if (!Number.isFinite(team.seed) || !Number.isFinite(team.champProb)) continue;
  if (!seedToChampProbs[team.seed]) seedToChampProbs[team.seed] = [];
  seedToChampProbs[team.seed].push(team.champProb);
}

const seedMedianChampProb = {};
for (let seed = SEED_RANGE_MIN; seed <= SEED_RANGE_MAX; seed++) {
  const values = (seedToChampProbs[seed] || []).slice().sort((a, b) => a - b);
  if (values.length === 0) {
    seedMedianChampProb[seed] = null;
    continue;
  }
  const mid = Math.floor(values.length / 2);
  seedMedianChampProb[seed] = values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
}

const teamsById = {};
for (const team of teamsData) {
  if (team?.id) teamsById[team.id] = team;
}

const ffSlotToGame = {};
for (const ff of firstFourData) {
  ffSlotToGame[ff.feedsInto.slotTeamId] = ff;
  ff.teams.forEach((teamId, idx) => {
    if (!teamsById[teamId]) {
      teamsById[teamId] = {
        id: teamId,
        name: ff.teamNames[idx],
        shortName: ff.teamNames[idx],
        seed: ff.seed,
        region: ff.feedsInto.region,
        champProb: 0,
        isFirstFourParticipant: true,
      };
    }
  });
}

const clampSeed = (seed) => Math.max(SEED_RANGE_MIN, Math.min(SEED_RANGE_MAX, Math.round(seed)));
const clampProb = (p) => Math.max(EPS, Math.min(1 - EPS, p));
const roundToHistoryKey = (round) => ROUND_TO_HISTORY_KEY[round] || 'R32';
const roundToAdvKey = (round) => ROUND_TO_ADVANCEMENT_KEY[round] || 'S16';

function getSeedPair(seedA, seedB) {
  return [Math.min(seedA, seedB), Math.max(seedA, seedB)];
}

function getSeedMatchupEntry(seedA, seedB, round) {
  const key = roundToHistoryKey(round);
  const table = seedHistory[key];
  if (!table) return null;
  const [better, worse] = getSeedPair(seedA, seedB);
  const entry = table[`${better}-${worse}`];
  if (!entry) return null;
  return { entry, better, worse };
}

function getHistoricalSeedProb(seedA, seedB, round) {
  if (seedA === seedB) return null;
  const info = getSeedMatchupEntry(seedA, seedB, round);
  if (!info) return null;
  const { entry, better } = info;
  const base = seedA === better ? entry.higherSeedWinPct : 1 - entry.higherSeedWinPct;
  const sampleConfidence = Math.min(1, (entry.games || 0) / 40);
  const samplePenalty = entry.smallSample ? 0.55 : 1;
  return {
    prob: clampProb(base),
    confidence: clampProb(sampleConfidence * samplePenalty),
  };
}

function interpolateSeedMatchupProb(seedA, seedB, round) {
  if (seedA === seedB) return null;
  const key = roundToHistoryKey(round);
  const table = seedHistory[key];
  if (!table) return null;
  const [better, worse] = getSeedPair(seedA, seedB);
  const targetGap = worse - better;

  const candidates = Object.entries(table)
    .filter(([k, v]) => k.includes('-') && v && Number.isFinite(v.higherSeedWinPct))
    .map(([k, v]) => {
      const [a, b] = k.split('-').map(Number);
      const gap = b - a;
      const distance = Math.abs(a - better) + Math.abs(gap - targetGap);
      const sample = Math.max(1, v.games || 1);
      const weight = (1 / (1 + distance)) * Math.log2(sample + 1) * (v.smallSample ? 0.5 : 1);
      return { a, pct: v.higherSeedWinPct, weight, sample };
    })
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 5);

  if (!candidates.length) return null;
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight <= 0) return null;
  const weightedHigherSeedProb = candidates.reduce((sum, c) => sum + c.pct * c.weight, 0) / totalWeight;
  const oriented = seedA < seedB ? weightedHigherSeedProb : 1 - weightedHigherSeedProb;
  const avgSample = candidates.reduce((sum, c) => sum + c.sample, 0) / candidates.length;
  return {
    prob: clampProb(oriented),
    confidence: Math.min(0.75, Math.max(0.2, avgSample / 60)),
  };
}

function getAdvancementStrength(seed, round) {
  const seedKey = String(clampSeed(seed));
  const roundKey = roundToAdvKey(round);
  const bySeed = seedHistory.seedAdvancement?.[seedKey];
  const val = bySeed?.[roundKey];
  if (!Number.isFinite(val)) return 0.5;
  return clampProb(val);
}

function advancementHeadToHeadProb(seedA, seedB, round) {
  const a = getAdvancementStrength(seedA, round);
  const b = getAdvancementStrength(seedB, round);
  return clampProb(a / (a + b));
}

function getMarketStrength(team) {
  if (!team) return 0.5;
  const p = Number.isFinite(team.champProb) ? team.champProb : 0.001;
  return clampProb(p);
}

function getClosestMarketSeed(champProb) {
  let bestSeed = 8;
  let bestDist = Infinity;
  const cp = clampProb(champProb);
  const cpLog = Math.log(cp);
  for (let seed = SEED_RANGE_MIN; seed <= SEED_RANGE_MAX; seed++) {
    const median = seedMedianChampProb[seed];
    if (!Number.isFinite(median) || median <= 0) continue;
    const dist = Math.abs(cpLog - Math.log(median));
    if (dist < bestDist) {
      bestDist = dist;
      bestSeed = seed;
    }
  }
  return bestSeed;
}

function getPseudoSeed(team) {
  const official = clampSeed(team?.seed || 8);
  const marketSeed = getClosestMarketSeed(getMarketStrength(team));
  const rawShift = marketSeed - official;
  const boundedShift = Math.max(-2, Math.min(2, Math.round(rawShift * 0.75)));
  return clampSeed(official + boundedShift);
}

function combinedSeedProb(teamA, teamB, round) {
  const seedA = getPseudoSeed(teamA);
  const seedB = getPseudoSeed(teamB);

  const direct = getHistoricalSeedProb(seedA, seedB, round);
  const interp = direct ? null : interpolateSeedMatchupProb(seedA, seedB, round);
  const advProb = advancementHeadToHeadProb(seedA, seedB, round);
  const marketProb = log5(getMarketStrength(teamA), getMarketStrength(teamB));

  let seedCoreProb;
  let seedConfidence;
  if (direct) {
    seedCoreProb = (direct.prob * 0.72) + (advProb * 0.28);
    seedConfidence = 0.65 + (0.25 * direct.confidence);
  } else if (interp) {
    seedCoreProb = (interp.prob * 0.62) + (advProb * 0.38);
    seedConfidence = 0.42 + (0.28 * interp.confidence);
  } else {
    seedCoreProb = advProb;
    seedConfidence = 0.35;
  }

  const roundMarketWeight = {
    64: 0.18,
    32: 0.2,
    16: 0.24,
    8: 0.28,
    4: 0.32,
    2: 0.34,
    firstFour: 0.18,
  };
  const marketWeight = roundMarketWeight[round] ?? 0.24;

  // Seed history should dominate, with market acting as an in-bucket tiebreaker.
  const blended = (seedCoreProb * (1 - marketWeight)) + (marketProb * marketWeight);
  const confidenceBlended = (blended * seedConfidence) + (marketProb * (1 - seedConfidence));
  return clampProb(confidenceBlended);
}

// Get win probability for teamA in a matchup
// FirstFour and R64 with real lines: use moneylines
// R64 without lines and R32+: use seed-history weighted blended model
export function matchupProb(teamA, teamB, round, moneylines) {
  const useMoneyline =
    (round === 64 || round === 'firstFour') &&
    moneylines &&
    moneylines[teamA.id] != null &&
    moneylines[teamB.id] != null;

  if (useMoneyline) {
    const rawA = impliedProb(moneylines[teamA.id]);
    const rawB = impliedProb(moneylines[teamB.id]);
    if (!Number.isFinite(rawA) || !Number.isFinite(rawB)) {
      return combinedSeedProb(teamA, teamB, round);
    }
    const [dA] = devig([rawA, rawB]);
    return dA;
  }

  return combinedSeedProb(teamA, teamB, round);
}

function addToDistribution(distribution, teamId, prob) {
  if (!teamId || !Number.isFinite(prob) || prob <= 0) return;
  distribution[teamId] = (distribution[teamId] || 0) + prob;
}

function normalizeDistribution(distribution) {
  const total = Object.values(distribution).reduce((sum, p) => sum + p, 0);
  if (total <= 0) return distribution;
  const normalized = {};
  for (const [teamId, prob] of Object.entries(distribution)) {
    normalized[teamId] = prob / total;
  }
  return normalized;
}

function getSlotTeamDistribution(teamId) {
  const ffGame = ffSlotToGame[teamId];
  if (!ffGame) {
    return teamsById[teamId] ? { [teamId]: 1 } : {};
  }

  const [aId, bId] = ffGame.teams;
  const teamA = teamsById[aId];
  const teamB = teamsById[bId];
  if (!teamA || !teamB) return {};

  const winA = matchupProb(teamA, teamB, 'firstFour', ffGame.moneylines || null);
  return {
    [aId]: winA,
    [bId]: 1 - winA,
  };
}

function getWinnerDistribution(gameId, gameTree, memo = new Map()) {
  if (memo.has(gameId)) return memo.get(gameId);

  const game = gameTree[gameId];
  if (!game) {
    const empty = {};
    memo.set(gameId, empty);
    return empty;
  }

  let sideADist = {};
  let sideBDist = {};

  if (game.round === 64) {
    sideADist = getSlotTeamDistribution(game.topTeam);
    sideBDist = getSlotTeamDistribution(game.bottomTeam);
  } else if (game.feedsFrom?.length === 2) {
    sideADist = getWinnerDistribution(game.feedsFrom[0], gameTree, memo);
    sideBDist = getWinnerDistribution(game.feedsFrom[1], gameTree, memo);
  }

  const winnerDist = {};
  for (const [teamAId, teamAReachProb] of Object.entries(sideADist)) {
    const teamA = teamsById[teamAId];
    if (!teamA) continue;
    for (const [teamBId, teamBReachProb] of Object.entries(sideBDist)) {
      const teamB = teamsById[teamBId];
      if (!teamB || teamAId === teamBId) continue;
      const matchupReachProb = teamAReachProb * teamBReachProb;
      if (matchupReachProb <= 0) continue;

      const teamAWin = matchupProb(teamA, teamB, game.round, game.moneylines || null);
      addToDistribution(winnerDist, teamAId, matchupReachProb * teamAWin);
      addToDistribution(winnerDist, teamBId, matchupReachProb * (1 - teamAWin));
    }
  }

  const normalized = normalizeDistribution(winnerDist);
  memo.set(gameId, normalized);
  return normalized;
}

function getGameSideDistributions(gameId, gameTree) {
  const game = gameTree[gameId];
  if (!game) return null;
  const memo = new Map();

  if (game.round === 64) {
    return {
      top: normalizeDistribution(getSlotTeamDistribution(game.topTeam)),
      bottom: normalizeDistribution(getSlotTeamDistribution(game.bottomTeam)),
    };
  }

  if (!game.feedsFrom || game.feedsFrom.length !== 2) return null;
  return {
    top: normalizeDistribution(getWinnerDistribution(game.feedsFrom[0], gameTree, memo)),
    bottom: normalizeDistribution(getWinnerDistribution(game.feedsFrom[1], gameTree, memo)),
  };
}

export function getPathProbForGame(gameId, gameTree, picks, getGameTeams) {
  const game = gameTree[gameId];
  if (!game || !game.feedsFrom) return null;

  let prob = 1;
  for (const feederId of game.feedsFrom) {
    const [t1, t2] = getGameTeams(feederId);
    if (!t1 || !t2 || !picks[feederId]) return null;

    const feederGame = gameTree[feederId];
    const winnerId = picks[feederId];
    const winnerTeam = t1.id === winnerId ? t1 : t2;
    const loserTeam = t1.id === winnerId ? t2 : t1;

    const winProb = matchupProb(
      winnerTeam,
      loserTeam,
      feederGame.round,
      feederGame.moneylines || null
    );

    const feederPathProb = getPathProbForGame(feederId, gameTree, picks, getGameTeams);
    const feederProb = feederPathProb != null ? feederPathProb * winProb : winProb;
    prob *= feederProb;
  }

  return prob;
}

export function getNormalizedMatchupOddsForGame(gameId, gameTree, _picks, getGameTeams) {
  const game = gameTree[gameId];
  if (!game || !game.feedsFrom) return null;

  const [team1, team2] = getGameTeams(gameId);
  if (!team1 || !team2 || team1.placeholder || team2.placeholder) return null;

  const distributions = getGameSideDistributions(gameId, gameTree);
  if (!distributions) return null;

  const topProb = distributions.top[team1.id];
  const bottomProb = distributions.bottom[team2.id];
  if (!Number.isFinite(topProb) || !Number.isFinite(bottomProb)) return null;

  let allPairingsProb = 0;
  for (const topReachProb of Object.values(distributions.top)) {
    for (const bottomReachProb of Object.values(distributions.bottom)) {
      allPairingsProb += topReachProb * bottomReachProb;
    }
  }
  if (allPairingsProb <= 0) return null;

  const selectedPairingProb = topProb * bottomProb;
  return selectedPairingProb / allPairingsProb;
}

// Compute per-round and total bracket odds from picks
// picks: { gameId: teamId }
// gameResults: { gameId: { winner, loser, winProb } }
export function bracketOdds(gameResults) {
  const roundKeys = {
    64: 'R64',
    32: 'R32',
    16: 'S16',
    8: 'E8',
    4: 'F4',
    2: 'F',
    1: 'C',
  };

  const result = { R64: null, R32: null, S16: null, E8: null, F4: null, F: null, C: null, total: null };

  let totalProb = 1;
  let hasPicks = false;

  for (const [round, key] of Object.entries(roundKeys)) {
    const roundGames = Object.values(gameResults).filter(g => g.round === Number(round));
    if (roundGames.length === 0) continue;

    let roundProb = 1;
    for (const game of roundGames) {
      roundProb *= game.winProb;
    }
    result[key] = roundProb;
    totalProb *= roundProb;
    hasPicks = true;
  }

  if (hasPicks) result.total = totalProb;
  return result;
}

// Format probability as "1 in X" with worded large units and extra granularity under 1 in 10
export function formatOdds(prob) {
  if (prob == null) return '—';

  // Treat exact zeros as “extremely small but non-zero” so we can still display a ratio
  let p = prob <= 0 ? Number.MIN_VALUE : prob;

  const rawX = 1 / p;

  // For relatively common events, use compact \"> 1 in 2\" / half-step formatting
  if (rawX <= 2) {
    return '> 1 in 2';
  }

  if (rawX < 10) {
    const halfStep = Math.round(rawX * 2) / 2;
    const display = halfStep >= 10 ? 10 : halfStep;
    return `1 in ${display}`;
  }

  const x = Math.round(rawX);
  if (x <= 1) return '1 in 1';

  if (x >= 1e33) {
    const exp = Math.log10(x);
    if (!Number.isFinite(exp)) {
      return 'So small our calculator blew up.';
    }
    return `1 in 10^${exp}`;
  }
  if (x >= 1e30) return `1 in ${(x / 1e30).toFixed(1)} Nonillion`;
  if (x >= 1e27) return `1 in ${(x / 1e27).toFixed(1)} Octillion`;
  if (x >= 1e24) return `1 in ${(x / 1e24).toFixed(1)} Septillion`;
  if (x >= 1e21) return `1 in ${(x / 1e21).toFixed(1)} Sextillion`;
  if (x >= 1e18) return `1 in ${(x / 1e18).toFixed(1)} Quintillion`;
  if (x >= 1e15) return `1 in ${(x / 1e15).toFixed(1)} Quadrillion`;
  if (x >= 1e12) return `1 in ${(x / 1e12).toFixed(1)} Trillion`;
  if (x >= 1e9) return `1 in ${(x / 1e9).toFixed(1)} Billion`;
  if (x >= 1e6) return `1 in ${(x / 1e6).toFixed(1)} Million`;
  return `1 in ${x.toLocaleString()}`;
}

// Average pre-tournament Vegas championship odds (American format)
export function formatVegasChampOdds(team) {
  const odds = team?.champOdds;
  if (!odds || typeof odds !== 'object') return '—';
  const values = Object.values(odds).filter(v => v != null && Number.isFinite(v));
  if (values.length === 0) return '—';
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return avg >= 0 ? `+${avg}` : `${avg}`;
}