import { describe, it, expect } from 'vitest';
import { Card } from '../../static/js/card.js';
import { Hand } from '../../static/js/hand.js';

function makeHand(...cards) {
    const hand = new Hand();
    for (const [rank, suit] of cards) {
        hand.addCard(new Card(rank, suit || '♠'));
    }
    return hand;
}

describe('Hand scoring', () => {
    it('scores hard hands correctly (no aces)', () => {
        const hand = makeHand(['7'], ['9']);
        expect(hand.score()).toBe(16);
        expect(hand.isSoft()).toBe(false);
    });

    it('scores face cards as 10', () => {
        const hand = makeHand(['K'], ['Q']);
        expect(hand.score()).toBe(20);
    });

    it('scores soft hands (ace counted as 11)', () => {
        const hand = makeHand(['A'], ['7']);
        expect(hand.score()).toBe(18);
        expect(hand.isSoft()).toBe(true);
    });

    it('downgrades ace from 11 to 1 when would bust', () => {
        const hand = makeHand(['A'], ['7'], ['8']);
        // A(11)+7+8 = 26 → bust, so A becomes 1: 1+7+8 = 16
        expect(hand.score()).toBe(16);
        expect(hand.isSoft()).toBe(false);
    });

    it('handles multiple aces', () => {
        const hand = makeHand(['A'], ['A']);
        // A(11)+A(11) = 22 → one downgrades: 11+1 = 12
        expect(hand.score()).toBe(12);
        expect(hand.isSoft()).toBe(true);

        hand.addCard(new Card('9', '♠'));
        // 12 + 9 = 21, still soft? 11+1+9=21, yes one ace still 11
        expect(hand.score()).toBe(21);
        expect(hand.isSoft()).toBe(true);
    });

    it('handles three aces', () => {
        const hand = makeHand(['A'], ['A'], ['A']);
        // 11+1+1 = 13
        expect(hand.score()).toBe(13);
        expect(hand.isSoft()).toBe(true);
    });
});

describe('Blackjack detection', () => {
    it('detects blackjack (Ace + 10-value, exactly 2 cards)', () => {
        expect(makeHand(['A'], ['K']).isBlackjack()).toBe(true);
        expect(makeHand(['A'], ['10']).isBlackjack()).toBe(true);
        expect(makeHand(['A'], ['J']).isBlackjack()).toBe(true);
        expect(makeHand(['A'], ['Q']).isBlackjack()).toBe(true);
        // Order shouldn't matter
        expect(makeHand(['10'], ['A']).isBlackjack()).toBe(true);
    });

    it('3-card 21 is NOT blackjack', () => {
        const hand = makeHand(['7'], ['7'], ['7']);
        expect(hand.score()).toBe(21);
        expect(hand.isBlackjack()).toBe(false);
    });

    it('A + 9 is not blackjack', () => {
        expect(makeHand(['A'], ['9']).isBlackjack()).toBe(false);
    });
});

describe('Bust detection', () => {
    it('detects bust (> 21)', () => {
        const hand = makeHand(['K'], ['Q'], ['5']);
        expect(hand.score()).toBe(25);
        expect(hand.isBust()).toBe(true);
    });

    it('not bust at exactly 21', () => {
        expect(makeHand(['K'], ['A']).isBust()).toBe(false);
    });

    it('not bust when ace downgrades', () => {
        const hand = makeHand(['A'], ['K'], ['5']);
        // 11+10+5 = 26 → 1+10+5 = 16
        expect(hand.isBust()).toBe(false);
        expect(hand.score()).toBe(16);
    });
});

describe('Pair detection', () => {
    it('detects matching rank pair', () => {
        expect(makeHand(['8', '♠'], ['8', '♥']).isPair()).toBe(true);
    });

    it('rejects non-pair', () => {
        expect(makeHand(['8'], ['9']).isPair()).toBe(false);
    });

    it('rejects same value different rank (K vs Q)', () => {
        expect(makeHand(['K'], ['Q']).isPair()).toBe(false);
    });

    it('rejects 3+ card hands', () => {
        expect(makeHand(['8'], ['8'], ['8']).isPair()).toBe(false);
    });
});
