# PRD — Simple Blackjack Trainer

## Product Summary

A browser-based blackjack trainer that teaches optimal play (basic strategy) and card counting (Hi-Lo). Deployed as a fully static site on **GitHub Pages** — no backend at runtime. All game logic lives in vanilla JavaScript.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Pure JS frontend | GitHub Pages = static only. No Python at runtime. |
| Python role | Dev tooling & test validation only | pytest validates strategy tables, generates test fixtures. Not shipped. |
| Docker | Dev & test pipeline only | Consistent Playwright + dev server environment. Deploy is static files via GH Actions. |
| State | Client-side JS (sessionStorage) | No database. Shoe state, bankroll, accuracy stats persist per browser session. |
| Frameworks | None (vanilla HTML/CSS/JS) | Per CLAUDE.md spec. No React, no bundler. |

### Project Structure

```
simple-blackjack/
├── static/                  # Deployed to GitHub Pages
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── card.js          # Card, Deck, Shoe classes
│   │   ├── hand.js          # Hand scoring, soft/hard detection
│   │   ├── game.js          # Game flow state machine
│   │   ├── strategy.js      # Basic strategy lookup tables
│   │   ├── counting.js      # Hi-Lo running/true count
│   │   ├── payout.js        # Bet resolution logic
│   │   ├── drill.js         # Drill mode logic
│   │   ├── ui.js            # DOM rendering, animations
│   │   └── app.js           # Entry point, event wiring
│   └── img/                 # Card backs, felt texture (if any)
├── tests/
│   ├── unit/                # pytest — validates strategy tables & fixtures
│   │   ├── test_strategy_tables.py
│   │   └── fixtures/        # Generated expected-value JSON for JS tests
│   ├── js/                  # JS unit tests (run in Node or browser)
│   │   ├── test_card.js
│   │   ├── test_hand.js
│   │   ├── test_game.js
│   │   ├── test_strategy.js
│   │   ├── test_counting.js
│   │   └── test_payout.js
│   └── e2e/                 # Playwright
│       ├── game-flow.spec.js
│       ├── strategy-hints.spec.js
│       ├── counting-display.spec.js
│       ├── drill-mode.spec.js
│       ├── betting.spec.js
│       ├── visual-regression.spec.js
│       └── screenshots/     # Baseline images for visual regression
├── tools/                   # Python dev utilities
│   ├── generate_fixtures.py # Produces JSON expected values from strategy tables
│   └── serve.py             # Local dev server (python -m http.server wrapper)
├── docker-compose.yml
├── Dockerfile
├── package.json             # Playwright + JS test runner deps
├── pytest.ini
├── .github/
│   └── workflows/
│       ├── test.yml         # CI: run all tests
│       └── deploy.yml       # CD: deploy static/ to GitHub Pages
├── CLAUDE.md
├── PRD.md
└── README.md
```

---

## Phases & Test Plan

Each phase is self-contained: implement the feature, write tests, all tests green before moving on. **Tests are the priority deliverable** — they define "done" for each phase.

---

### Phase 1: Card, Deck & Hand Fundamentals

**Scope:** Card representation, 6-deck shoe, dealing, hand scoring.

**JS modules:** `card.js`, `hand.js`

**Features:**
- Card object: rank, suit, value
- Shoe: 6 decks (312 cards), shuffle, deal
- Cut card at ~75% penetration (reshuffle when < 78 cards remain)
- Hand scoring: hard total, soft total, blackjack detection
- Ace flexibility (1 or 11)

**Tests:**

| Test | Type | File |
|------|------|------|
| Card creation and value mapping (2-A) | JS unit | `test_card.js` |
| Shoe contains exactly 312 cards | JS unit | `test_card.js` |
| Shoe deals unique cards until reshuffle | JS unit | `test_card.js` |
| Reshuffle triggers at < 78 cards remaining | JS unit | `test_card.js` |
| Hard hand scoring (no aces) | JS unit | `test_hand.js` |
| Soft hand scoring (ace as 11) | JS unit | `test_hand.js` |
| Ace downgrades from 11 to 1 when bust | JS unit | `test_hand.js` |
| Blackjack detection (A + 10-value, exactly 2 cards) | JS unit | `test_hand.js` |
| 3-card 21 is NOT blackjack | JS unit | `test_hand.js` |
| Bust detection (> 21) | JS unit | `test_hand.js` |

---

### Phase 2: Core Game Flow

