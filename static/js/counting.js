/**
 * Hi-Lo card counting system.
 * +1: 2,3,4,5,6  |  0: 7,8,9  |  -1: 10,J,Q,K,A
 * Running count persists across hands within the same shoe, resets on shuffle.
 */

const HI_LO_VALUES = {
    '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
    '7': 0, '8': 0, '9': 0,
    '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1,
};

class CardCounter {
    constructor(numDecks = 6) {
        this.numDecks = numDecks;
        this.runningCount = 0;
        this.cardsDealt = 0;
    }

    /** Get the Hi-Lo value for a card rank. */
    static hiLoValue(rank) {
        return HI_LO_VALUES[rank] ?? 0;
    }

    /** Update count for a revealed card. */
    addCard(card) {
        const rank = card.rank || card;
        this.runningCount += CardCounter.hiLoValue(rank);
        this.cardsDealt++;
    }

    /** Decks remaining (approximate). */
    decksRemaining() {
        const totalCards = this.numDecks * 52;
        const remaining = totalCards - this.cardsDealt;
        return Math.max(remaining / 52, 0.5); // floor at 0.5 to avoid division issues
    }

    /** True count = running count / decks remaining. */
    trueCount() {
        return Math.round((this.runningCount / this.decksRemaining()) * 10) / 10;
    }

    /** Reset on shoe reshuffle. */
    reset() {
        this.runningCount = 0;
        this.cardsDealt = 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardCounter, HI_LO_VALUES };
}
