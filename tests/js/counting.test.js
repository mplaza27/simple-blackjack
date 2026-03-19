import { describe, it, expect } from 'vitest';
import { Card } from '../../static/js/card.js';
import { CardCounter, HI_LO_VALUES } from '../../static/js/counting.js';

describe('Hi-Lo values correct for every rank', () => {
    it('+1 for 2,3,4,5,6', () => {
        for (const rank of ['2', '3', '4', '5', '6']) {
            expect(CardCounter.hiLoValue(rank)).toBe(1);
        }
    });

    it('0 for 7,8,9', () => {
        for (const rank of ['7', '8', '9']) {
            expect(CardCounter.hiLoValue(rank)).toBe(0);
        }
    });

    it('-1 for 10,J,Q,K,A', () => {
        for (const rank of ['10', 'J', 'Q', 'K', 'A']) {
            expect(CardCounter.hiLoValue(rank)).toBe(-1);
        }
    });
});

describe('Running count accumulates across multiple cards', () => {
    it('counts a sequence of cards correctly', () => {
        const counter = new CardCounter(6);
        // 2(+1), 3(+1), K(-1), A(-1), 7(0) → running count = 0
        counter.addCard(new Card('2', '♠'));
        expect(counter.runningCount).toBe(1);
        counter.addCard(new Card('3', '♥'));
        expect(counter.runningCount).toBe(2);
        counter.addCard(new Card('K', '♣'));
        expect(counter.runningCount).toBe(1);
        counter.addCard(new Card('A', '♦'));
        expect(counter.runningCount).toBe(0);
        counter.addCard(new Card('7', '♠'));
        expect(counter.runningCount).toBe(0);
    });

    it('tracks cardsDealt count', () => {
        const counter = new CardCounter(6);
        counter.addCard(new Card('5', '♠'));
        counter.addCard(new Card('10', '♥'));
        counter.addCard(new Card('8', '♣'));
        expect(counter.cardsDealt).toBe(3);
    });

    it('accumulates a positive count with low cards', () => {
        const counter = new CardCounter(6);
        // All low cards: 2,3,4,5,6 → +5
        for (const rank of ['2', '3', '4', '5', '6']) {
            counter.addCard(new Card(rank, '♠'));
        }
        expect(counter.runningCount).toBe(5);
    });

    it('accumulates a negative count with high cards', () => {
        const counter = new CardCounter(6);
        // 10,J,Q,K,A → -5
        for (const rank of ['10', 'J', 'Q', 'K', 'A']) {
            counter.addCard(new Card(rank, '♠'));
        }
        expect(counter.runningCount).toBe(-5);
    });
});

describe('True count = running / decks remaining', () => {
    it('true count with fresh 6-deck shoe', () => {
        const counter = new CardCounter(6);
        // Deal 5 low cards → RC = +5, cards dealt = 5
        // Decks remaining = (312 - 5) / 52 ≈ 5.9
        // TC = 5 / 5.9 ≈ 0.8
        for (let i = 0; i < 5; i++) {
            counter.addCard(new Card('3', '♠'));
        }
        expect(counter.runningCount).toBe(5);
        expect(counter.trueCount()).toBeCloseTo(0.8, 0);
    });

    it('true count with half shoe dealt', () => {
        const counter = new CardCounter(6);
        // Simulate 156 cards dealt (half of 312), RC = +10
        counter.cardsDealt = 156;
        counter.runningCount = 10;
        // Decks remaining = 156/52 = 3
        // TC = 10/3 ≈ 3.3
        expect(counter.decksRemaining()).toBe(3);
        expect(counter.trueCount()).toBeCloseTo(3.3, 0);
    });

    it('decks remaining never goes below 0.5', () => {
        const counter = new CardCounter(6);
        counter.cardsDealt = 312; // all cards dealt
        expect(counter.decksRemaining()).toBe(0.5);
    });
});

describe('Decks remaining calculated from cards dealt', () => {
    it('fresh shoe = 6 decks remaining', () => {
        const counter = new CardCounter(6);
        expect(counter.decksRemaining()).toBe(6);
    });

    it('after 52 cards = 5 decks remaining', () => {
        const counter = new CardCounter(6);
        counter.cardsDealt = 52;
        expect(counter.decksRemaining()).toBe(5);
    });

    it('after 260 cards = 1 deck remaining', () => {
        const counter = new CardCounter(6);
        counter.cardsDealt = 260;
        expect(counter.decksRemaining()).toBe(1);
    });
});

describe('Count resets to 0 on shoe reshuffle', () => {
    it('reset clears running count and cards dealt', () => {
        const counter = new CardCounter(6);
        counter.addCard(new Card('5', '♠'));
        counter.addCard(new Card('5', '♥'));
        counter.addCard(new Card('5', '♣'));
        expect(counter.runningCount).toBe(3);
        expect(counter.cardsDealt).toBe(3);

        counter.reset();
        expect(counter.runningCount).toBe(0);
        expect(counter.cardsDealt).toBe(0);
        expect(counter.decksRemaining()).toBe(6);
    });
});

describe('Count persists across hands within same shoe', () => {
    it('count carries over when no reset is called', () => {
        const counter = new CardCounter(6);

        // Hand 1: deal some low cards → positive count
        counter.addCard(new Card('4', '♠'));
        counter.addCard(new Card('5', '♥'));
        counter.addCard(new Card('6', '♣'));
        expect(counter.runningCount).toBe(3);

        // "New hand" — no reset, just keep counting
        counter.addCard(new Card('K', '♠'));
        counter.addCard(new Card('A', '♥'));
        expect(counter.runningCount).toBe(1);
        expect(counter.cardsDealt).toBe(5);
    });
});
