/**
 * Basic strategy lookup tables for 6-deck, H17, DAS allowed.
 * Three tables: hard totals, soft totals, pairs.
 * Actions: H = Hit, S = Stand, D = Double (hit if not allowed), P = Split
 * Surrender is Phase 5 — for now, surrender fallback maps to Hit.
 *
 * Dealer upcard key: '2'..'10', 'A'
 * Hard table key: player total 5..17
 * Soft table key: player non-ace card value 2..9 (representing A,2 through A,9)
 * Pair table key: card rank '2'..'A'
 */

const Strategy = (() => {
    // Dealer columns in order: 2, 3, 4, 5, 6, 7, 8, 9, 10, A
    const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

    // Hard totals: player 5-17 vs dealer 2-A
    // Format: { playerTotal: { dealerUpcard: action } }
    const HARD = {
        5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
        9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
        11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'H' },
        12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
        17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
    };

    // Soft totals: A,X where X = 2..9
    // Key is the non-ace card value (2-9)
    const SOFT = {
        2: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        3: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        4: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        5: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        6: { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
        7: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'S','8':'S','9':'H','10':'H','A':'H' },
        8: { '2':'S','3':'S','4':'S','5':'S','6':'D','7':'S','8':'S','9':'S','10':'S','A':'S' },
        9: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
    };

    // Pair splitting: key is the rank of the pair
    // P = Split, H = Hit, S = Stand, D = Double
    const PAIRS = {
        '2':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '3':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '4':  { '2':'H','3':'H','4':'H','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
        '5':  { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
        '6':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
        '7':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
        '8':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
        '9':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'S','8':'P','9':'P','10':'S','A':'S' },
        '10': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'J':  { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'Q':  { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'K':  { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
        'A':  { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
    };

    const ACTION_NAMES = {
        'H': 'Hit',
        'S': 'Stand',
        'D': 'Double',
        'P': 'Split',
    };

    /**
     * Normalize dealer upcard to lookup key.
     * Face cards (J/Q/K) map to '10', Ace to 'A'.
     */
    function dealerKey(card) {
        if (!card) return null;
        const rank = card.rank || card;
        if (['J', 'Q', 'K'].includes(rank)) return '10';
        return rank;
    }

    /**
     * Determine hand type: 'pair', 'soft', or 'hard'.
     */
    function handType(hand) {
        if (hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank) {
            return 'pair';
        }
        if (hand.isSoft()) {
            return 'soft';
        }
        return 'hard';
    }

    /**
     * Get the optimal action for a hand vs dealer upcard.
     * Returns action code: 'H', 'S', 'D', or 'P'.
     */
    function getOptimalAction(hand, dealerUpcard) {
        const dk = dealerKey(dealerUpcard);
        if (!dk) return null;

        const type = handType(hand);
        const canDouble = hand.cards.length === 2;

        if (type === 'pair') {
            const rank = hand.cards[0].rank;
            const pairRow = PAIRS[rank];
            if (pairRow) {
                let action = pairRow[dk];
                if (action === 'D' && !canDouble) action = 'H';
                return action;
            }
        }

        if (type === 'soft') {
            const softKey = hand.score() - 11;
            if (softKey >= 2 && softKey <= 9) {
                const softRow = SOFT[softKey];
                if (softRow) {
                    let action = softRow[dk];
                    if (action === 'D' && !canDouble) action = 'H';
                    return action;
                }
            }
            if (softKey >= 10) return 'S';
        }

        // Hard total lookup
        const total = hand.score();
        if (total >= 17) return 'S';
        if (total <= 4) return 'H';
        const hardRow = HARD[total];
        if (hardRow) {
            let action = hardRow[dk];
            if (action === 'D' && !canDouble) action = 'H';
            return action;
        }

        return 'H'; // fallback
    }

    /**
     * Get the optimal action as a human-readable string.
     */
    function getOptimalActionName(hand, dealerUpcard) {
        const code = getOptimalAction(hand, dealerUpcard);
        return ACTION_NAMES[code] || code;
    }

    /**
     * Get action frequency breakdown for a hand across all dealer upcards.
     * Returns a string like "Stand 60% · Hit 40%" showing how often
     * each action is correct for this hand type across all dealer cards.
     */
    function getFrequencyBreakdown(hand) {
        const type = handType(hand);
        const counts = {};

        // Look up the row for this hand across all 10 dealer upcards
        for (const dk of DEALER_COLS) {
            let action;
            if (type === 'pair') {
                const rank = hand.cards[0].rank;
                const row = PAIRS[rank];
                action = row ? row[dk] : 'H';
            } else if (type === 'soft') {
                const softKey = hand.score() - 11;
                if (softKey >= 2 && softKey <= 9) {
                    const row = SOFT[softKey];
                    action = row ? row[dk] : 'S';
                } else {
                    action = 'S';
                }
            } else {
                const total = hand.score();
                if (total >= 17) { action = 'S'; }
                else if (total <= 4) { action = 'H'; }
                else {
                    const row = HARD[total];
                    action = row ? row[dk] : 'H';
                }
            }
            counts[action] = (counts[action] || 0) + 1;
        }

        // Build readable string sorted by frequency
        const total = DEALER_COLS.length;
        const parts = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([code, n]) => {
                const pct = Math.round((n / total) * 100);
                return `${ACTION_NAMES[code]} ${pct}%`;
            });

        return parts.join(' · ');
    }

    /**
     * Illustrious 18 — count-based strategy deviations.
     * Each entry: { hand, dealer, tc, action, defaultAction, description }
     * "tc" = minimum true count to deviate.
     */
    const ILLUSTRIOUS_18 = [
        { id: 1,  hand: 'Insurance',   dealer: 'A',  tc: 3,  action: 'Insure',  defaultAction: 'No',     desc: 'Take insurance at TC +3' },
        { id: 2,  hand: 'Hard 16',     dealer: '10', tc: 0,  action: 'S',       defaultAction: 'H',      desc: '16 vs 10: Stand at TC ≥ 0' },
        { id: 3,  hand: 'Hard 15',     dealer: '10', tc: 4,  action: 'S',       defaultAction: 'H',      desc: '15 vs 10: Stand at TC +4' },
        { id: 4,  hand: '10-10',       dealer: '5',  tc: 5,  action: 'P',       defaultAction: 'S',      desc: '10s vs 5: Split at TC +5' },
        { id: 5,  hand: '10-10',       dealer: '6',  tc: 4,  action: 'P',       defaultAction: 'S',      desc: '10s vs 6: Split at TC +4' },
        { id: 6,  hand: 'Hard 10',     dealer: '10', tc: 4,  action: 'D',       defaultAction: 'H',      desc: '10 vs 10: Double at TC +4' },
        { id: 7,  hand: 'Hard 12',     dealer: '3',  tc: 2,  action: 'S',       defaultAction: 'H',      desc: '12 vs 3: Stand at TC +2' },
        { id: 8,  hand: 'Hard 12',     dealer: '2',  tc: 3,  action: 'S',       defaultAction: 'H',      desc: '12 vs 2: Stand at TC +3' },
        { id: 9,  hand: 'Hard 11',     dealer: 'A',  tc: 1,  action: 'D',       defaultAction: 'H',      desc: '11 vs A: Double at TC +1' },
        { id: 10, hand: 'Hard 9',      dealer: '2',  tc: 1,  action: 'D',       defaultAction: 'H',      desc: '9 vs 2: Double at TC +1' },
        { id: 11, hand: 'Hard 10',     dealer: 'A',  tc: 4,  action: 'D',       defaultAction: 'H',      desc: '10 vs A: Double at TC +4' },
        { id: 12, hand: 'Hard 9',      dealer: '7',  tc: 3,  action: 'D',       defaultAction: 'H',      desc: '9 vs 7: Double at TC +3' },
        { id: 13, hand: 'Hard 16',     dealer: '9',  tc: 5,  action: 'S',       defaultAction: 'H',      desc: '16 vs 9: Stand at TC +5' },
        { id: 14, hand: 'Hard 13',     dealer: '2',  tc: -1, action: 'H',       defaultAction: 'S',      desc: '13 vs 2: Hit at TC −1' },
        { id: 15, hand: 'Hard 12',     dealer: '4',  tc: 0,  action: 'S',       defaultAction: 'H',      desc: '12 vs 4: Stand at TC ≥ 0' },
        { id: 16, hand: 'Hard 12',     dealer: '5',  tc: -2, action: 'S',       defaultAction: 'H',      desc: '12 vs 5: Stand at TC −2' },
        { id: 17, hand: 'Hard 12',     dealer: '6',  tc: -1, action: 'S',       defaultAction: 'H',      desc: '12 vs 6: Stand at TC −1' },
        { id: 18, hand: 'Hard 13',     dealer: '3',  tc: -2, action: 'H',       defaultAction: 'S',      desc: '13 vs 3: Hit at TC −2' },
    ];

    /**
     * Get recommended bet multiplier based on true count.
     * Returns { multiplier, label } for bet sizing.
     */
    function getBetRecommendation(trueCount) {
        if (trueCount <= 0) return { multiplier: 1, label: 'Min bet' };
        if (trueCount === 1) return { multiplier: 2, label: '2x' };
        if (trueCount === 2) return { multiplier: 4, label: '4x' };
        if (trueCount === 3) return { multiplier: 8, label: '8x' };
        if (trueCount === 4) return { multiplier: 10, label: '10x' };
        return { multiplier: 12, label: '12x' };
    }

    /**
     * Check if any Illustrious 18 deviation applies to the current hand.
     * Returns the deviation object or null.
     */
    function getDeviation(hand, dealerUpcard, trueCount) {
        const dk = dealerKey(dealerUpcard);
        const type = handType(hand);
        const total = hand.score();

        for (const dev of ILLUSTRIOUS_18) {
            if (dev.dealer !== dk) continue;

            // Match hand description to current hand
            if (type === 'pair' && hand.cards[0].value === 10 && dev.hand === '10-10') {
                if (trueCount >= dev.tc) return dev;
            }
            if (type === 'hard' && dev.hand === 'Hard ' + total) {
                if (trueCount >= dev.tc) return dev;
            }
        }
        return null;
    }

    return {
        HARD,
        SOFT,
        PAIRS,
        DEALER_COLS,
        ACTION_NAMES,
        ILLUSTRIOUS_18,
        dealerKey,
        handType,
        getOptimalAction,
        getOptimalActionName,
        getFrequencyBreakdown,
        getBetRecommendation,
        getDeviation,
    };
})();

/**
 * Accuracy tracker for strategy decisions.
 * Tracks overall and per hand type (hard/soft/pair).
 */
class AccuracyTracker {
    constructor() {
        this.overall = { correct: 0, total: 0 };
        this.byType = {
            hard: { correct: 0, total: 0 },
            soft: { correct: 0, total: 0 },
            pair: { correct: 0, total: 0 },
        };
    }

    record(handType, wasCorrect) {
        this.overall.total++;
        if (wasCorrect) this.overall.correct++;

        const bucket = this.byType[handType];
        if (bucket) {
            bucket.total++;
            if (wasCorrect) bucket.correct++;
        }
    }

    overallPct() {
        if (this.overall.total === 0) return 0;
        return Math.round((this.overall.correct / this.overall.total) * 100);
    }

    typePct(type) {
        const bucket = this.byType[type];
        if (!bucket || bucket.total === 0) return 0;
        return Math.round((bucket.correct / bucket.total) * 100);
    }

    reset() {
        this.overall = { correct: 0, total: 0 };
        for (const key in this.byType) {
            this.byType[key] = { correct: 0, total: 0 };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Strategy, AccuracyTracker };
}
