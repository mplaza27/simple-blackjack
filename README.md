# Blackjack Trainer

A browser-based blackjack trainer that teaches optimal play through basic strategy and Hi-Lo card counting. No real money — pure learning tool. Play hands, get instant feedback on your decisions, and build muscle memory for the mathematically correct move in every situation.

**Live site:** Deployed on GitHub Pages from `static/`.

## Architecture

Fully static single-page app — no backend, no frameworks, no bundler.

```
static/
├── index.html          # Single page entry
├── css/style.css       # All styling
└── js/
    ├── app.js          # Entry point, event wiring
    ├── card.js         # Card, Deck, Shoe (6-deck, realistic shuffle)
    ├── hand.js         # Hand scoring, soft/hard detection
    ├── game.js         # Game flow state machine
    ├── strategy.js     # Basic strategy lookup tables
    ├── counting.js     # Hi-Lo running/true count
    ├── payout.js       # Bet resolution (3:2 BJ, insurance, doubles)
    ├── drill.js        # Drill mode (rapid-fire strategy quiz)
    └── ui.js           # DOM rendering
```

All game state lives in client-side JS. Python and Docker are used only for dev tooling and tests.

## How It Teaches You

### Basic Strategy

Every hand you play is checked against the mathematically optimal action for that situation. The strategy engine covers three decision tables:

- **Hard totals** (5–17 vs each dealer upcard)
- **Soft totals** (A,2 through A,9 vs each dealer upcard)
- **Pairs** (2,2 through A,A vs each dealer upcard)

A hint button lets you peek at the optimal move before acting. After each decision, you get immediate feedback — correct or not, and what the right play was. Your running accuracy is tracked across the session.

### Drill Mode

A quick-fire quiz mode that strips away the full game and presents random hand + dealer upcard combinations. You pick the action, get instant feedback, repeat. After 50+ drills it highlights your weak spots — hand types where you're below 80% accuracy — so you know exactly what to study.

### Card Counting (Hi-Lo)

The app tracks the Hi-Lo running count across the shoe:

| Cards | Count Value |
|-------|------------|
| 2–6   | +1         |
| 7–9   | 0          |
| 10–A  | -1         |

The count display is hidden by default so you have to track it in your head — click to reveal and check yourself. True count (running count / decks remaining) is also shown. The shoe uses realistic 6-deck dealing with a cut card at ~75% penetration, so the count carries across hands just like at a real table.

## Strategy Data Source

The basic strategy tables in `strategy.js` encode the standard 6-deck basic strategy for the following rule set:

- 6-deck shoe
- Dealer hits soft 17 (H17)
- Double after split allowed (DAS)
- Late surrender

These are the most common rules at casino blackjack tables. The tables are derived from well-established probability calculations for blackjack — the same charts you'll find in Stanford Wong's *Professional Blackjack* or on sites like Wizard of Odds. The expected values behind each decision come from combinatorial analysis of all possible card sequences given the known rules.

## Running Locally

```bash
# Serve the static files
python3 -m http.server 8040 -d static

# Run JS tests
npm test

# Run Python strategy validation
pytest tests/unit/

# Run everything via Docker
docker compose run test
```

## Game Rules

Standard casino blackjack: 6-deck shoe, blackjack pays 3:2, dealer hits soft 17, double on any two cards, split on matching rank (max 3 hands), split aces get one card each, late surrender available.
