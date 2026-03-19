/**
 * Hand scoring for blackjack.
 * Handles soft/hard totals, ace flexibility, blackjack detection, bust.
 */

class Hand {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    score() {
        let total = 0;
        let aces = 0;

        for (const card of this.cards) {
            total += card.value;
            if (card.isAce()) aces++;
        }

        // Downgrade aces from 11 to 1 as needed
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    isSoft() {
        let total = 0;
        let aces = 0;

        for (const card of this.cards) {
            total += card.value;
            if (card.isAce()) aces++;
        }

        // After downgrading aces to avoid bust, is there still an ace counted as 11?
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return aces > 0 && total <= 21;
    }

    isBlackjack() {
        return this.cards.length === 2 && this.score() === 21;
    }

    isBust() {
        return this.score() > 21;
    }

    isPair() {
        return this.cards.length === 2 && this.cards[0].rank === this.cards[1].rank;
    }

    toString() {
        return this.cards.map(c => c.toString()).join(', ');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Hand };
}
