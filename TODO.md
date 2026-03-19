# TODO — Simple Blackjack Trainer

Tracks remaining work aligned with the PRD. Updated 2026-03-19.

---

## Completed

### Phase 5A: CSS Bug Fix & Visual Overhaul
- [x] Fix CSS bug: remove dead `display: none` on `#strategy-area`
- [x] Redesign to retro pixel aesthetic (Press Start 2P font, pixel borders, dark navy palette)
- [x] Card dealing animation from shoe position (top-right)
- [x] Card back pattern (checkerboard conic gradient)
- [x] Action buttons: retro pixel style with box-shadow press effects
- [x] Bet chips: square retro buttons with color coding
- [x] Disabled buttons: clearly muted/inactive
- [x] Score displays: gold accent inline text
- [x] Shoe visual element in top-right corner

### Phase 5B: Advanced Actions
- [x] **Double Down** — `game.js` double() method, UI enable/disable on first 2 cards, animated card + dealer play
- [x] **Split** — multi-hand support, side-by-side rendering, max 3 hands, split Aces auto-stand, per-hand resolution
- [x] **Insurance** — INSURANCE state, prompt when dealer shows Ace, side bet of half original, pays 2:1 if dealer BJ
- [x] **Surrender** — late surrender on first 2 cards, returns half bet
- [x] **Button state management** — conditional enable/disable based on game state, cards, bankroll

### Phase 6: Drill Mode
- [x] `drill.js`: random hand + dealer upcard generator (40% hard, 30% soft, 30% pair)
- [x] Instant correct/wrong feedback against strategy table
- [x] No shoe state — pure strategy memorization
- [x] After 50+ drills, highlight weak hand types (< 80% accuracy)
- [x] Separate UI view/mode toggled from main game

### Strategy & Learning Features
- [x] Basic strategy engine (6-deck, H17, DAS) with correct tables
- [x] Hi-Lo card counting with RC/TC display
- [x] Illustrious 18 deviations with true count thresholds
- [x] Coach popup: contextual advice, frequency breakdown, deviations, EV display
- [x] Session summary: misplayed hands grouped by type
- [x] Count quiz every 5-8 hands
- [x] Close-call detection (50/50 hands counted as correct)
- [x] Move-by-move feedback with breakdown
- [x] Approximate EV display per action in coach

### Deployment
- [x] GitHub Actions CI/CD pipeline (deploy static/ to GitHub Pages)
- [x] Deployed to mplaza27.github.io/simple-blackjack

---

## Remaining

### Polish
- [ ] Add responsive layout: `@media` breakpoints for mobile (<480px), tablet (480-768px), desktop
- [ ] Ensure touch targets >= 44px on mobile
- [ ] Sound effects (8-bit card deal, win/lose)
- [ ] Chip stack visual for bankroll
- [ ] Shuffling indicator animation
- [ ] localStorage for persisting stats across sessions

### Testing
- [ ] JS unit tests for split/insurance/surrender/drill
- [ ] Playwright E2E for advanced actions
- [ ] Playwright E2E for drill mode
- [ ] Mobile viewport E2E test
- [ ] Cross-browser testing
- [ ] Visual regression baselines
