# CLAUDE.md — Project Notes for AI Assistants

Simple Blackjack: a browser-based trainer for learning optimal blackjack play and light card counting.

---

## Overview

A fully static single-page blackjack trainer deployed on **GitHub Pages**. All game logic lives in vanilla JavaScript — no backend at runtime. Python is used only for dev tooling and test validation.

The goal is to teach the player:
1. **Basic strategy** — the mathematically optimal hit/stand/double/split for every hand vs dealer upcard.
2. **Card counting** — Hi-Lo system with a discreet running count display.

Not a casino game. No real money. Pure learning tool.

### Design Principle: Realism First
The app should look and feel as close to a real blackjack table as possible. Realistic card rendering, dealing animations, chip stacks, and table layout. The training aids (optimal move hint, running count) are **hidden by default** so the player experiences a realistic game — they click to reveal when they want to check themselves.

---

## Tech Stack

- **Vanilla HTML/CSS/JS** — all game logic and UI (no frameworks, no bundler)
- **No database** — all state lives in client-side JS (sessionStorage)
- **Python 3** — dev tooling only (pytest for strategy table validation, fixture generation)
- **Docker** — dev & test pipeline (dev server, Playwright, pytest)
- **Deploy** — GitHub Pages (static files from `static/`)

---

## Game Logic

### Card & Deck
- Standard 52-card deck. Shoe: 6 decks (312 cards).
- **Realistic shuffle**: the shoe is dealt through continuously — no reshuffling between hands. Reshuffle only when the cut card is reached (~75% penetration, < 78 cards remaining). Show a visual "Shuffling..." indicator when this happens, just like a real table.
- Card values: 2–10 face, J/Q/K = 10, Ace = 1 or 11.
- Cards dealt from the shoe are tracked and not reused until the next shuffle. The count carries across hands within the same shoe.

### Hand Scoring
- Soft hand: contains an Ace counted as 11 without busting.
- Blackjack: exactly 2 cards totaling 21 (Ace + 10-value).

### Payouts (realistic casino rules)
- **Blackjack**: pays 3:2 (bet 10 → win 15).
- **Regular win**: pays 1:1.
- **Insurance**: offered when dealer shows Ace, pays 2:1 (side bet of half the original).
- **Push**: bet returned.
- **Double down**: double the bet, receive exactly one more card.
- **Surrender**: forfeit half the bet (early surrender not offered — late surrender only, before dealer checks for blackjack).

### Game Flow
1. Deal 2 cards each; dealer hole card face-down.
2. If dealer shows Ace, offer insurance.
3. Player acts: Hit, Stand, Double Down, Split (if pair), Surrender (first two cards only).
4. Dealer reveals, hits on soft 17.
5. Compare totals, resolve payouts per rules above.

### Split Rules
- Split on matching rank only (not just value).
- Max 3 hands from splits.
- Split Aces: one card each, no further hits.

---

## Strategy Engine

### Basic Strategy Tables
Three lookups keyed by dealer upcard (2–A):
1. **Hard totals** (5–17): Hit / Stand / Double
2. **Soft totals** (A,2 through A,9): Hit / Stand / Double
3. **Pairs** (2,2 through A,A): Split / Hit / Stand / Double

Rules: 6-deck, dealer hits soft 17 (H17), double after split allowed.

### Best Move Hint
- The optimal action is computed but **hidden by default**.
- A small "?" button near the action buttons lets the player click to reveal the optimal move before acting.
- Once revealed: shows the recommended action (e.g. "Optimal: Stand").
- After the player acts, show ✓ Correct or ✗ Optimal was: {action} as feedback.
- Track running accuracy overall and per hand type (hard/soft/pair).

---

## Card Counting (Hi-Lo)

- **+1**: 2, 3, 4, 5, 6
- **-1**: 10, J, Q, K, A
- **0**: 7, 8, 9
- **Running count**: updated as each card is revealed.
- **True count**: running_count / decks_remaining.
- Display: small counter in top-right corner, **hidden by default** — shows as a blurred/masked value.
- Click to reveal the current running count and true count.
- Resets to hidden on the next deal so the player must track it mentally each hand.

---

## UI Layout

```
┌──────────────────────────────────────────┐
│ [chips: 1000]              [RC: +3] (◉)  │  ← top bar, count behind toggle
│                                          │
│            Dealer: [?] [K♠]              │  ← hole card face-down
│                                          │
│          Player: [A♥] [7♣]  = 18 (soft)  │  ← hand + score
│                                          │
│  [ Hit ] [ Stand ] [ Double ] [ Split ]  │  ← action buttons
│                                          │
│  [?] ✓ Correct! / ✗ Optimal: Stand       │  ← hint (click ?) + feedback
│                                          │
│  [Bet: 10] [25] [50] [100]    [ Deal ]  │  ← betting
└──────────────────────────────────────────┘
```

- Dark green felt background (`#0d5e2e`), white/gold text.
- Cards: styled divs with suit symbols (♠♥♦♣), red/black coloring.
- Face-down card: solid back pattern.

---

## Drill Mode

Quick-fire strategy quiz, no full game:
- Random hand + dealer upcard shown.
- Player picks action, instant feedback.
- No shoe state — pure strategy memorization.
- After 50+ drills, highlight weak hand types (< 80% accuracy).

---

## Project Architecture

