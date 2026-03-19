/**
 * Entry point — wires up events between Game, Strategy, Counting, and UI.
 */

(function () {
    const shoe = new Shoe();
    const game = new Game(shoe);
    const tracker = new AccuracyTracker();
    const counter = new CardCounter(shoe.numDecks);

    let currentOptimal = null;
    let hintRevealed = false;
    let feedbackShown = false;
    let countedCardCount = 0;
    let actionLocked = false;
    let moveNumber = 0;

    // Count quiz tracking
    let handsSinceQuiz = 0;
    let nextQuizAt = randomBetween(5, 8);

    function randomBetween(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function countNewCards() {
        const visible = [];

        if (game.playerHand) {
            for (const card of game.playerHand.cards) {
                visible.push(card);
            }
        }

        if (game.dealerHand) {
            visible.push(game.dealerHand.cards[0]);
            if (game.state !== GameState.PLAYER_TURN && game.state !== GameState.DEALING) {
                if (game.dealerHand.cards.length >= 2) {
                    visible.push(game.dealerHand.cards[1]);
                }
            }
            for (let i = 2; i < game.dealerHand.cards.length; i++) {
                visible.push(game.dealerHand.cards[i]);
            }
        }

        while (countedCardCount < visible.length) {
            counter.addCard(visible[countedCardCount]);
            countedCardCount++;
        }
    }

    function computeOptimal() {
        if (game.state === GameState.PLAYER_TURN && game.playerHand && game.dealerUpcard()) {
            currentOptimal = Strategy.getOptimalAction(game.playerHand, game.dealerUpcard());
        } else {
            currentOptimal = null;
        }
        hintRevealed = false;
    }

    function recordAction(actionCode) {
        if (!currentOptimal || feedbackShown) return;
        moveNumber++;
        const type = Strategy.handType(game.playerHand);
        const breakdown = Strategy.getFrequencyBreakdown(game.playerHand);
        const playerActionName = Strategy.ACTION_NAMES[actionCode];
        const prefix = moveNumber > 1 ? 'Move ' + moveNumber + ': ' : '';

        // Check if it's a close call (player's action is valid 40%+ of the time)
        let isClose = false;
        if (breakdown && !((actionCode === currentOptimal))) {
            const match = breakdown.match(new RegExp(playerActionName + '\\s+(\\d+)%'));
            if (match && parseInt(match[1], 10) >= 40) {
                isClose = true;
            }
        }

        // Count close calls as correct for accuracy
        const wasCorrect = actionCode === currentOptimal;
        const countAsCorrect = wasCorrect || isClose;
        tracker.record(type, countAsCorrect);
        UI.showFeedback(wasCorrect, prefix + Strategy.ACTION_NAMES[currentOptimal], breakdown, playerActionName);
        UI.updateAccuracy(tracker);
        feedbackShown = true;
    }

    function updateAll() {
        UI.update(game);
        UI.updateAccuracy(tracker);
    }


    function checkCountQuiz() {
        handsSinceQuiz++;
        if (handsSinceQuiz >= nextQuizAt) {
            handsSinceQuiz = 0;
            nextQuizAt = randomBetween(5, 8);
            UI.showCountQuiz(counter);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        UI.init();
        updateAll();

        // Count display toggle
        document.getElementById('count-display').addEventListener('click', () => {
            if (UI.isCountRevealed()) {
                UI.hideCount();
            } else {
                UI.showCount(counter);
            }
        });

        // Bet buttons — additive
        document.querySelectorAll('.bet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (actionLocked) return;
                const amount = parseInt(btn.dataset.amount, 10);
                game.placeBet(amount);
                updateAll();
            });
        });

        // Clear bet
        document.getElementById('clear-bet-btn').addEventListener('click', () => {
            if (actionLocked) return;
            game.clearBet();
            updateAll();
        });

        // Reset bankroll
        document.getElementById('reset-bankroll-btn').addEventListener('click', () => {
            if (actionLocked) return;
            game.bankroll = 1000;
            game.clearBet();
            tracker.reset();
            updateAll();
        });

        // Deal
        document.getElementById('deal-btn').addEventListener('click', async () => {
            if (actionLocked) return;

            if (shoe.needsShuffle()) {
                counter.reset();
                handsSinceQuiz = 0;
            }

            if (game.bet <= 0) {
                game.placeBet(10);
            }

            if (game.bet <= 0) return;
            game.deal();
            if (game.state === GameState.BETTING) return;

            actionLocked = true;
            const isBlackjack = game.state === GameState.RESOLUTION;

            countedCardCount = 0;
            countNewCards();
            UI.hideCount();

            feedbackShown = false;
            moveNumber = 0;
            UI.clearFeedback();
            UI.clearHint();

            // Temporarily hide result so it doesn't show during animation
            const savedState = game.state;
            const savedResult = game.result;
            if (isBlackjack) {
                game.state = GameState.DEALING;
                game.result = null;
            }

            UI.update(game);
            await UI.dealAnimated(game);

            // Restore state after animation
            if (isBlackjack) {
                game.state = savedState;
                game.result = savedResult;

                // Reveal dealer hole card for blackjack
                UI._animatingDealer = true;
                await UI.revealHoleCard(game);
                UI._animatingDealer = false;
            }

            computeOptimal();
            UI.update(game);
            actionLocked = false;
        });

        // Coach button — show full contextual advice (toggleable)
        document.getElementById('hint-btn').addEventListener('click', () => {
            if (currentOptimal) {
                UI.showCoach(game, counter);
            }
        });

        // Hit
        document.getElementById('hit-btn').addEventListener('click', () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            recordAction('H');
            game.hit();
            countNewCards();

            const newCard = game.playerHand.cards[game.playerHand.cards.length - 1];
            UI.addCardAnimated(UI.elements.playerCards, newCard, false);

            const score = game.playerHand.score();
            const soft = game.playerHand.isSoft() ? ' (soft)' : '';
            UI.elements.playerScore.textContent = score + soft;
            UI._triggerScoreBounce(UI.elements.playerScore.closest('.score'));

            // Disable double/split after hit
            if (UI.elements.doubleBtn) UI.elements.doubleBtn.disabled = true;
            if (UI.elements.splitBtn) UI.elements.splitBtn.disabled = true;

            feedbackShown = false;
            computeOptimal();

            if (game.state === GameState.RESOLUTION) {
                UI.update(game);
                checkCountQuiz();
            }
        });

        // Double — double bet, one card, auto-stand
        document.getElementById('double-btn').addEventListener('click', async () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            if (game.playerHand.cards.length !== 2) return;
            actionLocked = true;
            recordAction('D');

            game.double();
            countNewCards();

            // Animate the one new card
            const newCard = game.playerHand.cards[game.playerHand.cards.length - 1];
            UI.addCardAnimated(UI.elements.playerCards, newCard, false);

            const score = game.playerHand.score();
            const soft = game.playerHand.isSoft() ? ' (soft)' : '';
            UI.elements.playerScore.textContent = score + soft;
            UI._triggerScoreBounce(UI.elements.playerScore.closest('.score'));

            if (game.state === GameState.RESOLUTION) {
                // Busted on double
                UI.update(game);
                actionLocked = false;
                checkCountQuiz();
                return;
            }

            // Dealer plays (auto-stand after double)
            UI._hideSectionInstant(UI.elements.actionButtons);
            computeOptimal();

            UI._animatingDealer = true;
            await UI.revealHoleCard(game);
            await UI.dealerHitsAnimated(game);
            UI._animatingDealer = false;

            UI.update(game);
            actionLocked = false;
            checkCountQuiz();
        });

        // Stand
        document.getElementById('stand-btn').addEventListener('click', async () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            actionLocked = true;
            recordAction('S');
            game.stand();

            UI._hideSectionInstant(UI.elements.actionButtons);

            countNewCards();
            computeOptimal();

            UI._animatingDealer = true;
            await UI.revealHoleCard(game);
            await UI.dealerHitsAnimated(game);
            UI._animatingDealer = false;

            UI.update(game);
            actionLocked = false;
            checkCountQuiz();
        });

        // New hand
        document.getElementById('new-hand-btn').addEventListener('click', () => {
            if (actionLocked) return;
            // Dismiss count quiz if showing
            UI.dismissCountQuiz();
            game.newHand();
            currentOptimal = null;
            feedbackShown = false;
            countedCardCount = 0;
            updateAll();
        });

        // Count quiz submit
        document.getElementById('count-quiz-submit').addEventListener('click', () => {
            UI.checkCountQuizAnswer(counter);
        });

        document.getElementById('count-quiz-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                UI.checkCountQuizAnswer(counter);
            }
        });

        document.getElementById('count-quiz-dismiss').addEventListener('click', () => {
            UI.dismissCountQuiz();
        });
    });
})();
