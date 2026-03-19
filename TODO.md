# TODO — Simple Blackjack Trainer

Tracks remaining work aligned with the PRD. Updated 2026-03-19.

---

## Phase 5A: CSS Bug Fix & Visual Overhaul

- [ ] Fix CSS bug: remove dead `display: none` on `#strategy-area` (style.css line 203)
- [ ] Redesign table background: felt texture via CSS radial gradients + dark wood/charcoal frame border
- [ ] Redesign card rendering: drop shadows, slight overlap/rotation, slide-in dealing animation
- [ ] Redesign card backs: detailed crosshatch or casino-style pattern
- [ ] Redesign action buttons: raised 3D / casino chip style, gradients, gold glow on hover
- [ ] Redesign bet chips: circular chip shapes with denominations (not rectangles)
- [ ] Redesign disabled buttons: clearly inactive — muted, no glow, distinct from active
- [ ] Redesign score displays: badge-style pills with subtle background
- [ ] Typography pass: display/serif font for scores & key numbers, larger/bolder weights
- [ ] Add responsive layout: `@media` breakpoints for mobile (<480px), tablet (480-768px), desktop
- [ ] Ensure touch targets >= 44px on mobile
- [ ] Add vertical breathing room between dealer area, player area, and controls

## Phase 5B: Advanced Actions (Double, Split, Surrender, Insurance)

- [ ] **Double Down**
  - [ ] `game.js`: add `double()` method — double bet, deal 1 card, end turn
  - [ ] `app.js`: add click listener
  - [ ] `ui.js`: enable only on first 2 cards, disable after hit
  - [ ] `payout.js`: pay 2x on win
- [ ] **Split**
  - [ ] `game.js`: add `split()` method — create 2 hands from matching rank pair, manage hand switching, max 3 hands, aces get 1 card each
  - [ ] `app.js`: add click listener
  - [ ] `ui.js`: enable only on matching rank pair, render split hands side-by-side, highlight active hand
  - [ ] `payout.js`: resolve each hand independently
- [ ] **Surrender**
  - [ ] `game.js`: add `surrender()` method — end hand, return half bet
  - [ ] `app.js`: add click listener
  - [ ] `ui.js`: enable only on first 2 cards (pre-action), hide after any action
  - [ ] `payout.js`: return half bet
- [ ] **Insurance**
  - [ ] `index.html`: add insurance prompt/button
  - [ ] `game.js`: offer when dealer shows Ace, track side bet
  - [ ] `app.js`: add listener for insurance accept/decline
  - [ ] `ui.js`: show insurance prompt between deal and player turn
  - [ ] `payout.js`: pay 2:1 if dealer BJ, lose side bet if not
- [ ] **Button state management**
  - [ ] After deal: enable Hit, Stand, Double (if bankroll >= 2x bet), Split (if matching rank), Surrender
  - [ ] After first hit: disable Double, Split, Surrender — only Hit and Stand remain
  - [ ] After split: per-hand state, disable re-split at max 3 hands

## Phase 6: Drill Mode

- [ ] `drill.js`: random hand + dealer upcard generator
- [ ] Instant correct/wrong feedback against strategy table
- [ ] No shoe state — pure strategy memorization
- [ ] After 50+ drills, highlight weak hand types (< 80% accuracy)
- [ ] Separate UI view/mode from main game

## Phase 7: Final Polish & Deploy

- [ ] Shuffling indicator animation
- [ ] Chip stack visual for bankroll
- [ ] GitHub Actions CI/CD pipeline (test + deploy)
- [ ] Final visual regression baselines
- [ ] Cross-browser testing

## Testing

- [ ] JS unit tests for double/split/surrender/insurance (`test_game.js`, `test_payout.js`)
- [ ] Playwright E2E for advanced actions (`game-flow.spec.js`)
- [ ] Playwright E2E for drill mode (`drill-mode.spec.js`)
- [ ] Update visual regression baselines after redesign
- [ ] Mobile viewport E2E test