**Scope:** Single-hand game loop — deal, hit, stand, dealer play, win/loss resolution.

**JS modules:** `game.js`, `payout.js`, `ui.js`, `app.js`

**Features:**
- Game state machine: BETTING → DEALING → PLAYER_TURN → DEALER_TURN → RESOLUTION
- Deal 2 cards each, dealer hole card face-down
- Hit: add card, check bust
- Stand: move to dealer turn
- Dealer reveals hole card, hits on soft 17
- Compare totals, determine winner
- Basic payout: 1:1 win, push, blackjack 3:2
- Bankroll tracking (start at 1000)
- Bet selection (10, 25, 50, 100)

**Tests:**

| Test | Type | File |
|------|------|------|
| Game state transitions in correct order | JS unit | `test_game.js` |
| Initial deal: player 2 cards, dealer 2 cards | JS unit | `test_game.js` |
| Hit adds exactly one card | JS unit | `test_game.js` |
| Player bust ends turn immediately | JS unit | `test_game.js` |
| Dealer hits on soft 17 | JS unit | `test_game.js` |
| Dealer stands on hard 17+ | JS unit | `test_game.js` |
| Regular win pays 1:1 | JS unit | `test_payout.js` |
| Blackjack pays 3:2 | JS unit | `test_payout.js` |
| Push returns bet | JS unit | `test_payout.js` |
| Dealer bust = player wins | JS unit | `test_payout.js` |
| Bankroll updates correctly after win/loss/push | JS unit | `test_payout.js` |
| **E2E: Full hand — deal, hit, stand, see result** | Playwright | `game-flow.spec.js` |
| **E2E: Bet selection updates displayed bet** | Playwright | `betting.spec.js` |
| **E2E: Bankroll reflects payout after hand** | Playwright | `betting.spec.js` |
| **E2E: Cards render on screen with correct suits/values** | Playwright | `game-flow.spec.js` |
| **E2E: Dealer hole card is face-down during player turn** | Playwright | `game-flow.spec.js` |
| **Visual: Table layout matches baseline (deal state)** | Playwright | `visual-regression.spec.js` |
| **Visual: Card rendering matches baseline** | Playwright | `visual-regression.spec.js` |

---

### Phase 3: Basic Strategy Engine & Hints

**Scope:** Strategy lookup tables, hint UI, accuracy tracking.

**JS modules:** `strategy.js`

**Features:**
- Hard totals table (5-17 vs dealer 2-A)
- Soft totals table (A,2 through A,9 vs dealer 2-A)
- Pairs table (2,2 through A,A vs dealer 2-A)
- Rules: 6-deck, H17, DAS allowed
- "?" button reveals optimal move before acting
- Post-action feedback: checkmark or X with correct answer
- Running accuracy tracker (overall + per hand type)

**Tests:**

| Test | Type | File |
|------|------|------|
| Hard total lookups match published strategy chart | JS unit | `test_strategy.js` |
| Soft total lookups match published strategy chart | JS unit | `test_strategy.js` |
| Pair split lookups match published strategy chart | JS unit | `test_strategy.js` |
| Strategy returns valid action for every possible hand/dealer combo | JS unit | `test_strategy.js` |
| Edge cases: hard 16 vs 10 (surrender→hit fallback) | JS unit | `test_strategy.js` |
| **Cross-validation: JS tables match Python reference tables** | pytest | `test_strategy_tables.py` |
| Accuracy tracker increments correctly | JS unit | `test_strategy.js` |
| Accuracy by hand type (hard/soft/pair) tracked separately | JS unit | `test_strategy.js` |
| **E2E: Click "?" reveals optimal move text** | Playwright | `strategy-hints.spec.js` |
| **E2E: Correct play shows checkmark feedback** | Playwright | `strategy-hints.spec.js` |
| **E2E: Wrong play shows X with correct action** | Playwright | `strategy-hints.spec.js` |
| **E2E: Accuracy display updates after each hand** | Playwright | `strategy-hints.spec.js` |

---

### Phase 4: Card Counting (Hi-Lo)

**Scope:** Running count, true count, toggle display.

**JS modules:** `counting.js`

**Features:**
- Hi-Lo values: +1 (2-6), 0 (7-9), -1 (10-A)
- Running count updates as each card is revealed
- True count: running_count / decks_remaining
- Display hidden/blurred by default, click to reveal
- Resets to hidden on next deal
- Count persists across hands within same shoe, resets on shuffle

**Tests:**

