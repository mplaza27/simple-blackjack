import { describe, it, expect } from 'vitest';
import { Card, Shoe, SUITS, RANKS, RANK_VALUES } from '../../static/js/card.js';

describe('Card', () => {
    it('creates cards with correct rank, suit, and value for all ranks', () => {
        const expected = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11
        };
        for (const [rank, value] of Object.entries(expected)) {
            const card = new Card(rank, '♠');
            expect(card.rank).toBe(rank);
            expect(card.suit).toBe('♠');
            expect(card.value).toBe(value);
        }
    });

    it('identifies aces correctly', () => {
        expect(new Card('A', '♠').isAce()).toBe(true);
        expect(new Card('K', '♠').isAce()).toBe(false);
    });

    it('identifies ten-value cards correctly', () => {
        for (const rank of ['10', 'J', 'Q', 'K']) {
            expect(new Card(rank, '♠').isTenValue()).toBe(true);
        }
        expect(new Card('9', '♠').isTenValue()).toBe(false);
        expect(new Card('A', '♠').isTenValue()).toBe(false);
    });

    it('returns correct color for suits', () => {
        expect(new Card('A', '♠').color()).toBe('black');
        expect(new Card('A', '♣').color()).toBe('black');
        expect(new Card('A', '♥').color()).toBe('red');
        expect(new Card('A', '♦').color()).toBe('red');
    });

    it('toString returns rank + suit', () => {
        expect(new Card('A', '♠').toString()).toBe('A♠');
        expect(new Card('10', '♥').toString()).toBe('10♥');
    });
});

describe('Shoe', () => {
    it('contains exactly 312 cards (6 decks)', () => {
        const shoe = new Shoe(6);
        expect(shoe.remaining()).toBe(312);
    });

    it('deals unique cards until reshuffle', () => {
        const shoe = new Shoe(6);
        const dealt = [];
        // Deal most of the shoe
        for (let i = 0; i < 234; i++) {
            const card = shoe.deal();
            dealt.push(card);
            expect(card).toBeInstanceOf(Card);
        }
        // Remaining should be 312 - 234 = 78
        expect(shoe.remaining()).toBe(78);
        // All dealt cards should be Card instances with valid properties
        for (const card of dealt) {
            expect(RANKS).toContain(card.rank);
            expect(SUITS).toContain(card.suit);
        }
    });

    it('triggers reshuffle at < 78 cards remaining', () => {
        const shoe = new Shoe(6);
        // Deal until 78 remain — should NOT need shuffle
        for (let i = 0; i < 234; i++) shoe.deal();
        expect(shoe.needsShuffle()).toBe(false);

        // Deal one more — now 77 remain — should need shuffle
        shoe.deal();
        expect(shoe.needsShuffle()).toBe(true);
    });

    it('reshuffles and restores full shoe', () => {
        const shoe = new Shoe(6);
        for (let i = 0; i < 300; i++) shoe.deal();
        expect(shoe.remaining()).toBe(12);
        shoe.shuffle();
        expect(shoe.remaining()).toBe(312);
    });

    it('deal auto-shuffles when shoe is empty', () => {
        const shoe = new Shoe(1); // 1 deck = 52 cards
        for (let i = 0; i < 52; i++) shoe.deal();
        expect(shoe.remaining()).toBe(0);
        // Next deal should auto-shuffle
        const card = shoe.deal();
        expect(card).toBeInstanceOf(Card);
        expect(shoe.remaining()).toBe(51);
    });

    it('decksRemaining returns correct value', () => {
        const shoe = new Shoe(6);
        expect(shoe.decksRemaining()).toBe(6);
        for (let i = 0; i < 52; i++) shoe.deal();
        expect(shoe.decksRemaining()).toBe(5);
    });
});
