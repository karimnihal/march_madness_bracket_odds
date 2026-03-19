import { useState, useEffect, useMemo, useCallback } from 'react';
import teamsData from '../data/teams.json';
import bracketData from '../data/bracket.json';
import { matchupProb, bracketOdds } from '../utils/odds';
import { getPicksFromHash, getShareURL as buildShareURL } from '../utils/sharing';

const STORAGE_KEY = 'mm2026_picks';

// Build team lookup
const teamsById = {};
teamsData.forEach(t => { teamsById[t.id] = t; });

// Build bracket game structure: all R64 games per region
const regions = ['East', 'South', 'West', 'Midwest'];

// Generate all derived game IDs for rounds after R64
// R64: games 1-8, R32: games 1-4, S16: games 1-2, E8: game 1
function generateGameTree() {
  const games = {};

  // R64 games from data
  for (const region of regions) {
    const matchups = bracketData.regions[region].matchups;
    for (const m of matchups) {
      games[m.id] = {
        id: m.id,
        region,
        round: 64,
        topTeam: m.topTeam,
        bottomTeam: m.bottomTeam,
        moneylines: m.moneylines,
        // Which R64 game index (1-8)
        index: parseInt(m.id.split('-').pop()),
      };
    }

    // R32: pairs of R64 games (1+2, 3+4, 5+6, 7+8)
    for (let i = 1; i <= 4; i++) {
      const id = `${region}-R32-${i}`;
      games[id] = {
        id,
        region,
        round: 32,
        index: i,
        feedsFrom: [
          `${region}-R64-${i * 2 - 1}`,
          `${region}-R64-${i * 2}`,
        ],
      };
    }

    // S16: pairs of R32 games (1+2, 3+4)
    for (let i = 1; i <= 2; i++) {
      const id = `${region}-S16-${i}`;
      games[id] = {
        id,
        region,
        round: 16,
        index: i,
        feedsFrom: [
          `${region}-R32-${i * 2 - 1}`,
          `${region}-R32-${i * 2}`,
        ],
      };
    }

    // E8: S16 game 1 + S16 game 2
    const e8Id = `${region}-E8-1`;
    games[e8Id] = {
      id: e8Id,
      region,
      round: 8,
      index: 1,
      feedsFrom: [`${region}-S16-1`, `${region}-S16-2`],
    };
  }

  // Final Four: East vs South (left), West vs Midwest (right)
  games['F4-1'] = {
    id: 'F4-1',
    round: 4,
    index: 1,
    feedsFrom: ['East-E8-1', 'South-E8-1'],
  };
  games['F4-2'] = {
    id: 'F4-2',
    round: 4,
    index: 2,
    feedsFrom: ['West-E8-1', 'Midwest-E8-1'],
  };

  // Championship
  games['CHAMP'] = {
    id: 'CHAMP',
    round: 2,
    index: 1,
    feedsFrom: ['F4-1', 'F4-2'],
  };

  return games;
}

const gameTree = generateGameTree();

// Find all downstream game IDs from a given game
function getDownstreamGames(gameId) {
  const downstream = [];
  for (const g of Object.values(gameTree)) {
    if (g.feedsFrom && g.feedsFrom.some(f => f === gameId)) {
      downstream.push(g.id);
      downstream.push(...getDownstreamGames(g.id));
    }
  }
  return downstream;
}

