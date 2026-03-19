/**
 * Game flow state machine for blackjack.
 * States: BETTING → DEALING → PLAYER_TURN → DEALER_TURN → RESOLUTION
 */

// Import dependencies when running in Node/Vitest (browser uses globals via <script> tags)
if (typeof require !== 'undefined' && typeof Shoe === 'undefined') {
    globalThis.Shoe = require('./card.js').Shoe;
    globalThis.Hand = require('./hand.js').Hand;
}

const GameState = {
    BETTING: 'BETTING',
    DEALING: 'DEALING',
    PLAYER_TURN: 'PLAYER_TURN',
    DEALER_TURN: 'DEALER_TURN',
    RESOLUTION: 'RESOLUTION',
};

class Game {
    constructor(shoe) {
        this.shoe = shoe || new Shoe();
        this.state = GameState.BETTING;
        this.playerHands = []; // array of Hand objects (supports split later)
        this.activeHandIndex = 0;
        this.dealerHand = null;
        this.bet = 0;
        this.bankroll = 1000;
        this.result = null; // set during RESOLUTION
    }

    get playerHand() {
        return this.playerHands[this.activeHandIndex];
    }

    placeBet(amount) {
        if (this.state !== GameState.BETTING) return false;
        if (amount <= 0) return false;
        const newBet = this.bet + amount;
        if (newBet > this.bankroll) return false;
        this.bet = newBet;
        return true;
    }

    clearBet() {
        if (this.state !== GameState.BETTING) return false;
        this.bet = 0;
        return true;
    }

    deal() {
        if (this.state !== GameState.BETTING || this.bet <= 0) return false;

        // Check if shoe needs reshuffling before dealing
        if (this.shoe.needsShuffle()) {
            this.shoe.shuffle();
        }

        this.state = GameState.DEALING;
        this.result = null;

        this.playerHands = [new Hand()];
        this.activeHandIndex = 0;
        this.dealerHand = new Hand();

        // Deal alternating: player, dealer, player, dealer
        this.playerHand.addCard(this.shoe.deal());
        this.dealerHand.addCard(this.shoe.deal());
        this.playerHand.addCard(this.shoe.deal());
        this.dealerHand.addCard(this.shoe.deal());

        // Check for blackjacks
        const playerBJ = this.playerHand.isBlackjack();
        const dealerBJ = this.dealerHand.isBlackjack();

        if (playerBJ || dealerBJ) {
            this.state = GameState.RESOLUTION;
            if (playerBJ && dealerBJ) {
                this.result = 'push';
            } else if (playerBJ) {
                this.result = 'blackjack';
                this.bankroll += Math.floor(this.bet * 1.5);
            } else {
                this.result = 'dealer_blackjack';
                this.bankroll -= this.bet;
            }
            return true;
        }

        this.state = GameState.PLAYER_TURN;
        return true;
    }

    hit() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        this.playerHand.addCard(this.shoe.deal());

        if (this.playerHand.isBust()) {
            this.state = GameState.RESOLUTION;
            this.result = 'player_bust';
            this.bankroll -= this.bet;
        }

        return true;
    }

    double() {
        if (this.state !== GameState.PLAYER_TURN) return false;
        if (this.playerHand.cards.length !== 2) return false;
        if (this.bankroll < this.bet * 2) return false;

        // Double the bet, take exactly one card, then stand
        this.bet *= 2;
        this.playerHand.addCard(this.shoe.deal());

        if (this.playerHand.isBust()) {
            this.state = GameState.RESOLUTION;
            this.result = 'player_bust';
            this.bankroll -= this.bet;
            return true;
        }

        // Auto-stand after double
        this.state = GameState.DEALER_TURN;
        this._dealerPlay();
        this._resolve();
        return true;
    }

    stand() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        this.state = GameState.DEALER_TURN;
        this._dealerPlay();
        this._resolve();
        return true;
    }

    _dealerPlay() {
        // Dealer hits on soft 17, stands on hard 17+
        while (this._dealerMustHit()) {
            this.dealerHand.addCard(this.shoe.deal());
        }
    }

    _dealerMustHit() {
        const score = this.dealerHand.score();
        if (score < 17) return true;
        // Hit on soft 17
        if (score === 17 && this.dealerHand.isSoft()) return true;
        return false;
    }

    _resolve() {
        this.state = GameState.RESOLUTION;
        const playerScore = this.playerHand.score();
        const dealerScore = this.dealerHand.score();

        if (this.dealerHand.isBust()) {
            this.result = 'dealer_bust';
            this.bankroll += this.bet;
        } else if (playerScore > dealerScore) {
            this.result = 'win';
            this.bankroll += this.bet;
        } else if (playerScore < dealerScore) {
            this.result = 'lose';
            this.bankroll -= this.bet;
        } else {
            this.result = 'push';
            // push: no bankroll change
        }
    }

    /** Get the dealer's visible card (upcard) — the first card dealt. */
    dealerUpcard() {
        if (!this.dealerHand || this.dealerHand.cards.length === 0) return null;
        return this.dealerHand.cards[0];
    }

    /** Get the dealer's hole card — null if still hidden. */
    dealerHoleCard() {
        if (!this.dealerHand || this.dealerHand.cards.length < 2) return null;
        if (this.state === GameState.PLAYER_TURN || this.state === GameState.DEALING) return null;
        return this.dealerHand.cards[1];
    }

    newHand() {
        if (this.state !== GameState.RESOLUTION) return false;
        this.state = GameState.BETTING;
        this.result = null;
        this.playerHands = [];
        this.dealerHand = null;
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GameState };
}
