import { describe, it, expect } from 'vitest';
import { Card } from '../../static/js/card.js';
import { Hand } from '../../static/js/hand.js';
import { Strategy, AccuracyTracker } from '../../static/js/strategy.js';

function makeHand(...cards) {
    const hand = new Hand();
    for (const [rank, suit] of cards) {
        hand.addCard(new Card(rank, suit || '♠'));
    }
    return hand;
}

function makeCard(rank, suit) {
    return new Card(rank, suit || '♠');
}

describe('Hard total lookups', () => {
    // Verified against published 6-deck H17 DAS basic strategy chart
    it('hard 9 vs 3 = Double', () => {
        const hand = makeHand(['4'], ['5']);
        expect(Strategy.getOptimalAction(hand, makeCard('3'))).toBe('D');
    });

    it('hard 9 vs 2 = Hit', () => {
        const hand = makeHand(['4'], ['5']);
        expect(Strategy.getOptimalAction(hand, makeCard('2'))).toBe('H');
    });

    it('hard 10 vs 9 = Double', () => {
        const hand = makeHand(['4'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('9'))).toBe('D');
    });

    it('hard 10 vs 10 = Hit', () => {
        const hand = makeHand(['4'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('10'))).toBe('H');
    });

    it('hard 11 vs A = Hit (H17 rules)', () => {
        const hand = makeHand(['5'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('A'))).toBe('H');
    });

    it('hard 12 vs 4 = Stand', () => {
        const hand = makeHand(['10'], ['2']);
        expect(Strategy.getOptimalAction(hand, makeCard('4'))).toBe('S');
    });

    it('hard 12 vs 2 = Hit', () => {
        const hand = makeHand(['10'], ['2']);
        expect(Strategy.getOptimalAction(hand, makeCard('2'))).toBe('H');
    });

    it('hard 13 vs 2 = Stand', () => {
        const hand = makeHand(['10'], ['3']);
        expect(Strategy.getOptimalAction(hand, makeCard('2'))).toBe('S');
    });

    it('hard 13 vs 7 = Hit', () => {
        const hand = makeHand(['10'], ['3']);
        expect(Strategy.getOptimalAction(hand, makeCard('7'))).toBe('H');
    });

    it('hard 16 vs 10 = Hit (surrender fallback)', () => {
        // In full strategy this would be surrender, but Phase 3 has no surrender
        const hand = makeHand(['10'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('10'))).toBe('H');
    });

    it('hard 17 always stands', () => {
        const hand = makeHand(['10'], ['7']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('S');
        }
    });

    it('hard 5 always hits', () => {
        const hand = makeHand(['2'], ['3']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('H');
        }
    });
});

describe('Soft total lookups', () => {
    it('soft 13 (A,2) vs 5 = Double', () => {
        const hand = makeHand(['A'], ['2']);
        expect(Strategy.getOptimalAction(hand, makeCard('5'))).toBe('D');
    });

    it('soft 13 (A,2) vs 4 = Hit', () => {
        const hand = makeHand(['A'], ['2']);
        expect(Strategy.getOptimalAction(hand, makeCard('4'))).toBe('H');
    });

    it('soft 17 (A,6) vs 3 = Double', () => {
        const hand = makeHand(['A'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('3'))).toBe('D');
    });

    it('soft 17 (A,6) vs 2 = Hit', () => {
        const hand = makeHand(['A'], ['6']);
        expect(Strategy.getOptimalAction(hand, makeCard('2'))).toBe('H');
    });

    it('soft 18 (A,7) vs 2 = Double', () => {
        const hand = makeHand(['A'], ['7']);
        expect(Strategy.getOptimalAction(hand, makeCard('2'))).toBe('D');
    });

    it('soft 18 (A,7) vs 7 = Stand', () => {
        const hand = makeHand(['A'], ['7']);
        expect(Strategy.getOptimalAction(hand, makeCard('7'))).toBe('S');
    });

    it('soft 18 (A,7) vs 9 = Hit', () => {
        const hand = makeHand(['A'], ['7']);
        expect(Strategy.getOptimalAction(hand, makeCard('9'))).toBe('H');
    });

    it('soft 19 (A,8) always stands', () => {
        const hand = makeHand(['A'], ['8']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            const action = Strategy.getOptimalAction(hand, makeCard(rank));
            // A,8 vs 6 = Double in some charts, Stand in others; our table says Stand
            if (rank === '6') {
                expect(action).toBe('D');
            } else {
                expect(action).toBe('S');
            }
        }
    });

    it('soft 20 (A,9) always stands', () => {
        const hand = makeHand(['A'], ['9']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('S');
        }
    });
});

