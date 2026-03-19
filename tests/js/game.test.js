import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Shoe } from '../../static/js/card.js';
import { Hand } from '../../static/js/hand.js';
import { Game, GameState } from '../../static/js/game.js';

/** Create a rigged shoe that deals cards in the given order. */
function riggedShoe(cards) {
    const shoe = new Shoe(1);
    // Override deal to return cards in order (first element dealt first)
    const queue = [...cards];
    shoe.deal = () => queue.shift();
    shoe.needsShuffle = () => false;
    shoe.remaining = () => queue.length;
    return shoe;
}

describe('Game state transitions', () => {
    it('starts in BETTING state', () => {
        const game = new Game();
        expect(game.state).toBe(GameState.BETTING);
    });

    it('transitions BETTING → PLAYER_TURN on deal (no blackjacks)', () => {
        // Player: 7♠, 8♠  Dealer: 5♠, 6♠ (deal order: P, D, P, D)
        const shoe = riggedShoe([
            new Card('7', '♠'), new Card('5', '♠'),
            new Card('8', '♠'), new Card('6', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.state).toBe(GameState.PLAYER_TURN);
    });

    it('transitions through full flow: BETTING → PLAYER_TURN → DEALER_TURN → RESOLUTION', () => {
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('9', '♠'),
            new Card('8', '♠'), new Card('7', '♠'),
            // dealer draw cards if needed:
            new Card('5', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal(); // Player: 10+8=18, Dealer: 9+7=16
        expect(game.state).toBe(GameState.PLAYER_TURN);
        game.stand(); // Dealer must hit 16, draws 5 → 21
        expect(game.state).toBe(GameState.RESOLUTION);
    });

    it('returns to BETTING after newHand()', () => {
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('9', '♠'),
            new Card('8', '♠'), new Card('K', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.stand();
        expect(game.state).toBe(GameState.RESOLUTION);
        game.newHand();
        expect(game.state).toBe(GameState.BETTING);
    });
});

describe('Initial deal', () => {
    it('deals player 2 cards and dealer 2 cards', () => {
        const shoe = riggedShoe([
            new Card('7', '♠'), new Card('5', '♠'),
            new Card('8', '♠'), new Card('6', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.playerHand.cards.length).toBe(2);
        expect(game.dealerHand.cards.length).toBe(2);
    });

    it('deals in correct order: player, dealer, player, dealer', () => {
        const shoe = riggedShoe([
            new Card('2', '♠'), new Card('3', '♥'),
            new Card('4', '♦'), new Card('5', '♣'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.playerHand.cards[0].toString()).toBe('2♠');
        expect(game.playerHand.cards[1].toString()).toBe('4♦');
        expect(game.dealerHand.cards[0].toString()).toBe('3♥');
        expect(game.dealerHand.cards[1].toString()).toBe('5♣');
    });
});

describe('Hit', () => {
    it('adds exactly one card to player hand', () => {
        const shoe = riggedShoe([
            new Card('7', '♠'), new Card('5', '♠'),
            new Card('8', '♠'), new Card('6', '♠'),
            new Card('3', '♠'), // hit card
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.playerHand.cards.length).toBe(2);
        game.hit();
        expect(game.playerHand.cards.length).toBe(3);
    });

    it('player bust ends turn immediately (→ RESOLUTION)', () => {
        // Player: 10+6=16, hit K → 26 bust
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('5', '♠'),
            new Card('6', '♠'), new Card('6', '♥'),
            new Card('K', '♠'), // hit card → bust
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.hit();
        expect(game.playerHand.isBust()).toBe(true);
        expect(game.state).toBe(GameState.RESOLUTION);
        expect(game.result).toBe('player_bust');
    });
});

describe('Dealer behavior', () => {
    it('dealer hits on soft 17', () => {
        // Player: 10+8=18 (stand). Dealer: A+6=soft 17 → must hit
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('A', '♠'),
            new Card('8', '♠'), new Card('6', '♠'),
            new Card('3', '♠'), // dealer draw → A+6+3=20
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.stand();
        // Dealer started with soft 17 (A+6), should have hit
        expect(game.dealerHand.cards.length).toBeGreaterThan(2);
    });

    it('dealer stands on hard 17+', () => {
        // Player: 10+8=18 (stand). Dealer: 10+7=17 hard → stand
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('8', '♠'), new Card('7', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.stand();
        expect(game.dealerHand.cards.length).toBe(2);
        expect(game.dealerHand.score()).toBe(17);
    });

    it('dealer stands on hard 18', () => {
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('7', '♠'), new Card('8', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.stand();
        expect(game.dealerHand.cards.length).toBe(2);
    });
});

describe('Blackjack on deal', () => {
    it('player blackjack → immediate resolution', () => {
        const shoe = riggedShoe([
            new Card('A', '♠'), new Card('5', '♠'),
            new Card('K', '♠'), new Card('6', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.state).toBe(GameState.RESOLUTION);
        expect(game.result).toBe('blackjack');
    });

    it('dealer blackjack → immediate resolution', () => {
        const shoe = riggedShoe([
            new Card('5', '♠'), new Card('A', '♠'),
            new Card('6', '♠'), new Card('K', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.state).toBe(GameState.RESOLUTION);
        expect(game.result).toBe('dealer_blackjack');
    });

    it('both blackjack → push', () => {
        const shoe = riggedShoe([
            new Card('A', '♠'), new Card('A', '♥'),
            new Card('K', '♠'), new Card('K', '♥'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.state).toBe(GameState.RESOLUTION);
        expect(game.result).toBe('push');
    });
});

describe('Bet validation', () => {
    it('rejects bet of 0', () => {
        const game = new Game();
        expect(game.placeBet(0)).toBe(false);
    });

    it('rejects bet exceeding bankroll', () => {
        const game = new Game();
        expect(game.placeBet(2000)).toBe(false);
    });

    it('rejects negative bet', () => {
        const game = new Game();
        expect(game.placeBet(-10)).toBe(false);
    });

    it('cannot deal without a bet', () => {
        const game = new Game();
        expect(game.deal()).toBe(false);
    });
});

describe('Dealer upcard and hole card', () => {
    it('upcard is visible, hole card hidden during player turn', () => {
        const shoe = riggedShoe([
            new Card('7', '♠'), new Card('K', '♥'),
            new Card('8', '♠'), new Card('6', '♣'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        expect(game.dealerUpcard().toString()).toBe('K♥');
        expect(game.dealerHoleCard()).toBeNull(); // hidden
    });

    it('hole card revealed after stand', () => {
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('8', '♠'), new Card('7', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(10);
        game.deal();
        game.stand();
        expect(game.dealerHoleCard()).not.toBeNull();
        expect(game.dealerHoleCard().toString()).toBe('7♠');
    });
});
