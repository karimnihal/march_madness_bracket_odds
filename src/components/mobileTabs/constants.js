export const TABS = ['First Four', 'R64', 'R32', 'S16', 'E8', 'Championship', 'Full'];

export const SHORT = { 'First Four': 'FF', 'R64': '64', 'R32': '32', 'S16': '16', 'E8': 'E8', 'Championship': 'CH', 'Full': 'ALL' };
export const LABELS = { 'First Four': 'First 4', 'R64': 'Rd of 64', 'R32': 'Rd of 32', 'S16': 'Sweet 16', 'E8': 'Elite 8', 'Championship': 'Champ', 'Full': 'Full' };

export const REGIONS = ['East', 'South', 'West', 'Midwest'];

export const ROUND_GAME_IDS = (() => {
  const ids = {};
  for (const { tab, prefix, count } of [
    { tab: 'R64', prefix: 'R64', count: 8 },
    { tab: 'R32', prefix: 'R32', count: 4 },
    { tab: 'S16', prefix: 'S16', count: 2 },
    { tab: 'E8', prefix: 'E8', count: 1 },
  ]) {
    const tabIds = [];
    for (const region of REGIONS) {
      for (let i = 1; i <= count; i++) tabIds.push(`${region}-${prefix}-${i}`);
    }
    ids[tab] = tabIds;
  }
  return ids;
})();

export const CHAMP_GAME_IDS = ['F4-1', 'F4-2', 'CHAMP'];