| Test | Type | File |
|------|------|------|
| Hi-Lo values correct for every rank | JS unit | `test_counting.js` |
| Running count accumulates across multiple cards | JS unit | `test_counting.js` |
| True count = running / decks remaining | JS unit | `test_counting.js` |
| Decks remaining calculated from cards dealt | JS unit | `test_counting.js` |
| Count resets to 0 on shoe reshuffle | JS unit | `test_counting.js` |
| Count persists across hands within same shoe | JS unit | `test_counting.js` |
| **E2E: Count display is hidden/blurred by default** | Playwright | `counting-display.spec.js` |
| **E2E: Click reveals running count and true count** | Playwright | `counting-display.spec.js` |
| **E2E: Count re-hides on next deal** | Playwright | `counting-display.spec.js` |
| **E2E: Count resets after shoe shuffle** | Playwright | `counting-display.spec.js` |
| **Visual: Count badge appearance (hidden vs revealed)** | Playwright | `visual-regression.spec.js` |

---

### Phase 5: Advanced Actions (Double, Split, Surrender, Insurance)

**Scope:** Remaining player actions and dealer insurance offer.

**Features:**
- **Double down:** double bet, exactly one more card, turn ends
- **Split:** matching rank only, max 3 hands, split aces get one card each
- **Surrender:** first two cards only, lose half bet (late surrender)
- **Insurance:** offered when dealer shows Ace, side bet of half original, pays 2:1

**Tests:**

| Test | Type | File |
|------|------|------|
| Double down doubles bet and deals exactly one card | JS unit | `test_game.js` |
| Double down not offered after hit | JS unit | `test_game.js` |
| Split creates two separate hands | JS unit | `test_game.js` |
| Split only allowed on matching rank (not just value) | JS unit | `test_game.js` |
| Max 3 hands from splits | JS unit | `test_game.js` |
| Split aces: one card each, no further hits | JS unit | `test_game.js` |
| Surrender returns half bet | JS unit | `test_payout.js` |
| Surrender only available on first two cards | JS unit | `test_game.js` |
| Insurance offered when dealer shows Ace | JS unit | `test_game.js` |
| Insurance pays 2:1 when dealer has blackjack | JS unit | `test_payout.js` |
| Insurance lost when dealer doesn't have blackjack | JS unit | `test_payout.js` |
| Double down payout is 2x on win | JS unit | `test_payout.js` |
| **E2E: Double down flow — bet doubles, one card dealt** | Playwright | `game-flow.spec.js` |
| **E2E: Split flow — two hands rendered, played sequentially** | Playwright | `game-flow.spec.js` |
| **E2E: Surrender button disappears after first action** | Playwright | `game-flow.spec.js` |
| **E2E: Insurance prompt appears when dealer shows Ace** | Playwright | `game-flow.spec.js` |
| **Visual: Split hand layout** | Playwright | `visual-regression.spec.js` |

---

### Phase 6: Drill Mode

**Scope:** Quick-fire strategy quiz, standalone from full game.

**JS modules:** `drill.js`

**Features:**
- Random hand + dealer upcard presented
- Player picks action, instant correct/wrong feedback
- No shoe state — pure strategy memorization
- After 50+ drills, highlight weak hand types (< 80% accuracy)
- Separate UI view/mode from the main game

**Tests:**

| Test | Type | File |
|------|------|------|
| Drill generates valid hand + dealer upcard combos | JS unit | `test_strategy.js` |
| Drill evaluates player answer against strategy table | JS unit | `test_strategy.js` |
| Weak hands identified after 50+ drills at < 80% | JS unit | `test_strategy.js` |
| Drill does not use or affect shoe state | JS unit | `test_strategy.js` |
| **E2E: Drill mode loads with hand and action buttons** | Playwright | `drill-mode.spec.js` |
| **E2E: Correct answer shows positive feedback** | Playwright | `drill-mode.spec.js` |
| **E2E: Wrong answer shows correct action** | Playwright | `drill-mode.spec.js` |
| **E2E: Weak hands highlighted after 50+ drills** | Playwright | `drill-mode.spec.js` |
| **Visual: Drill mode layout baseline** | Playwright | `visual-regression.spec.js` |

---

### Phase 7: Polish & Deploy

**Scope:** Animations, visual polish, GitHub Pages deployment.

