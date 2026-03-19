import teamsData from '../data/teams.json';

// Build sorted team ID list
const allTeamIds = new Set(teamsData.map(t => t.id));
const TEAM_LIST = [...allTeamIds].sort();
const TEAM_TO_IDX = {};
TEAM_LIST.forEach((id, i) => { TEAM_TO_IDX[id] = i; });

const UNPICKED = 255;

// Deterministic game ID order: FF games, then bracket games by region/round
const regions = ['East', 'South', 'West', 'Midwest'];
const GAME_IDS = [];

// Regional rounds
for (const region of regions) {
  for (const { prefix, count } of [
    { prefix: 'R64', count: 8 },
    { prefix: 'R32', count: 4 },
    { prefix: 'S16', count: 2 },
    { prefix: 'E8', count: 1 },
  ]) {
    for (let i = 1; i <= count; i++) {
      GAME_IDS.push(`${region}-${prefix}-${i}`);
    }
  }
}

// Final Four + Championship
GAME_IDS.push('F4-1', 'F4-2', 'CHAMP');

export function encodePicks(picks) {
  const bytes = new Uint8Array(GAME_IDS.length);
  for (let i = 0; i < GAME_IDS.length; i++) {
    const teamId = picks[GAME_IDS[i]];
    bytes[i] = teamId && TEAM_TO_IDX[teamId] != null ? TEAM_TO_IDX[teamId] : UNPICKED;
  }
  // base64url encode
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePicks(str) {
  // base64url decode
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const picks = {};
  for (let i = 0; i < Math.min(binary.length, GAME_IDS.length); i++) {
    const idx = binary.charCodeAt(i);
    if (idx !== UNPICKED && idx < TEAM_LIST.length) {
      picks[GAME_IDS[i]] = TEAM_LIST[idx];
    }
  }
  return picks;
}

export function getShareURL(picks) {
  const encoded = encodePicks(picks);
  return `${window.location.origin}${window.location.pathname}#picks=${encoded}`;
}

export function getPicksFromHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#picks=')) return null;
  try {
    return decodePicks(hash.slice(7));
  } catch {
    return null;
  }
}
