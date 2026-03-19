import { describe, it, expect } from 'vitest';
import { Card, Shoe } from '../../static/js/card.js';
import { Hand } from '../../static/js/hand.js';
import { Game, GameState } from '../../static/js/game.js';
import { Payout } from '../../static/js/payout.js';

function riggedShoe(cards) {
    const shoe = new Shoe(1);
    const queue = [...cards];
    shoe.deal = () => queue.shift();
    shoe.needsShuffle = () => false;
    shoe.remaining = () => queue.length;
    return shoe;
}

describe('Payout calculations', () => {
    it('blackjack pays 3:2', () => {
        expect(Payout.blackjack(10)).toBe(15);
        expect(Payout.blackjack(20)).toBe(30);
        expect(Payout.blackjack(50)).toBe(75);
    });

    it('regular win pays 1:1', () => {
        expect(Payout.win(10)).toBe(10);
        expect(Payout.win(100)).toBe(100);
    });

    it('push returns 0', () => {
        expect(Payout.push()).toBe(0);
    });

    it('loss returns negative bet', () => {
        expect(Payout.lose(10)).toBe(-10);
    });

    it('surrender loses half bet', () => {
        expect(Payout.surrender(10)).toBe(-5);
        expect(Payout.surrender(50)).toBe(-25);
    });

    it('insurance win pays 2:1 on side bet', () => {
        expect(Payout.insuranceWin(10)).toBe(10);
    });

    it('insurance loss loses half original bet', () => {
        expect(Payout.insuranceLose(10)).toBe(-5);
    });

    it('double win pays 2x', () => {
        expect(Payout.doubleWin(10)).toBe(20);
    });

    it('double loss loses 2x', () => {
        expect(Payout.doubleLose(10)).toBe(-20);
    });
});

describe('Bankroll updates in Game', () => {
    it('regular win: bankroll increases by bet', () => {
        // Player: 10+9=19, Dealer: 10+7=17 → player wins
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('9', '♠'), new Card('7', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(50);
        game.deal();
        game.stand();
        expect(game.result).toBe('win');
        expect(game.bankroll).toBe(1050);
    });

    it('blackjack: bankroll increases by 1.5x bet', () => {
        const shoe = riggedShoe([
            new Card('A', '♠'), new Card('5', '♠'),
            new Card('K', '♠'), new Card('6', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(100);
        game.deal();
        expect(game.result).toBe('blackjack');
        expect(game.bankroll).toBe(1150);
    });

    it('push: bankroll unchanged', () => {
        // Player: 10+8=18, Dealer: 10+8=18 → push
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('8', '♠'), new Card('8', '♥'),
        ]);
        const game = new Game(shoe);
        game.placeBet(50);
        game.deal();
        game.stand();
        expect(game.result).toBe('push');
        expect(game.bankroll).toBe(1000);
    });

    it('loss: bankroll decreases by bet', () => {
        // Player: 10+7=17, Dealer: 10+9=19 → lose
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('7', '♠'), new Card('9', '♠'),
        ]);
        const game = new Game(shoe);
        game.placeBet(50);
        game.deal();
        game.stand();
        expect(game.result).toBe('lose');
        expect(game.bankroll).toBe(950);
    });

    it('player bust: bankroll decreases by bet', () => {
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('5', '♠'),
            new Card('6', '♠'), new Card('6', '♥'),
            new Card('K', '♠'), // hit → bust
        ]);
        const game = new Game(shoe);
        game.placeBet(25);
        game.deal();
        game.hit();
        expect(game.result).toBe('player_bust');
        expect(game.bankroll).toBe(975);
    });

    it('dealer bust: bankroll increases by bet', () => {
        // Player: 10+8=18 (stand). Dealer: 10+6=16, hits K → 26 bust
        const shoe = riggedShoe([
            new Card('10', '♠'), new Card('10', '♥'),
            new Card('8', '♠'), new Card('6', '♠'),
            new Card('K', '♠'), // dealer draw → bust
        ]);
        const game = new Game(shoe);
        game.placeBet(50);
        game.deal();
        game.stand();
        expect(game.result).toBe('dealer_bust');
        expect(game.bankroll).toBe(1050);
    });
});
