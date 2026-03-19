/**
 * Entry point — wires up events between Game, Strategy, Counting, and UI.
 */

(function () {
    const shoe = new Shoe();
    const game = new Game(shoe);
    const tracker = new AccuracyTracker();
    const counter = new CardCounter(shoe.numDecks);
    const drill = new DrillMode();

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

        // Count all player hands (supports split)
        for (const hand of game.playerHands) {
            for (const card of hand.cards) {
                visible.push(card);
            }
        }

        if (game.dealerHand) {
            visible.push(game.dealerHand.cards[0]);
            if (game.state !== GameState.PLAYER_TURN && game.state !== GameState.DEALING && game.state !== GameState.INSURANCE) {
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

        // Track misplays for session summary
        if (!wasCorrect && !isClose) {
            const hand = game.playerHand;
            const upcard = game.dealerUpcard();
            const handStr = hand.cards.map(c => c.toString()).join(', ');
            const upcardStr = upcard.toString();
            tracker.recordMisplay(handStr, upcardStr, playerActionName, Strategy.ACTION_NAMES[currentOptimal], type);
        }

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

    /** Handle standing with split support (dealer animation) */
    async function handleStandOrAdvance() {
        if (game.playerHands.length > 1) {
            // Split: stand on current hand, check if more hands
            recordAction('S');
            const prevState = game.state;
            game.stand();
            countNewCards();
            computeOptimal();

            if (game.state === GameState.PLAYER_TURN) {
                // More hands to play
                feedbackShown = false;
                moveNumber = 0;
                UI.clearFeedback();
                updateAll();
                actionLocked = false;
            } else {
                // All hands done, dealer plays
                UI._hideSectionInstant(UI.elements.actionButtons);
                UI._animatingDealer = true;
                await UI.revealHoleCard(game);
                await UI.dealerHitsAnimated(game);
                UI._animatingDealer = false;
                updateAll();
                actionLocked = false;
                checkCountQuiz();
            }
        } else {
            // Single hand: normal stand
            recordAction('S');
            game.stand();

            UI._hideSectionInstant(UI.elements.actionButtons);

            countNewCards();
            computeOptimal();

            UI._animatingDealer = true;
            await UI.revealHoleCard(game);
            await UI.dealerHitsAnimated(game);
            UI._animatingDealer = false;

            updateAll();
            actionLocked = false;
            checkCountQuiz();
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
            const isInsurance = game.state === GameState.INSURANCE;

            countedCardCount = 0;
            countNewCards();
            UI.hideCount();

            feedbackShown = false;
            moveNumber = 0;
            UI.clearFeedback();
            UI.clearHint();
            UI.hideSessionSummary();

            // Temporarily hide result so it doesn't show during animation
            const savedState = game.state;
            const savedResult = game.result;
            if (isBlackjack) {
                game.state = GameState.DEALING;
                game.result = null;
            } else if (isInsurance) {
                game.state = GameState.DEALING;
            }

            UI.update(game);
            await UI.dealAnimated(game);

            // Restore state after animation
            game.state = savedState;
            game.result = savedResult;

            if (isBlackjack) {
                // Reveal dealer hole card for blackjack
                UI._animatingDealer = true;
                await UI.revealHoleCard(game);
                UI._animatingDealer = false;
            }

            computeOptimal();
            UI.update(game);
            actionLocked = false;
        });

        // Insurance accept
        document.getElementById('insurance-accept-btn').addEventListener('click', async () => {
            if (game.state !== GameState.INSURANCE || actionLocked) return;
            actionLocked = true;

            game.takeInsurance();
            UI.hideInsurancePrompt();

            if (game.state === GameState.RESOLUTION) {
                // Dealer had blackjack
                countNewCards();
                UI._animatingDealer = true;
                await UI.revealHoleCard(game);
                UI._animatingDealer = false;
                updateAll();
                actionLocked = false;
                checkCountQuiz();
            } else {
                computeOptimal();
                updateAll();
                actionLocked = false;
            }
        });

        // Insurance decline
        document.getElementById('insurance-decline-btn').addEventListener('click', async () => {
            if (game.state !== GameState.INSURANCE || actionLocked) return;
            actionLocked = true;

            game.declineInsurance();
            UI.hideInsurancePrompt();

            if (game.state === GameState.RESOLUTION) {
                // Dealer had blackjack
                countNewCards();
                UI._animatingDealer = true;
                await UI.revealHoleCard(game);
                UI._animatingDealer = false;
                updateAll();
                actionLocked = false;
                checkCountQuiz();
            } else {
                computeOptimal();
                updateAll();
                actionLocked = false;
            }
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

            if (game.playerHands.length > 1) {
                // Split hand: update the split display
                updateAll();

                if (game.state === GameState.PLAYER_TURN) {
                    feedbackShown = false;
                    computeOptimal();
                } else if (game.state === GameState.DEALER_TURN || game.state === GameState.RESOLUTION) {
                    // All hands resolved
                    checkCountQuiz();
                }
            } else {
                const newCard = game.playerHand.cards[game.playerHand.cards.length - 1];
                UI.addCardAnimated(UI.elements.playerCards, newCard, false);

                const score = game.playerHand.score();
                const soft = game.playerHand.isSoft() ? ' (soft)' : '';
                UI.elements.playerScore.textContent = score + soft;
                UI._triggerScoreBounce(UI.elements.playerScore.closest('.score'));

                // Disable double/split/surrender after hit
                if (UI.elements.doubleBtn) UI.elements.doubleBtn.disabled = true;
                if (UI.elements.splitBtn) UI.elements.splitBtn.disabled = true;
                if (UI.elements.surrenderBtn) UI.elements.surrenderBtn.disabled = true;

                feedbackShown = false;
                computeOptimal();

                if (game.state === GameState.RESOLUTION) {
                    UI.update(game);
                    checkCountQuiz();
                }
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

            if (game.playerHands.length > 1) {
                // Split hand double
                updateAll();
                if (game.state === GameState.PLAYER_TURN) {
                    feedbackShown = false;
                    moveNumber = 0;
                    UI.clearFeedback();
                    computeOptimal();
                    actionLocked = false;
                } else {
                    // All hands done
                    UI._hideSectionInstant(UI.elements.actionButtons);
                    UI._animatingDealer = true;
                    await UI.revealHoleCard(game);
                    await UI.dealerHitsAnimated(game);
                    UI._animatingDealer = false;
                    updateAll();
                    actionLocked = false;
                    checkCountQuiz();
                }
                return;
            }

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

        // Split
        document.getElementById('split-btn').addEventListener('click', () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            if (!game.playerHand.isPair()) return;
            recordAction('P');

            game.split();
            countNewCards();

            feedbackShown = false;
            moveNumber = 0;
            UI.clearFeedback();
            computeOptimal();
            updateAll();
        });

        // Surrender
        document.getElementById('surrender-btn').addEventListener('click', () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            if (game.playerHand.cards.length !== 2) return;
            recordAction('S'); // surrender isn't in basic strategy tables, treat as stand-like
            game.surrender();
            countNewCards();
            updateAll();
            checkCountQuiz();
        });

        // Stand
        document.getElementById('stand-btn').addEventListener('click', async () => {
            if (game.state !== GameState.PLAYER_TURN || actionLocked) return;
            actionLocked = true;
            await handleStandOrAdvance();
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

        // ── Drill Mode ──

        document.getElementById('drill-toggle-btn').addEventListener('click', () => {
            if (drill.active) return;
            drill.start();
            UI.showDrillMode();
            UI.renderDrillHand(drill);
            UI.updateDrillStats(drill);
            document.getElementById('drill-next-btn').style.display = 'none';
        });

        document.getElementById('drill-exit-btn').addEventListener('click', () => {
            drill.stop();
            UI.hideDrillMode();
            updateAll();
        });

        // Drill action buttons
        document.querySelectorAll('.drill-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!drill.active || !drill.currentHand) return;
                const actionCode = btn.dataset.action;
                const result = drill.answer(actionCode);
                if (result) {
                    UI.showDrillFeedback(result);
                    UI.updateDrillStats(drill);
                    document.getElementById('drill-next-btn').style.display = 'inline-block';
                }
            });
        });

        document.getElementById('drill-next-btn').addEventListener('click', () => {
            if (!drill.active) return;
            drill.generateHand();
            UI.renderDrillHand(drill);
            document.getElementById('drill-next-btn').style.display = 'none';
        });

        // ── Session Summary ──

        document.getElementById('summary-btn').addEventListener('click', () => {
            if (UI.elements.summarySection && UI.elements.summarySection.style.display === 'block') {
                UI.hideSessionSummary();
            } else {
                UI.showSessionSummary(tracker);
            }
        });
    });
})();
