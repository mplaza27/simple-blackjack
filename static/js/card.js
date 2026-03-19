/**
 * Card, Deck, and Shoe classes for blackjack.
 * 6-deck shoe with cut card at ~75% penetration.
 */

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
        this.value = RANK_VALUES[rank];
    }

    isAce() {
        return this.rank === 'A';
    }

    isTenValue() {
        return this.value === 10;
    }

    color() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }
}

class Shoe {
    constructor(numDecks = 6) {
        this.numDecks = numDecks;
        this.cutCardPosition = 78; // reshuffle when fewer than this many cards remain
        this.cards = [];
        this.shuffle();
    }

    shuffle() {
        this.cards = [];
        for (let d = 0; d < this.numDecks; d++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    this.cards.push(new Card(rank, suit));
                }
            }
        }
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) {
            this.shuffle();
        }
        return this.cards.pop();
    }

    needsShuffle() {
        return this.cards.length < this.cutCardPosition;
    }

    remaining() {
        return this.cards.length;
    }

    decksRemaining() {
        return this.cards.length / 52;
    }
}

// Export for testing (Node/Vitest) while keeping browser-compatible
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card, Shoe, SUITS, RANKS, RANK_VALUES };
}