**Features:**
- Card dealing animation
- Chip stack visual
- Shuffling indicator
- Dark green felt background (#0d5e2e)
- Responsive layout
- GitHub Actions: test → deploy pipeline

**Tests:**

| Test | Type | File |
|------|------|------|
| **E2E: Shuffle indicator appears when shoe resets** | Playwright | `game-flow.spec.js` |
| **E2E: Page loads and is interactive on mobile viewport** | Playwright | `game-flow.spec.js` |
| **Visual: Full table layout — desktop baseline** | Playwright | `visual-regression.spec.js` |
| **Visual: Full table layout — mobile baseline** | Playwright | `visual-regression.spec.js` |
| **Visual: Card dealing animation renders** | Playwright | `visual-regression.spec.js` |
| GitHub Actions workflow succeeds (test + deploy) | CI | `.github/workflows/` |

---

## Docker Setup (Dev & Test Only)

```yaml
# docker-compose.yml
services:
  dev:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./static:/app/static
      - ./tests:/app/tests
    command: python -m http.server 8080 --directory /app/static

  test:
    build: .
    volumes:
      - ./static:/app/static
      - ./tests:/app/tests
      - ./tools:/app/tools
    depends_on:
      - dev
    command: npx playwright test

  pytest:
    build: .
    volumes:
      - ./tools:/app/tools
      - ./tests:/app/tests
    command: pytest tests/unit/
```

```dockerfile
# Dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y nodejs npm \
    && npx playwright install --with-deps chromium \
    && apt-get clean

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pytest
      - run: pytest tests/unit/

# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: static/
      - uses: actions/deploy-pages@v4
```

---

## Test Execution Summary

| Category | Runner | Count |
|----------|--------|-------|
| JS unit tests | Vitest or plain Node test runner | ~40 |
| Python unit tests (strategy validation) | pytest | ~5 |
| Playwright E2E (functional) | Playwright | ~25 |
| Playwright visual regression | Playwright | ~8 |
| **Total** | | **~78** |

### Running Tests

```bash
# All tests via Docker
docker compose run test

# JS unit tests locally
npm test

# Python strategy validation
pytest tests/unit/

# Playwright E2E locally
npx playwright test

# Visual regression update baselines
npx playwright test --update-snapshots
```

---

## Definition of Done

Each phase is complete when:
1. All unit tests for that phase pass
2. All Playwright E2E tests for that phase pass
3. Visual regression baselines captured and passing
4. Code works when served from `static/` via `python -m http.server`
5. No console errors in browser

**Project is complete when:** All phases done, GH Actions green, site live on GitHub Pages.

---

## Current Status (2026-03-19)

### All Core Phases Complete

- **Phase 1** — Card, Deck & Hand: `card.js`, `hand.js` fully functional.
- **Phase 2** — Core Game Flow: Deal/Hit/Stand/Double/Split/Surrender/Insurance all work. Animated dealing from shoe. Blackjack reveal after animation.
- **Phase 3** — Strategy Engine: 6-deck H17 DAS tables, Coach popup with contextual advice, frequency breakdowns, Illustrious 18 deviations, approximate EV per action.
- **Phase 4** — Card Counting: Hi-Lo RC/TC, blurred toggle display, count quiz every 5-8 hands.
- **Phase 5** — Advanced Actions: Double (bet doubles, one card, auto-stand), Split (multi-hand, side-by-side, max 3, aces auto-stand), Surrender (late, half bet), Insurance (INSURANCE state, prompt on dealer Ace, 2:1 payout).
- **Phase 6** — Drill Mode: Random hand generator (40% hard, 30% soft, 30% pair), instant feedback, weak spot detection after 50+ drills.
- **Phase 7** — Polish & Deploy: Retro pixel aesthetic (Press Start 2P), shoe visual, card animations, session summary, GitHub Pages deployment via Actions.

### Design
- Retro pixel UI with Press Start 2P font, dark navy palette, gold accents
- Card shoe visual in top-right, cards animate from shoe position
- Split hands render side-by-side with active hand highlight
- Coach popup: optimal play, frequency breakdown, deviations, EV values
- Session summary: misplayed hands grouped by type
- Close-call detection for 50/50 hands

### Deployed
- GitHub Pages: https://mplaza27.github.io/simple-blackjack/
- CI/CD: GitHub Actions deploys `static/` on push to main

### Remaining Polish
- Responsive layout (mobile/tablet breakpoints)
- Touch targets >= 44px on mobile
- Sound effects (8-bit)
- localStorage for persisting stats
- Additional unit tests for split/insurance/drill
- Playwright E2E tests
- Cross-browser testing