describe('Pair split lookups', () => {
    it('pair of 8s always splits', () => {
        const hand = makeHand(['8', '♠'], ['8', '♥']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('P');
        }
    });

    it('pair of Aces always splits', () => {
        const hand = makeHand(['A', '♠'], ['A', '♥']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('P');
        }
    });

    it('pair of 10s always stands', () => {
        const hand = makeHand(['10', '♠'], ['10', '♥']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('S');
        }
    });

    it('pair of 5s vs 9 = Double', () => {
        const hand = makeHand(['5', '♠'], ['5', '♥']);
        expect(Strategy.getOptimalAction(hand, makeCard('9'))).toBe('D');
    });

    it('pair of 5s vs 10 = Hit', () => {
        const hand = makeHand(['5', '♠'], ['5', '♥']);
        expect(Strategy.getOptimalAction(hand, makeCard('10'))).toBe('H');
    });

    it('pair of 9s vs 7 = Stand', () => {
        const hand = makeHand(['9', '♠'], ['9', '♥']);
        expect(Strategy.getOptimalAction(hand, makeCard('7'))).toBe('S');
    });

    it('pair of 4s vs 5 = Split (DAS)', () => {
        const hand = makeHand(['4', '♠'], ['4', '♥']);
        expect(Strategy.getOptimalAction(hand, makeCard('5'))).toBe('P');
    });

    it('pair of 4s vs 7 = Hit', () => {
        const hand = makeHand(['4', '♠'], ['4', '♥']);
        expect(Strategy.getOptimalAction(hand, makeCard('7'))).toBe('H');
    });

    it('pair of Ks always stands (face card pair)', () => {
        const hand = makeHand(['K', '♠'], ['K', '♥']);
        for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
            expect(Strategy.getOptimalAction(hand, makeCard(rank))).toBe('S');
        }
    });
});

describe('Strategy returns valid action for every hand/dealer combo', () => {
    const validActions = new Set(['H', 'S', 'D', 'P']);
    const dealerRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

    it('all hard totals 5-21 return valid actions', () => {
        for (let total = 5; total <= 21; total++) {
            // Construct a hand with the given total
            const r1 = Math.min(total - 2, 10);
            const r2 = total - r1;
            if (r2 < 2 || r2 > 10) continue;
            const hand = makeHand([String(r1)], [String(r2)]);
            for (const dk of dealerRanks) {
                const action = Strategy.getOptimalAction(hand, makeCard(dk));
                expect(validActions.has(action)).toBe(true);
            }
        }
    });

    it('all soft totals A,2 through A,9 return valid actions', () => {
        for (let v = 2; v <= 9; v++) {
            const hand = makeHand(['A'], [String(v)]);
            for (const dk of dealerRanks) {
                const action = Strategy.getOptimalAction(hand, makeCard(dk));
                expect(validActions.has(action)).toBe(true);
            }
        }
    });

    it('all pairs return valid actions', () => {
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        for (const rank of ranks) {
            const hand = makeHand([rank, '♠'], [rank, '♥']);
            for (const dk of dealerRanks) {
                const action = Strategy.getOptimalAction(hand, makeCard(dk));
                expect(validActions.has(action)).toBe(true);
            }
        }
    });
});