export default function useBracket() {
  const [picks, setPicks] = useState(() => {
    // Check URL hash for shared picks first
    const hashPicks = getPicksFromHash();
    if (hashPicks) {
      // Clear hash so it doesn't persist on refresh
      window.history.replaceState(null, '', window.location.pathname);
      const next = { ...hashPicks };
      for (const k of Object.keys(next)) {
        if (k.startsWith('ff')) delete next[k];
      }
      return next;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      if (!parsed || typeof parsed !== 'object') return {};
      for (const k of Object.keys(parsed)) {
        if (k.startsWith('ff')) delete parsed[k];
      }
      return parsed;
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  }, [picks]);

  // Resolve team by ID
  const resolveTeam = useCallback((teamId) => {
    if (!teamId) return null;
    const team = teamsById[teamId];
    if (!team) return null;
    return team;
  }, []);

  // Get the two teams for any game based on picks
  const getGameTeams = useCallback((gameId) => {
    const game = gameTree[gameId];
    if (!game) return [null, null];

    if (game.round === 64) {
      return [resolveTeam(game.topTeam), resolveTeam(game.bottomTeam)];
    }

    // Derived round: teams come from winners of feeder games
    const [feeder1, feeder2] = game.feedsFrom;
    const team1 = picks[feeder1] ? resolveTeam(picks[feeder1]) : null;
    const team2 = picks[feeder2] ? resolveTeam(picks[feeder2]) : null;
    return [team1, team2];
  }, [picks, resolveTeam]);

  // Make a bracket pick
  const makePick = useCallback((gameId, teamId) => {
    setPicks(prev => {
      const next = { ...prev };

      const prevWinner = prev[gameId];

      if (teamId) {
        next[gameId] = teamId;

        // If changing pick, clear all downstream
        if (prevWinner && prevWinner !== teamId) {
          for (const downId of getDownstreamGames(gameId)) {
            delete next[downId];
          }
        }
      } else {
        // Clearing pick: remove this game and all downstream picks
        if (prevWinner) {
          delete next[gameId];
          for (const downId of getDownstreamGames(gameId)) {
            delete next[downId];
          }
        }
      }

      return next;
    });
  }, []);

  // Compute odds for all picked games
  const odds = useMemo(() => {
    const gameResults = {};

    for (const [gameId, winnerId] of Object.entries(picks)) {
      const game = gameTree[gameId];
      if (!game) continue;

      const [team1, team2] = getGameTeams(gameId);
      if (!team1 || !team2) continue;

      const winner = teamsById[winnerId];
      if (!winner) continue;

      const loser = team1.id === winnerId ? team2 : team1;

      let winProb;
      if (game.round === 64 && game.moneylines && game.moneylines !== false) {
        winProb = matchupProb(winner, loser, 64, game.moneylines);
      } else {
        winProb = matchupProb(winner, loser, game.round, null);
      }

      // Map round 2 → 1 for championship display
      const displayRound = game.round === 2 ? 1 : game.round;

      gameResults[gameId] = {
        round: displayRound,
        winProb,
      };
    }

    return bracketOdds(gameResults);
  }, [picks, getGameTeams]);

  // Count picks
  const totalPicks = useMemo(() => {
    return Object.keys(picks).length;
  }, [picks]);

  const isComplete = totalPicks === 63;

  const reset = useCallback(() => {
    setPicks({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Randomly fill all unpicked games across the entire bracket
  const fillRandomBracket = useCallback(() => {
    setPicks(prev => {
      const next = { ...prev };

      // Start with a working copy of picks that we mutate as we go so
      // downstream rounds see the winners we just filled in.
      const workingPicks = { ...next };

      // Local helpers that mirror resolveTeam/getGameTeams but read from workingPicks
      const resolveTeamLocal = (teamId) => {
        if (!teamId) return null;
        const team = teamsById[teamId];
        if (!team) return null;
        return team;
      };

      const getGameTeamsLocal = (gameId) => {
        const game = gameTree[gameId];
        if (!game) return [null, null];

        if (game.round === 64) {
          return [resolveTeamLocal(game.topTeam), resolveTeamLocal(game.bottomTeam)];
        }

        const [feeder1, feeder2] = game.feedsFrom;
        const team1 = workingPicks[feeder1] ? resolveTeamLocal(workingPicks[feeder1]) : null;
        const team2 = workingPicks[feeder2] ? resolveTeamLocal(workingPicks[feeder2]) : null;
        return [team1, team2];
      };

      // Fill bracket games in round order so later rounds see winners from earlier ones
      const roundsInOrder = [64, 32, 16, 8, 4, 2, 1];
      for (const round of roundsInOrder) {
        for (const game of Object.values(gameTree)) {
          if (game.round !== round) continue;
          if (workingPicks[game.id]) continue;

          const [team1, team2] = getGameTeamsLocal(game.id);
          if (!team1 && !team2) continue;

          let winnerId = null;
          if (team1 && team2) {
            winnerId = Math.random() < 0.5 ? team1.id : team2.id;
          } else {
            winnerId = (team1 || team2).id;
          }

          workingPicks[game.id] = winnerId;
          next[game.id] = winnerId;
        }
      }

      return next;
    });
  }, []);

  // Randomly fill unpicked games only in the current round
  const fillRandomRound = useCallback(() => {
    setPicks(prev => {
      const next = { ...prev };

      // Determine the "current" round: the earliest round that still has any unpicked games
      const roundOrder = [64, 32, 16, 8, 4, 2, 1];
      let currentRound = null;
      for (const r of roundOrder) {
        const hasUnpickedInRound = Object.values(gameTree).some(
          (g) => g.round === r && !next[g.id]
        );
        if (hasUnpickedInRound) {
          currentRound = r;
          break;
        }
      }

      // If everything is already filled, nothing to do
      if (currentRound == null) return next;

      // Fill only games in currentRound
      for (const game of Object.values(gameTree)) {
        if (game.round !== currentRound) continue;
        if (next[game.id]) continue;

        const [team1, team2] = getGameTeams(game.id);
        if (!team1 && !team2) continue;

        let winnerId = null;
        if (team1 && team2) {
          winnerId = Math.random() < 0.5 ? team1.id : team2.id;
        } else {
          winnerId = (team1 || team2).id;
        }
        next[game.id] = winnerId;
      }

      return next;
    });
  }, [getGameTeams]);

  const getShareURL = useCallback(() => buildShareURL(picks), [picks]);

  return {
    picks,
    makePick,
    getGameTeams,
    resolveTeam,
    odds,
    totalPicks,
    isComplete,
    reset,
    fillRandomRound,
    fillRandomBracket,
    gameTree,
    teamsById,
    regions,
    getShareURL,
  };
}
