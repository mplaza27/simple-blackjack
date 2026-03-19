/**
 * Game flow state machine for blackjack.
 * States: BETTING → DEALING → INSURANCE → PLAYER_TURN → DEALER_TURN → RESOLUTION
 */

// Import dependencies when running in Node/Vitest (browser uses globals via <script> tags)
if (typeof require !== 'undefined' && typeof Shoe === 'undefined') {
    globalThis.Shoe = require('./card.js').Shoe;
    globalThis.Hand = require('./hand.js').Hand;
}

const GameState = {
    BETTING: 'BETTING',
    DEALING: 'DEALING',
    INSURANCE: 'INSURANCE',
    PLAYER_TURN: 'PLAYER_TURN',
    DEALER_TURN: 'DEALER_TURN',
    RESOLUTION: 'RESOLUTION',
};

class Game {
    constructor(shoe) {
        this.shoe = shoe || new Shoe();
        this.state = GameState.BETTING;
        this.playerHands = []; // array of Hand objects (supports split)
        this.activeHandIndex = 0;
        this.dealerHand = null;
        this.bet = 0;
        this.bets = []; // per-hand bets for split
        this.bankroll = 1000;
        this.result = null; // set during RESOLUTION
        this.results = []; // per-hand results for split
        this.insuranceBet = 0;
        this.insuranceResult = null; // 'win' or 'lose' or null
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
        this.results = [];
        this.insuranceBet = 0;
        this.insuranceResult = null;

        this.playerHands = [new Hand()];
        this.activeHandIndex = 0;
        this.bets = [this.bet];
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
                this.results = ['push'];
            } else if (playerBJ) {
                this.result = 'blackjack';
                this.results = ['blackjack'];
                this.bankroll += Math.floor(this.bet * 1.5);
            } else {
                this.result = 'dealer_blackjack';
                this.results = ['dealer_blackjack'];
                this.bankroll -= this.bet;
            }
            return true;
        }

        // Check if dealer shows Ace — offer insurance
        const upcard = this.dealerUpcard();
        if (upcard && upcard.rank === 'A') {
            this.state = GameState.INSURANCE;
            return true;
        }

        this.state = GameState.PLAYER_TURN;
        return true;
    }

    takeInsurance() {
        if (this.state !== GameState.INSURANCE) return false;
        this.insuranceBet = Math.floor(this.bet / 2);

        // Check if dealer has blackjack
        if (this.dealerHand.isBlackjack()) {
            // Insurance pays 2:1
            this.bankroll += this.insuranceBet; // win 2:1 on side bet = bet (net: side bet back + winnings)
            this.insuranceResult = 'win';
            // But player loses main bet (unless player also has BJ, checked earlier)
            this.state = GameState.RESOLUTION;
            this.result = 'dealer_blackjack';
            this.results = ['dealer_blackjack'];
            this.bankroll -= this.bet;
            return true;
        }

        // Insurance lost
        this.bankroll -= this.insuranceBet;
        this.insuranceResult = 'lose';
        this.state = GameState.PLAYER_TURN;
        return true;
    }

    declineInsurance() {
        if (this.state !== GameState.INSURANCE) return false;

        // Check if dealer has blackjack anyway
        if (this.dealerHand.isBlackjack()) {
            this.state = GameState.RESOLUTION;
            this.result = 'dealer_blackjack';
            this.results = ['dealer_blackjack'];
            this.bankroll -= this.bet;
            return true;
        }

        this.state = GameState.PLAYER_TURN;
        return true;
    }

    hit() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        this.playerHand.addCard(this.shoe.deal());

        if (this.playerHand.isBust()) {
            this._resolveCurrentHand('player_bust');
            // Check if there are more split hands to play
            if (!this._advanceToNextHand()) {
                this._finishResolution();
            }
        }

        return true;
    }

    double() {
        if (this.state !== GameState.PLAYER_TURN) return false;
        if (this.playerHand.cards.length !== 2) return false;
        if (this.bankroll < this.bet * 2) return false;

        // Double the bet for this hand
        this.bets[this.activeHandIndex] *= 2;
        // Update main bet reference if single hand
        if (this.playerHands.length === 1) {
            this.bet = this.bets[0];
        }
        this.playerHand.addCard(this.shoe.deal());

        if (this.playerHand.isBust()) {
            this._resolveCurrentHand('player_bust');
            if (!this._advanceToNextHand()) {
                this._finishResolution();
            }
            return true;
        }

        // Auto-stand after double
        this._resolveCurrentHand(null); // mark as needing dealer play
        if (!this._advanceToNextHand()) {
            this._finishResolution();
        }
        return true;
    }

    split() {
        if (this.state !== GameState.PLAYER_TURN) return false;
        if (!this.playerHand.isPair()) return false;
        if (this.playerHands.length >= 3) return false; // max 3 hands
        if (this.bankroll < this.bet + this._totalBets()) return false;

        const hand = this.playerHand;
        const card1 = hand.cards[0];
        const card2 = hand.cards[1];
        const isAces = card1.rank === 'A';

        // Create two new hands from the pair
        const hand1 = new Hand();
        hand1.addCard(card1);
        hand1.addCard(this.shoe.deal());

        const hand2 = new Hand();
        hand2.addCard(card2);
        hand2.addCard(this.shoe.deal());

        // Replace current hand with the two new hands
        this.playerHands.splice(this.activeHandIndex, 1, hand1, hand2);
        // Add bet for the new hand
        this.bets.splice(this.activeHandIndex, 1, this.bet, this.bet);
        // Add placeholder results
        this.results.splice(this.activeHandIndex, 1, null, null);

        // Split aces: one card each, auto-stand
        if (isAces) {
            // Both hands auto-stand
            this._resolveCurrentHand(null); // needs dealer play
            this.activeHandIndex++;
            this._resolveCurrentHand(null); // needs dealer play
            this._finishResolution();
            return true;
        }

        // Set active hand to first split hand
        this.activeHandIndex = this.activeHandIndex; // stays at current

        return true;
    }

    /** Advance to the next split hand. Returns true if there is one. */
    _advanceToNextHand() {
        for (let i = this.activeHandIndex + 1; i < this.playerHands.length; i++) {
            if (this.results[i] === undefined || this.results[i] === null) {
                this.activeHandIndex = i;
                return true;
            }
        }
        return false;
    }

    /** Mark current hand result (for split tracking). Null means needs dealer play. */
    _resolveCurrentHand(result) {
        while (this.results.length <= this.activeHandIndex) {
            this.results.push(null);
        }
        if (result === 'player_bust') {
            this.results[this.activeHandIndex] = 'player_bust';
            this.bankroll -= this.bets[this.activeHandIndex];
        } else {
            // null = needs dealer play resolution later
            this.results[this.activeHandIndex] = null;
        }
    }

    /** Total bets across all hands */
    _totalBets() {
        return this.bets.reduce((sum, b) => sum + b, 0);
    }

    stand() {
        if (this.state !== GameState.PLAYER_TURN) return false;

        if (this.playerHands.length > 1) {
            // Split hand: mark as needing dealer play, advance
            this._resolveCurrentHand(null);
            if (!this._advanceToNextHand()) {
                this._finishResolution();
            }
            return true;
        }

        this.state = GameState.DEALER_TURN;
        this._dealerPlay();
        this._resolve();
        return true;
    }

    /** Finish all hands (dealer plays, resolve each non-busted hand) */
    _finishResolution() {
        this.state = GameState.DEALER_TURN;

        // Only play dealer if at least one hand isn't busted
        const hasLiveHand = this.results.some(r => r === null);
        if (hasLiveHand) {
            this._dealerPlay();
        }

        // Resolve each hand
        const dealerScore = this.dealerHand.score();
        const dealerBust = this.dealerHand.isBust();

        for (let i = 0; i < this.playerHands.length; i++) {
            if (this.results[i] === 'player_bust') continue; // already resolved

            const playerScore = this.playerHands[i].score();
            let result;

            if (dealerBust) {
                result = 'dealer_bust';
                this.bankroll += this.bets[i];
            } else if (playerScore > dealerScore) {
                result = 'win';
                this.bankroll += this.bets[i];
            } else if (playerScore < dealerScore) {
                result = 'lose';
                this.bankroll -= this.bets[i];
            } else {
                result = 'push';
            }
            this.results[i] = result;
        }

        // Set overall result (for backward compat with single-hand display)
        this.state = GameState.RESOLUTION;
        if (this.results.length === 1) {
            this.result = this.results[0];
        } else {
            // Summarize split results
            const wins = this.results.filter(r => ['win', 'dealer_bust', 'blackjack'].includes(r)).length;
            const losses = this.results.filter(r => ['lose', 'player_bust', 'dealer_blackjack'].includes(r)).length;
            if (wins > 0 && losses === 0) this.result = 'win';
            else if (losses > 0 && wins === 0) this.result = 'lose';
            else if (wins > 0 && losses > 0) this.result = 'push'; // mixed
            else this.result = 'push';
        }
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
            this.results = ['dealer_bust'];
            this.bankroll += this.bet;
        } else if (playerScore > dealerScore) {
            this.result = 'win';
            this.results = ['win'];
            this.bankroll += this.bet;
        } else if (playerScore < dealerScore) {
            this.result = 'lose';
            this.results = ['lose'];
            this.bankroll -= this.bet;
        } else {
            this.result = 'push';
            this.results = ['push'];
            // push: no bankroll change
        }
    }

    surrender() {
        if (this.state !== GameState.PLAYER_TURN) return false;
        if (this.playerHand.cards.length !== 2) return false; // late surrender, first action only

        this.state = GameState.RESOLUTION;
        this.result = 'surrender';
        this.results = ['surrender'];
        this.bankroll -= Math.floor(this.bet / 2);
        return true;
    }

    /** Get the dealer's visible card (upcard) — the first card dealt. */
    dealerUpcard() {
        if (!this.dealerHand || this.dealerHand.cards.length === 0) return null;
        return this.dealerHand.cards[0];
    }

    /** Get the dealer's hole card — null if still hidden. */
    dealerHoleCard() {
        if (!this.dealerHand || this.dealerHand.cards.length < 2) return null;
        if (this.state === GameState.PLAYER_TURN || this.state === GameState.DEALING || this.state === GameState.INSURANCE) return null;
        return this.dealerHand.cards[1];
    }

    newHand() {
        if (this.state !== GameState.RESOLUTION) return false;
        this.state = GameState.BETTING;
        this.result = null;
        this.results = [];
        this.playerHands = [];
        this.dealerHand = null;
        this.insuranceBet = 0;
        this.insuranceResult = null;
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GameState };
}
