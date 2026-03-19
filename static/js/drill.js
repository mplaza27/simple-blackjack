/**
 * Drill Mode — quick-fire strategy quiz.
 * Random hand + dealer upcard, player picks action, instant feedback.
 * No shoe state — pure strategy memorization.
 */

// Import dependencies when running in Node/Vitest
if (typeof require !== 'undefined') {
    if (typeof Card === 'undefined') globalThis.Card = require('./card.js').Card;
    if (typeof Hand === 'undefined') globalThis.Hand = require('./hand.js').Hand;
    if (typeof Strategy === 'undefined') {
        const strat = require('./strategy.js');
        globalThis.Strategy = strat.Strategy;
    }
}

class DrillMode {
    constructor() {
        this.active = false;
        this.currentHand = null;
        this.currentDealerUpcard = null;
        this.currentOptimal = null;
        this.currentHandType = null;
        this.stats = {
            total: 0,
            correct: 0,
            byType: {
                hard: { total: 0, correct: 0 },
                soft: { total: 0, correct: 0 },
                pair: { total: 0, correct: 0 },
            },
        };
        this.history = []; // last N drills for weak spot detection
    }

    start() {
        this.active = true;
        this.generateHand();
    }

    stop() {
        this.active = false;
        this.currentHand = null;
        this.currentDealerUpcard = null;
        this.currentOptimal = null;
    }

    generateHand() {
        const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
        const randomSuit = () => SUITS[Math.floor(Math.random() * 4)];
        const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        // Decide hand type: 40% hard, 30% soft, 30% pair
        const roll = Math.random();
        const hand = new Hand();

        if (roll < 0.40) {
            // Hard hand (5-17)
            const target = 5 + Math.floor(Math.random() * 13); // 5-17
            let r1 = Math.min(target - 2, 10);
            let r2 = target - r1;
            if (r2 > 10) { r1 = 10; r2 = target - 10; }
            if (r2 < 2) { r2 = 2; r1 = target - 2; }
            const rank1 = r1 === 10 ? (['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)]) : String(r1);
            const rank2 = r2 === 10 ? (['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)]) : String(r2);
            hand.addCard(new Card(rank1, randomSuit()));
            hand.addCard(new Card(rank2, randomSuit()));
            this.currentHandType = 'hard';
        } else if (roll < 0.70) {
            // Soft hand (A + 2-9)
            const otherValue = 2 + Math.floor(Math.random() * 8); // 2-9
            const otherRank = String(otherValue);
            hand.addCard(new Card('A', randomSuit()));
            hand.addCard(new Card(otherRank, randomSuit()));
            this.currentHandType = 'soft';
        } else {
            // Pair
            const pairRank = RANKS[Math.floor(Math.random() * RANKS.length)];
            hand.addCard(new Card(pairRank, randomSuit()));
            hand.addCard(new Card(pairRank, SUITS[(SUITS.indexOf(hand.cards[0].suit) + 1) % 4]));
            this.currentHandType = 'pair';
        }

        // Random dealer upcard
        const dealerRank = RANKS[Math.floor(Math.random() * RANKS.length)];
        this.currentDealerUpcard = new Card(dealerRank, randomSuit());
        this.currentHand = hand;
        this.currentOptimal = Strategy.getOptimalAction(hand, this.currentDealerUpcard);
    }

    /** Player submits an action. Returns { correct, optimal, isClose, breakdown } */
    answer(actionCode) {
        if (!this.currentHand || !this.currentOptimal) return null;

        const wasCorrect = actionCode === this.currentOptimal;
        const optimalName = Strategy.ACTION_NAMES[this.currentOptimal];
        const playerName = Strategy.ACTION_NAMES[actionCode];
        const breakdown = Strategy.getFrequencyBreakdown(this.currentHand);

        // Check close call
        let isClose = false;
        if (!wasCorrect && breakdown) {
            const match = breakdown.match(new RegExp(playerName + '\\s+(\\d+)%'));
            if (match && parseInt(match[1], 10) >= 40) {
                isClose = true;
            }
        }

        const countAsCorrect = wasCorrect || isClose;

        // Record stats
        this.stats.total++;
        if (countAsCorrect) this.stats.correct++;

        const bucket = this.stats.byType[this.currentHandType];
        if (bucket) {
            bucket.total++;
            if (countAsCorrect) bucket.correct++;
        }

        this.history.push({
            handType: this.currentHandType,
            correct: countAsCorrect,
            playerAction: actionCode,
            optimalAction: this.currentOptimal,
        });

        return {
            correct: wasCorrect,
            isClose: isClose,
            optimal: optimalName,
            breakdown: breakdown,
            playerAction: playerName,
        };
    }

    /** Get weak spots (hand types with < 80% accuracy after 50+ drills) */
    getWeakSpots() {
        if (this.stats.total < 50) return [];
        const weak = [];
        for (const [type, bucket] of Object.entries(this.stats.byType)) {
            if (bucket.total >= 5) {
                const pct = Math.round((bucket.correct / bucket.total) * 100);
                if (pct < 80) {
                    weak.push({ type, pct, total: bucket.total });
                }
            }
        }
        return weak;
    }

    overallPct() {
        if (this.stats.total === 0) return 0;
        return Math.round((this.stats.correct / this.stats.total) * 100);
    }

    reset() {
        this.stats = {
            total: 0,
            correct: 0,
            byType: {
                hard: { total: 0, correct: 0 },
                soft: { total: 0, correct: 0 },
                pair: { total: 0, correct: 0 },
            },
        };
        this.history = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DrillMode };
}
