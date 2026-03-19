/**
 * Payout calculation for blackjack.
 * Separated from game.js for testability.
 */

const Payout = {
    /** Blackjack pays 3:2 */
    blackjack(bet) {
        return Math.floor(bet * 1.5);
    },

    /** Regular win pays 1:1 */
    win(bet) {
        return bet;
    },

    /** Push returns 0 (no change) */
    push() {
        return 0;
    },

    /** Loss */
    lose(bet) {
        return -bet;
    },

    /** Surrender loses half the bet */
    surrender(bet) {
        return -Math.floor(bet / 2);
    },

    /** Insurance pays 2:1 on the side bet (half original bet) */
    insuranceWin(bet) {
        return bet; // side bet is bet/2, pays 2:1 = bet
    },

    /** Insurance lost */
    insuranceLose(bet) {
        return -Math.floor(bet / 2);
    },

    /** Double down win pays 2x original bet */
    doubleWin(bet) {
        return bet * 2;
    },

    /** Double down loss loses 2x original bet */
    doubleLose(bet) {
        return -(bet * 2);
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Payout };
}
