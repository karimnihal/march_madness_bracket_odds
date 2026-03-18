# March Madness Bracket Odds

A stateless, purely client-side React app for picking an NCAA Men’s Tournament bracket where **every pick is paired with Vegas-derived win probabilities**.

Instead of trying to “recommend” picks, the app focuses on one thing: **showing you, in real time, how improbable your bracket is** as you fill it out.

## What it does

- **Pick a full bracket** (including First Four, if present in the data).
- **See per-game win probabilities**:
  - Round of 64 + First Four use **moneyline-implied probabilities** (de-vigged).
  - Later rounds use **Log5** derived from teams’ championship implied probabilities.
- **Track cumulative bracket odds** as you pick: a sticky tracker compounds the probability of your chosen winners and displays it as **“1 in X”**.
- **Export** your completed bracket as an image (via `html2canvas`).

## How the math works (high level)

- **First Four + most Round of 64 games**: we convert DraftKings American moneylines to implied probability and **de-vig** by normalizing both teams to sum to 1.
- **Round of 64 games without posted lines** (the games fed by First Four) and **Round of 32 through Championship**: we use a **seed-history–led blended model**:
  - Historical **seed vs. seed** win rates by round (1985–2025, excluding 2020)
  - Historical **seed advancement rates** (how often each seed reaches each round)
  - A light **market-strength adjustment** using each team’s pre-tournament championship implied probability (via Log5), acting as a tiebreaker within seed “buckets”
- **Matchup odds (pairing probability)** for later rounds are computed from reach-probability distributions so we can normalize the shown pairing against all other plausible opponents in that slot.
- **Exact path odds** for later-round tiles multiply the required upstream win probabilities along the picked path.
- **Exact bracket total odds** multiplies the win probability of your selected team in every game you’ve picked; unpicked games are not included yet.

Core implementation lives in `src/utils/odds.js`.

## Project structure

```text
src/
  components/     UI components (bracket, games, etc.)
  data/           Bracket + team data (JSON)
  utils/          Probability + formatting logic
  index.css       Global styling
```

## Data sources / attribution

This project derives probabilities from sportsbook markets plus public historical seed results, and displays the resulting implied probabilities. The exact sources and retrieval dates are listed in `src/data/sources.json` (and mirrored in the site’s “DATA & SOURCES” section).
