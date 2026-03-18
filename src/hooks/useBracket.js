import { useState, useEffect, useMemo, useCallback } from 'react';
import teamsData from '../data/teams.json';
import firstFourData from '../data/firstFour.json';
import bracketData from '../data/bracket.json';
import { matchupProb, bracketOdds } from '../utils/odds';
import { getPicksFromHash, getShareURL as buildShareURL } from '../utils/sharing';

const STORAGE_KEY = 'mm2026_picks';

// Build team lookup
const teamsById = {};
teamsData.forEach(t => { teamsById[t.id] = t; });

// Ensure individual First Four participants exist as team entries
firstFourData.forEach(ff => {
  ff.teams.forEach((teamId, idx) => {
    if (!teamsById[teamId]) {
      teamsById[teamId] = {
        id: teamId,
        name: ff.teamNames[idx],
        shortName: ff.teamNames[idx],
        seed: ff.seed,
        region: ff.feedsInto.region,
        champOdds: {},
        champProb: 0,
        isFirstFourParticipant: true,
      };
    }
  });
});

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

// Map First Four slot IDs to their FF game data
const ffSlotToGame = {};
firstFourData.forEach(ff => {
  ffSlotToGame[ff.feedsInto.slotTeamId] = ff;
});

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

// Find R64 games that depend on a First Four slot
function getR64GamesForFFSlot(slotTeamId) {
  return Object.values(gameTree).filter(
    g => g.round === 64 && (g.topTeam === slotTeamId || g.bottomTeam === slotTeamId)
  );
}

export default function useBracket() {
  const [picks, setPicks] = useState(() => {
    // Check URL hash for shared picks first
    const hashPicks = getPicksFromHash();
    if (hashPicks) {
      // Clear hash so it doesn't persist on refresh
      window.history.replaceState(null, '', window.location.pathname);
      return hashPicks;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  }, [picks]);

  // Resolve which team is in a slot (handles First Four placeholders)
  const resolveTeam = useCallback((teamId) => {
    if (!teamId) return null;
    const team = teamsById[teamId];
    if (!team) return null;
    if (team.isFirstFourSlot) {
      // Check if FF game has been picked
      const ffGame = ffSlotToGame[teamId];
      if (ffGame && picks[ffGame.id]) {
        return teamsById[picks[ffGame.id]];
      }
      return { ...team, placeholder: true, ffGame };
    }
    return team;
  }, [picks]);

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

  // Make a First Four pick
  const makeFFPick = useCallback((ffGameId, teamId) => {
    setPicks(prev => {
      const next = { ...prev };
      if (teamId) {
        next[ffGameId] = teamId;
      } else {
        delete next[ffGameId];
      }

      // Find the FF game to get the slot it feeds into
      const ffGame = firstFourData.find(f => f.id === ffGameId);
      if (!ffGame) return next;

      // If changing pick, clear downstream from the R64 game this feeds
      const r64Games = getR64GamesForFFSlot(ffGame.feedsInto.slotTeamId);
      for (const r64 of r64Games) {
        // Clear the R64 pick and all downstream
        delete next[r64.id];
        for (const downId of getDownstreamGames(r64.id)) {
          delete next[downId];
        }
      }

      return next;
    });
  }, []);

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
      // Skip FF picks (they're tracked separately)
      if (gameId.startsWith('ff')) continue;

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

  const isComplete = totalPicks === 67; // 4 FF + 63 bracket

  const reset = useCallback(() => {
    setPicks({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Randomly fill all unpicked games (including First Four) across the entire bracket
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
        if (team.isFirstFourSlot) {
          const ffGame = ffSlotToGame[teamId];
          if (ffGame && workingPicks[ffGame.id]) {
            return teamsById[workingPicks[ffGame.id]];
          }
          return { ...team, placeholder: true, ffGame };
        }
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

      // Fill First Four games
      for (const ff of firstFourData) {
        if (!workingPicks[ff.id]) {
          const [t1, t2] = ff.teams;
          const choice = Math.random() < 0.5 ? t1 : t2;
          workingPicks[ff.id] = choice;
          next[ff.id] = choice;
        }
      }

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

  // Randomly fill unpicked games only in the current round (and First Four)
  const fillRandomRound = useCallback(() => {
    setPicks(prev => {
      const next = { ...prev };

      // Fill First Four games
      for (const ff of firstFourData) {
        if (!next[ff.id]) {
          const [t1, t2] = ff.teams;
          const choice = Math.random() < 0.5 ? t1 : t2;
          next[ff.id] = choice;
        }
      }

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
    makeFFPick,
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
    firstFourData,
    regions,
    getShareURL,
  };
}