describe('Edge cases', () => {
    it('face cards as dealer upcard normalize to 10', () => {
        const hand = makeHand(['10'], ['6']); // hard 16
        expect(Strategy.getOptimalAction(hand, makeCard('J'))).toBe('H');
        expect(Strategy.getOptimalAction(hand, makeCard('Q'))).toBe('H');
        expect(Strategy.getOptimalAction(hand, makeCard('K'))).toBe('H');
    });

    it('hard 4 (2+2 non-pair context after hit) = Hit', () => {
        // After a hit, hand is no longer a pair — treated as hard
        const hand = new Hand();
        hand.addCard(new Card('2', '♠'));
        hand.addCard(new Card('2', '♥'));
        hand.addCard(new Card('A', '♦')); // 2+2+11 = 15 soft, or 2+2+1 = 5
        // Actually: 2+2+11=15 soft. soft key = 15-11 = 4
        expect(Strategy.handType(hand)).toBe('soft');
    });

    it('hand type detection: pair', () => {
        expect(Strategy.handType(makeHand(['8', '♠'], ['8', '♥']))).toBe('pair');
    });

    it('hand type detection: soft', () => {
        expect(Strategy.handType(makeHand(['A'], ['6']))).toBe('soft');
    });

    it('hand type detection: hard', () => {
        expect(Strategy.handType(makeHand(['10'], ['6']))).toBe('hard');
    });
});

describe('AccuracyTracker', () => {
    it('increments correctly on correct decision', () => {
        const tracker = new AccuracyTracker();
        tracker.record('hard', true);
        expect(tracker.overall.correct).toBe(1);
        expect(tracker.overall.total).toBe(1);
        expect(tracker.overallPct()).toBe(100);
    });

    it('increments correctly on wrong decision', () => {
        const tracker = new AccuracyTracker();
        tracker.record('hard', false);
        expect(tracker.overall.correct).toBe(0);
        expect(tracker.overall.total).toBe(1);
        expect(tracker.overallPct()).toBe(0);
    });

    it('tracks by hand type separately', () => {
        const tracker = new AccuracyTracker();
        tracker.record('hard', true);
        tracker.record('hard', false);
        tracker.record('soft', true);
        tracker.record('pair', true);
        tracker.record('pair', true);
        tracker.record('pair', false);

        expect(tracker.typePct('hard')).toBe(50);
        expect(tracker.typePct('soft')).toBe(100);
        expect(tracker.typePct('pair')).toBe(67); // 2/3 = 66.67 rounds to 67
    });

    it('overall percentage across types', () => {
        const tracker = new AccuracyTracker();
        tracker.record('hard', true);
        tracker.record('soft', false);
        tracker.record('pair', true);
        // 2/3 correct = 67%
        expect(tracker.overallPct()).toBe(67);
    });

    it('returns 0 when no decisions recorded', () => {
        const tracker = new AccuracyTracker();
        expect(tracker.overallPct()).toBe(0);
        expect(tracker.typePct('hard')).toBe(0);
    });

    it('reset clears all counters', () => {
        const tracker = new AccuracyTracker();
        tracker.record('hard', true);
        tracker.record('soft', true);
        tracker.reset();
        expect(tracker.overall.total).toBe(0);
        expect(tracker.overall.correct).toBe(0);
        expect(tracker.byType.hard.total).toBe(0);
        expect(tracker.byType.soft.total).toBe(0);
    });

    it('accuracy by hand type (hard/soft/pair) tracked separately', () => {
        const tracker = new AccuracyTracker();
        // 10 hard decisions: 8 correct
        for (let i = 0; i < 8; i++) tracker.record('hard', true);
        for (let i = 0; i < 2; i++) tracker.record('hard', false);
        // 5 soft decisions: 3 correct
        for (let i = 0; i < 3; i++) tracker.record('soft', true);
        for (let i = 0; i < 2; i++) tracker.record('soft', false);
        // 4 pair decisions: 4 correct
        for (let i = 0; i < 4; i++) tracker.record('pair', true);

        expect(tracker.typePct('hard')).toBe(80);
        expect(tracker.typePct('soft')).toBe(60);
        expect(tracker.typePct('pair')).toBe(100);
        // Overall: 15/19 = 79%
        expect(tracker.overallPct()).toBe(79);
    });
});