```
simple-blackjack/
├── static/                  # Deployed to GitHub Pages
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── card.js          # Card, Deck, Shoe classes
│       ├── hand.js          # Hand scoring, soft/hard detection
│       ├── game.js          # Game flow state machine
│       ├── strategy.js      # Basic strategy lookup tables
│       ├── counting.js      # Hi-Lo running/true count
│       ├── payout.js        # Bet resolution logic
│       ├── drill.js         # Drill mode logic
│       ├── ui.js            # DOM rendering, animations
│       └── app.js           # Entry point, event wiring
├── tests/
│   ├── unit/                # pytest — validates strategy tables
│   ├── js/                  # JS unit tests (Vitest or Node)
│   └── e2e/                 # Playwright E2E + visual regression
├── tools/                   # Python dev utilities
│   ├── generate_fixtures.py
│   └── serve.py
├── docker-compose.yml
├── Dockerfile
├── package.json
├── pytest.ini
└── .github/workflows/       # CI/CD
```

- All game logic in vanilla JS under `static/js/`.
- Python is dev-only: strategy table validation, fixture generation.
- All game state managed client-side; no server at runtime.
- Tests: JS unit (~40), pytest (~5), Playwright E2E (~25), visual regression (~8).

### Running Tests

```bash
# All tests via Docker
docker compose run test

# JS unit tests locally
npm test

# Python strategy validation
pytest tests/unit/

# Playwright E2E
npx playwright test
```

---

## Known Issues & Fix Plan

### Current State (as of 2026-03-19)

Phases 1–4 are implemented. The core loop (deal → hit → stand → resolve), strategy hints, and card counting all work. However, **three major areas need fixing** before moving forward:

### Issue 1: Broken Buttons — Double, Split, Surrender are Non-Functional

The Double, Split, and Surrender buttons exist in the HTML but are **permanently disabled** with no event listeners, no game logic, and no payout wiring. They are Phase 5 features that were never implemented.

**What's missing per button:**
- **Double Down**: No `double()` method in `game.js`, no event listener in `app.js`, no payout integration. Should double the bet, deal exactly one card, end the turn.
- **Split**: No `split()` method in `game.js`, no multi-hand state management, no UI for rendering split hands side-by-side. Should split matching rank only, max 3 hands, aces get one card each.
- **Surrender**: No `surrender()` method in `game.js`, no event listener. Should return half the bet, only available on first two cards (late surrender).
- **Insurance**: No button in HTML at all, no game logic. Should be offered when dealer shows Ace, side bet of half original, pays 2:1.

**Additionally missing:** Action button enable/disable logic — buttons should be conditionally enabled based on game state (e.g., double only on first two cards, split only on matching rank, surrender only before first action).

### Issue 2: UI Design Needs a Visual Overhaul

The current design is functional but flat and unpolished compared to modern browser-based blackjack games. Based on research of top blackjack web apps (Saganaki22/Blackjack, Clowerweb's Blackjack v.3, casino UI patterns on Dribbble/Behance), the following improvements are needed:

**Color & atmosphere:**
- Switch from plain dark green to a **richer felt texture** — use CSS radial gradients or a subtle noise pattern to simulate real felt instead of flat `#0d5e2e`.
- Add a **dark outer frame** around the table area (dark wood or dark gray border) to ground the felt area, like a real table edge.
- Use **neon/gold accent glows** on interactive elements (buttons, chips) — `box-shadow` with gold/amber tones on hover.

**Card rendering:**
- Cards need **drop shadows** and slight **rotation/overlap** when dealt to look like a real hand, not a flat grid.
- Add a **dealing animation** — cards should slide in from a shoe position (top-right) rather than appearing instantly.
- Face-down card should have a more detailed **card back pattern** (crosshatch or casino logo style).

**Button design:**
- Action buttons (Hit, Stand, etc.) should look like **casino chips or raised 3D buttons** — not flat rectangles. Use gradients, inner shadows, and rounded shapes.
- Disabled buttons should look clearly inactive (grayed, no hover effect) vs. active buttons which should glow/pulse subtly.
- Bet chip selectors should be **circular chip shapes** with denominations, not rectangular buttons.

**Layout & spacing:**
- Add more vertical breathing room between dealer area, player area, and controls.
- Center the table area with a **max-width container** that has the wood-frame border effect.
- Score displays should be **badge-style** (rounded pill with subtle background) rather than plain text.

**Typography:**
- Use a **casino-style font** for headers/scores (e.g., a serif or display font) while keeping sans-serif for body text.
- Increase contrast on key numbers (hand totals, bankroll) with larger font sizes and bolder weights.

**Responsiveness (currently missing entirely):**
- Add `@media` breakpoints for mobile (< 480px), tablet (480–768px), and desktop (> 768px).
- Stack card areas vertically on mobile, reduce card sizes, make buttons full-width.
- Touch targets must be at least 44px for mobile.

### Issue 3: CSS Bug in Strategy Area

In `style.css`, `#strategy-area` has `display: none` on line 203 immediately overridden by `display: flex` on line 205. The `display: none` is dead code. The visibility toggling should be handled purely by JS (which it already is in `ui.js`), so the `display: none` line should be removed.

---

## Fix Sequence

These fixes should be done in this order:

1. **Fix the CSS bug** — trivial, do first.
2. **UI visual overhaul** — redesign CSS and HTML structure using the design principles above. This is Phase 7 work pulled forward because the current design undermines the "Realism First" principle.
3. **Implement Double/Split/Surrender/Insurance** — Phase 5 from the PRD. Requires game logic, event wiring, button state management, payout integration, and UI for split hands.
4. **Add responsive design** — media queries, mobile layout, touch targets.
5. **Test everything** — update Playwright E2E tests and visual regression baselines.
