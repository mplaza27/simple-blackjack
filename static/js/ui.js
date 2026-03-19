/**
 * DOM rendering for the blackjack table.
 * Reads game state and updates the DOM. No game logic here.
 * Handles animations for dealing, hitting, and state transitions.
 */

const UI = {
    elements: {},
    _countRevealed: false,
    _lastBankroll: null,
    _lastPlayerScore: null,
    _lastDealerScore: null,
    _dealing: false,

    init() {
        this.elements = {
            bankroll: document.getElementById('bankroll'),
            bankrollContainer: document.querySelector('.chips'),
            betDisplay: document.getElementById('bet-display'),
            betButtons: document.querySelectorAll('.bet-btn'),
            dealBtn: document.getElementById('deal-btn'),
            hitBtn: document.getElementById('hit-btn'),
            standBtn: document.getElementById('stand-btn'),
            doubleBtn: document.getElementById('double-btn'),
            splitBtn: document.getElementById('split-btn'),
            surrenderBtn: document.getElementById('surrender-btn'),
            dealerCards: document.getElementById('dealer-cards'),
            dealerScore: document.getElementById('dealer-score'),
            playerCards: document.getElementById('player-cards'),
            playerScore: document.getElementById('player-score'),
            message: document.getElementById('message'),
            newHandBtn: document.getElementById('new-hand-btn'),
            actionButtons: document.getElementById('action-buttons'),
            bettingControls: document.getElementById('betting-controls'),
            shuffleIndicator: document.getElementById('shuffle-indicator'),
            strategyArea: document.getElementById('strategy-area'),
            hintBtn: document.getElementById('hint-btn'),
            hintText: document.getElementById('hint-text'),
            feedbackText: document.getElementById('feedback-text'),
            explanationText: document.getElementById('explanation-text'),
            accuracyOverall: document.getElementById('accuracy-overall'),
            countDisplay: document.getElementById('count-display'),
            countValue: document.getElementById('count-value'),
            insurancePrompt: document.getElementById('insurance-prompt'),
            drillSection: document.getElementById('drill-section'),
            drillDealerCards: document.getElementById('drill-dealer-cards'),
            drillPlayerCards: document.getElementById('drill-player-cards'),
            drillPlayerScore: document.getElementById('drill-player-score'),
            drillFeedback: document.getElementById('drill-feedback'),
            drillStats: document.getElementById('drill-stats'),
            drillWeakSpots: document.getElementById('drill-weak-spots'),
            summarySection: document.getElementById('session-summary'),
        };
        this._countRevealed = false;
        this._lastBankroll = null;
        this._lastPlayerScore = null;
        this._lastDealerScore = null;
        this._dealing = false;
    },

    // ── Card rendering ──

    renderCard(card, faceDown) {
        const div = document.createElement('div');
        div.className = 'card' + (faceDown ? ' face-down' : '');

        if (faceDown) {
            div.innerHTML = '<div class="card-back"></div>';
        } else {
            const color = card.color();
            div.classList.add(color);
            div.innerHTML = `
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${card.suit}</span>
            `;
        }
        return div;
    },

    /** Render a full hand instantly (no animation). Used for non-animated updates. */
    renderHandStatic(container, hand, hideHole) {
        container.innerHTML = '';
        hand.cards.forEach((card, i) => {
            const faceDown = hideHole && i === 1;
            const el = this.renderCard(card, faceDown);
            el.classList.add('card-visible');
            container.appendChild(el);
        });
    },

    /** Render multiple split hands side-by-side in the player area. */
    renderSplitHands(game) {
        const container = this.elements.playerCards;
        container.innerHTML = '';
        container.classList.add('split-layout');

        for (let i = 0; i < game.playerHands.length; i++) {
            const handDiv = document.createElement('div');
            handDiv.className = 'split-hand';
            if (i === game.activeHandIndex && game.state === GameState.PLAYER_TURN) {
                handDiv.classList.add('active-hand');
            }

            const hand = game.playerHands[i];
            for (const card of hand.cards) {
                const el = this.renderCard(card, false);
                el.classList.add('card-visible');
                handDiv.appendChild(el);
            }

            // Score label per hand
            const scoreLabel = document.createElement('div');
            scoreLabel.className = 'split-score';
            const score = hand.score();
            const soft = hand.isSoft() ? ' (soft)' : '';
            let resultStr = '';
            if (game.state === GameState.RESOLUTION && game.results[i]) {
                resultStr = ' - ' + this.resultMessage(game.results[i]);
            }
            scoreLabel.textContent = score + soft + resultStr;
            handDiv.appendChild(scoreLabel);

            container.appendChild(handDiv);
        }
    },

    /** Deal initial 4 cards with staggered animation. Returns a promise. */
    dealAnimated(game) {
        this._dealing = true;
        const playerContainer = this.elements.playerCards;
        const dealerContainer = this.elements.dealerCards;
        playerContainer.innerHTML = '';
        playerContainer.classList.remove('split-layout');
        dealerContainer.innerHTML = '';

        // Deal order: player, dealer, player, dealer(face-down)
        const sequence = [
            { card: game.playerHand.cards[0], container: playerContainer, faceDown: false },
            { card: game.dealerHand.cards[0], container: dealerContainer, faceDown: false },
            { card: game.playerHand.cards[1], container: playerContainer, faceDown: false },
            { card: game.dealerHand.cards[1], container: dealerContainer, faceDown: true },
        ];

        const DEAL_INTERVAL = 200; // ms between each card

        return new Promise((resolve) => {
            sequence.forEach((step, i) => {
                setTimeout(() => {
                    const el = this.renderCard(step.card, step.faceDown);
                    el.classList.add('card-dealing');
                    step.container.appendChild(el);

                    // Update scores progressively
                    if (step.container === playerContainer) {
                        const visibleCards = game.playerHand.cards.slice(0, playerContainer.children.length);
                        let score = 0;
                        for (const c of visibleCards) score += c.value;
                        // Adjust aces
                        let aces = visibleCards.filter(c => c.isAce()).length;
                        while (score > 21 && aces > 0) { score -= 10; aces--; }
                        this.elements.playerScore.textContent = score;
                        this._triggerScoreBounce(this.elements.playerScore.closest('.score'));
                    } else if (step.container === dealerContainer && !step.faceDown) {
                        this.elements.dealerScore.textContent = step.card.value;
                        this._triggerScoreBounce(this.elements.dealerScore.closest('.score'));
                    }

                    if (i === sequence.length - 1) {
                        // Last card dealt — wait for animation to finish
                        setTimeout(() => {
                            this._dealing = false;
                            resolve();
                        }, 400);
                    }
                }, i * DEAL_INTERVAL);
            });
        });
    },

    /** Animate a single new card being added (hit). */
    addCardAnimated(container, card, faceDown) {
        const el = this.renderCard(card, faceDown);
        el.classList.add('card-hit');
        container.appendChild(el);
    },

    /** Animate the dealer's hole card reveal (flip). */
    revealHoleCard(game) {
        const dealerContainer = this.elements.dealerCards;
        const holeEl = dealerContainer.children[1];
        if (!holeEl) return Promise.resolve();

        return new Promise((resolve) => {
            holeEl.classList.add('card-flipping');

            setTimeout(() => {
                // Replace with face-up card at midpoint of flip
                const card = game.dealerHand.cards[1];
                const color = card.color();
                holeEl.className = 'card card-visible card-flipping ' + color;
                holeEl.innerHTML = `
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit">${card.suit}</span>
                `;
            }, 250);

            setTimeout(() => {
                holeEl.classList.remove('card-flipping');
                resolve();
            }, 500);
        });
    },

    /** Animate dealer hit cards appearing one by one. */
    dealerHitsAnimated(game) {
        const dealerContainer = this.elements.dealerCards;
        const existingCount = dealerContainer.children.length;
        const totalCards = game.dealerHand.cards.length;

        if (totalCards <= existingCount) return Promise.resolve();

        const HIT_INTERVAL = 350;

        return new Promise((resolve) => {
            let added = 0;
            for (let i = existingCount; i < totalCards; i++) {
                setTimeout(() => {
                    this.addCardAnimated(dealerContainer, game.dealerHand.cards[i], false);
                    // Update dealer score
                    this.elements.dealerScore.textContent = game.dealerHand.score();
                    this._triggerScoreBounce(this.elements.dealerScore.closest('.score'));
                    added++;
                    if (i === totalCards - 1) {
                        setTimeout(resolve, 350);
                    }
                }, (i - existingCount) * HIT_INTERVAL);
            }
        });
    },

    // ── Section visibility with transitions ──

    _showSection(el, displayValue) {
        if (!el) return;
        displayValue = displayValue || 'flex';
        el.style.display = displayValue;
        el.classList.remove('fade-out');
        el.classList.add('fade-in');
    },

    _hideSection(el) {
        if (!el || el.style.display === 'none') return;
        el.classList.remove('fade-in');
        el.classList.add('fade-out');
        const handler = () => {
            el.style.display = 'none';
            el.classList.remove('fade-out');
            el.removeEventListener('animationend', handler);
        };
        el.addEventListener('animationend', handler);
    },

    _hideSectionInstant(el) {
        if (!el) return;
        el.style.display = 'none';
        el.classList.remove('fade-in', 'fade-out');
    },

    // ── Score bounce ──

    _triggerScoreBounce(scoreEl) {
        if (!scoreEl) return;
        scoreEl.classList.remove('score-updated');
        // Force reflow to restart animation
        void scoreEl.offsetWidth;
        scoreEl.classList.add('score-updated');
    },

    // ── Bankroll flash ──

    _flashBankroll(oldVal, newVal) {
        if (oldVal === null || oldVal === newVal) return;
        const container = this.elements.bankrollContainer;
        if (!container) return;
        container.classList.remove('bankroll-up', 'bankroll-down');
        void container.offsetWidth;
        container.classList.add(newVal > oldVal ? 'bankroll-up' : 'bankroll-down');
    },

    // ── Bet chip selection (no-op kept for compat) ──

    selectBetChip() {},

    // ── Insurance prompt ──

    showInsurancePrompt() {
        if (this.elements.insurancePrompt) {
            this._showSection(this.elements.insurancePrompt, 'block');
        }
    },

    hideInsurancePrompt() {
        if (this.elements.insurancePrompt) {
            this._hideSectionInstant(this.elements.insurancePrompt);
        }
    },

    // ── Main update ──

    update(game) {
        // Bankroll
        const newBankroll = game.bankroll;
        this._flashBankroll(this._lastBankroll, newBankroll);
        this._lastBankroll = newBankroll;
        this.elements.bankroll.textContent = newBankroll;
        this.elements.betDisplay.textContent = game.bet || '\u2014';

        // Show/hide controls based on state
        const isBetting = game.state === GameState.BETTING;
        const isPlayerTurn = game.state === GameState.PLAYER_TURN;
        const isResolution = game.state === GameState.RESOLUTION;
        const isInsurance = game.state === GameState.INSURANCE;

        // Betting controls
        if (isBetting) {
            this._showSection(this.elements.bettingControls, 'block');
        } else {
            this._hideSectionInstant(this.elements.bettingControls);
        }

        // Insurance prompt
        if (isInsurance) {
            this.showInsurancePrompt();
        } else {
            this.hideInsurancePrompt();
        }

        // Action buttons
        if (isPlayerTurn && !this._dealing) {
            this._showSection(this.elements.actionButtons);
            // Enable/disable double: only on first 2 cards with enough bankroll
            if (this.elements.doubleBtn) {
                const canDouble = game.playerHand &&
                    game.playerHand.cards.length === 2 &&
                    game.bankroll >= game.bet * 2;
                this.elements.doubleBtn.disabled = !canDouble;
            }
            // Enable/disable split: matching rank pair, max 3 hands, enough bankroll
            if (this.elements.splitBtn) {
                const canSplit = game.playerHand &&
                    game.playerHand.isPair() &&
                    game.playerHands.length < 3 &&
                    game.bankroll >= game.bet + game.bets.reduce((s, b) => s + b, 0);
                this.elements.splitBtn.disabled = !canSplit;
            }
            // Enable/disable surrender: only on first 2 cards of first hand, no splits
            if (this.elements.surrenderBtn) {
                const canSurrender = game.playerHand &&
                    game.playerHand.cards.length === 2 &&
                    game.playerHands.length === 1;
                this.elements.surrenderBtn.disabled = !canSurrender;
            }
        } else {
            this._hideSectionInstant(this.elements.actionButtons);
        }

        // New hand button
        if (isResolution) {
            this._showSection(this.elements.newHandBtn, 'inline-block');
        } else {
            this._hideSectionInstant(this.elements.newHandBtn);
        }

        // Strategy area
        if (this.elements.strategyArea) {
            if (isPlayerTurn || isResolution) {
                this.elements.strategyArea.style.display = '';
            } else {
                this.elements.strategyArea.style.display = 'none';
            }
            if (isBetting) {
                this.clearHint();
                this.clearFeedback();
            }
            if (this.elements.hintBtn) {
                this.elements.hintBtn.style.display = isPlayerTurn ? '' : 'none';
            }
        }

        // Render cards (only if not mid-deal animation)
        if (!this._dealing) {
            if (game.dealerHand) {
                const hideHole = game.state === GameState.PLAYER_TURN || game.state === GameState.DEALING || game.state === GameState.INSURANCE;

                // Only re-render if not animating (avoid clobbering animated cards)
                if (!this._animatingDealer) {
                    this.renderHandStatic(this.elements.dealerCards, game.dealerHand, hideHole);
                }

                if (hideHole) {
                    const upcard = game.dealerUpcard();
                    this.elements.dealerScore.textContent = upcard ? upcard.value : '';
                } else {
                    this.elements.dealerScore.textContent = game.dealerHand.score();
                }
            } else {
                this.elements.dealerCards.innerHTML = '';
                this.elements.dealerScore.textContent = '';
            }

            if (game.playerHands.length > 1) {
                // Split hands: render side-by-side
                this.renderSplitHands(game);
                // Show combined score or per-hand scores
                this.elements.playerScore.textContent = '';
            } else if (game.playerHand) {
                this.elements.playerCards.classList.remove('split-layout');
                this.renderHandStatic(this.elements.playerCards, game.playerHand, false);
                const score = game.playerHand.score();
                const soft = game.playerHand.isSoft() ? ' (soft)' : '';
                this.elements.playerScore.textContent = score + soft;
            } else {
                this.elements.playerCards.innerHTML = '';
                this.elements.playerCards.classList.remove('split-layout');
                this.elements.playerScore.textContent = '';
            }
        }

        // Result message
        if (isResolution && game.result) {
            let msg = this.resultMessage(game.result);
            if (game.insuranceResult) {
                msg += game.insuranceResult === 'win' ? ' (Insurance paid)' : ' (Insurance lost)';
            }
            if (game.playerHands.length > 1) {
                // Show per-hand results
                const parts = game.results.map((r, i) => 'Hand ' + (i + 1) + ': ' + this.resultMessage(r));
                msg = parts.join(' | ');
            }
            this.elements.message.textContent = msg;
            this.elements.message.className = 'message show ' + this.resultClass(game.result);
        } else {
            this.elements.message.textContent = '';
            this.elements.message.className = 'message';
        }
    },

    resultMessage(result) {
        const messages = {
            blackjack: 'Blackjack! You win!',
            win: 'You win!',
            lose: 'Dealer wins.',
            push: 'Push \u2014 bet returned.',
            player_bust: 'Bust! You lose.',
            dealer_bust: 'Dealer busts! You win!',
            dealer_blackjack: 'Dealer has blackjack.',
            surrender: 'Surrendered \u2014 half bet returned.',
        };
        return messages[result] || result;
    },

    resultClass(result) {
        if (['blackjack', 'win', 'dealer_bust'].includes(result)) return 'win';
        if (['lose', 'player_bust', 'dealer_blackjack'].includes(result)) return 'lose';
        if (result === 'surrender') return 'push';
        return 'push';
    },

    showHint(optimalAction) {
        if (this.elements.hintText) {
            this.elements.hintText.textContent = optimalAction;
            this.elements.hintText.style.display = '';
        }
    },

    clearHint() {
        if (this.elements.hintText) {
            this.elements.hintText.textContent = '';
            this.elements.hintText.style.display = 'none';
        }
        this.hideCoach();
    },

    showCoach(game, counter) {
        if (!game.playerHand || !game.dealerUpcard()) return;
        this.hideCoach();

        const hand = game.playerHand;
        const upcard = game.dealerUpcard();
        const type = Strategy.handType(hand);
        const total = hand.score();
        const dk = Strategy.dealerKey(upcard);
        const dealerLabel = dk === 'A' ? 'Ace' : dk;
        const action = Strategy.getOptimalAction(hand, upcard);
        const actionName = Strategy.ACTION_NAMES[action];
        const breakdown = Strategy.getFrequencyBreakdown(hand);

        let handLabel;
        if (type === 'pair') {
            handLabel = hand.cards[0].rank + '-' + hand.cards[1].rank;
        } else if (type === 'soft') {
            handLabel = 'Soft ' + total;
        } else {
            handLabel = 'Hard ' + total;
        }

        // Available actions
        const canDouble = hand.cards.length === 2 && game.bankroll >= game.bet * 2;
        const isFirstAction = hand.cards.length === 2;
        let options = ['Hit', 'Stand'];
        if (canDouble) options.push('Double');

        let html = '';
        html += '<div class="coach-action">' + actionName + '</div>';
        html += '<div class="coach-rule">' + handLabel + ' vs ' + dealerLabel + '</div>';
        html += '<div class="coach-rule">' + breakdown + '</div>';

        // EV display
        const evs = Strategy.getApproxEV(hand, upcard);
        if (evs && Object.keys(evs).length > 0) {
            const evParts = Object.entries(evs).map(([code, ev]) => {
                const name = Strategy.ACTION_NAMES[code] || code;
                const sign = ev >= 0 ? '+' : '';
                return name + ': ' + sign + ev.toFixed(2);
            });
            html += '<div class="coach-rule coach-ev">' + evParts.join(' | ') + '</div>';
        }

        // Situation context
        let situation = [];
        if (!isFirstAction) situation.push('After hit');
        if (canDouble) situation.push('Double available');
        else if (isFirstAction) situation.push('Can\'t double (bankroll)');
        if (action === 'D' && !canDouble) {
            html += '<div class="coach-rule">Can\'t double \u2014 hit instead</div>';
        }
        if (situation.length) {
            html += '<div class="coach-rule">' + situation.join(' \u00b7 ') + '</div>';
        }

        // Count info
        if (counter) {
            const rc = counter.runningCount;
            const tc = counter.trueCount();
            const rcStr = (rc >= 0 ? '+' : '') + rc;
            const tcStr = (tc >= 0 ? '+' : '') + tc;
            html += '<div class="coach-rule">RC: ' + rcStr + '  TC: ' + tcStr + '</div>';

            const dev = Strategy.getDeviation(hand, upcard, tc);
            if (dev) {
                html += '<div class="coach-deviation">' + dev.desc + '</div>';
            }
        }

        const panel = document.createElement('div');
        panel.className = 'coach-panel coach-popup';
        panel.innerHTML = html;

        // Insert into table, positioned absolutely
        const table = document.getElementById('table');
        table.style.position = 'relative';
        table.appendChild(panel);

        // Close on any click outside the panel
        const closeHandler = (e) => {
            if (!panel.contains(e.target) && e.target !== panel) {
                this.hideCoach();
                document.removeEventListener('click', closeHandler, true);
            }
        };
        // Also close on panel click
        panel.addEventListener('click', () => {
            this.hideCoach();
            document.removeEventListener('click', closeHandler, true);
        });
        // Delay adding outside-click so the coach button click doesn't immediately close it
        setTimeout(() => {
            document.addEventListener('click', closeHandler, true);
        }, 0);
    },

    hideCoach() {
        const existing = document.querySelector('.coach-popup');
        if (existing) existing.remove();
    },

    showFeedback(wasCorrect, optimalAction, breakdown, playerAction) {
        if (this.elements.feedbackText) {
            if (wasCorrect) {
                this.elements.feedbackText.textContent = optimalAction + ' \u2014 correct';
                this.elements.feedbackText.className = 'feedback-text correct show';
            } else {
                // Check if it's a close call from the breakdown
                let isClose = false;
                if (breakdown && playerAction) {
                    const match = breakdown.match(new RegExp(playerAction + '\\s+(\\d+)%'));
                    if (match && parseInt(match[1], 10) >= 40) {
                        isClose = true;
                    }
                }
                if (isClose) {
                    this.elements.feedbackText.textContent = 'Either works \u2014 ' + optimalAction + ' is slightly better';
                    this.elements.feedbackText.className = 'feedback-text close show';
                } else {
                    this.elements.feedbackText.textContent = 'Optimal: ' + optimalAction;
                    this.elements.feedbackText.className = 'feedback-text incorrect show';
                }
            }
        }
        if (breakdown && this.elements.explanationText) {
            this.elements.explanationText.textContent = breakdown;
            this.elements.explanationText.className = 'explanation-text show';
        }
    },

    clearFeedback() {
        if (this.elements.feedbackText) {
            this.elements.feedbackText.textContent = '';
            this.elements.feedbackText.className = 'feedback-text';
        }
        this.clearExplanation();
    },

    showExplanation(text) {
        if (this.elements.explanationText && text) {
            this.elements.explanationText.textContent = text;
            this.elements.explanationText.className = 'explanation-text show';
        }
    },

    clearExplanation() {
        if (this.elements.explanationText) {
            this.elements.explanationText.textContent = '';
            this.elements.explanationText.className = 'explanation-text';
        }
    },

    showCount(counter) {
        if (!this.elements.countValue || !counter) return;
        const rc = counter.runningCount >= 0 ? '+' + counter.runningCount : String(counter.runningCount);
        const tc = counter.trueCount() >= 0 ? '+' + counter.trueCount() : String(counter.trueCount());
        this.elements.countValue.textContent = `${rc} (TC: ${tc})`;
        this.elements.countValue.className = 'count-revealed';
        this._countRevealed = true;
    },

    hideCount() {
        if (!this.elements.countValue) return;
        this.elements.countValue.textContent = '???';
        this.elements.countValue.className = 'count-hidden';
        this._countRevealed = false;
    },

    isCountRevealed() {
        return this._countRevealed;
    },

    // ── Count quiz ──

    showCountQuiz(counter) {
        const quiz = document.getElementById('count-quiz');
        const input = document.getElementById('count-quiz-input');
        const result = document.getElementById('count-quiz-result');
        if (!quiz) return;
        quiz.style.display = '';
        quiz.classList.add('fade-in');
        input.value = '';
        result.textContent = '';
        result.className = 'quiz-result';
        input.focus();
    },

    checkCountQuizAnswer(counter) {
        const input = document.getElementById('count-quiz-input');
        const result = document.getElementById('count-quiz-result');
        if (!input || !result) return;

        const guess = parseInt(input.value, 10);
        if (isNaN(guess)) return;

        const actual = counter.runningCount;
        if (guess === actual) {
            result.textContent = 'Correct';
            result.className = 'quiz-result quiz-correct';
        } else {
            result.textContent = `Count is ${actual >= 0 ? '+' : ''}${actual}`;
            result.className = 'quiz-result quiz-wrong';
        }
    },

    dismissCountQuiz() {
        const quiz = document.getElementById('count-quiz');
        if (quiz) {
            quiz.style.display = 'none';
            quiz.classList.remove('fade-in');
        }
    },

    updateAccuracy(tracker) {
        if (!tracker || !this.elements.accuracyOverall) return;
        this.elements.accuracyOverall.textContent = tracker.overall.total > 0 ? tracker.overallPct() + '%' : '\u2014';
    },

    // ── Drill mode ──

    showDrillMode() {
        // Hide game elements
        const gameEls = ['dealer-area', 'player-area', 'message', 'action-buttons',
                         'betting-controls', 'count-quiz', 'new-hand-btn', 'strategy-area'];
        for (const id of gameEls) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        }
        if (this.elements.drillSection) {
            this.elements.drillSection.style.display = 'block';
        }
    },

    hideDrillMode() {
        if (this.elements.drillSection) {
            this.elements.drillSection.style.display = 'none';
        }
        // Restore game elements
        const restoreEls = ['dealer-area', 'player-area', 'message'];
        for (const id of restoreEls) {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        }
    },

    renderDrillHand(drill) {
        if (!drill.currentHand || !drill.currentDealerUpcard) return;

        // Render dealer upcard
        if (this.elements.drillDealerCards) {
            this.elements.drillDealerCards.innerHTML = '';
            const dealerEl = this.renderCard(drill.currentDealerUpcard, false);
            dealerEl.classList.add('card-visible');
            this.elements.drillDealerCards.appendChild(dealerEl);
        }

        // Render player hand
        if (this.elements.drillPlayerCards) {
            this.elements.drillPlayerCards.innerHTML = '';
            for (const card of drill.currentHand.cards) {
                const el = this.renderCard(card, false);
                el.classList.add('card-visible');
                this.elements.drillPlayerCards.appendChild(el);
            }
        }

        // Score
        if (this.elements.drillPlayerScore) {
            const score = drill.currentHand.score();
            const soft = drill.currentHand.isSoft() ? ' (soft)' : '';
            const type = drill.currentHandType;
            this.elements.drillPlayerScore.textContent = score + soft + ' [' + type + ']';
        }

        // Clear feedback
        if (this.elements.drillFeedback) {
            this.elements.drillFeedback.textContent = '';
            this.elements.drillFeedback.className = 'drill-feedback';
        }
    },

    showDrillFeedback(result) {
        if (!this.elements.drillFeedback) return;
        if (result.correct) {
            this.elements.drillFeedback.textContent = result.optimal + ' \u2014 correct';
            this.elements.drillFeedback.className = 'drill-feedback correct';
        } else if (result.isClose) {
            this.elements.drillFeedback.textContent = 'Either works \u2014 ' + result.optimal + ' is slightly better';
            this.elements.drillFeedback.className = 'drill-feedback close';
        } else {
            this.elements.drillFeedback.textContent = 'Optimal: ' + result.optimal + ' (' + result.breakdown + ')';
            this.elements.drillFeedback.className = 'drill-feedback incorrect';
        }
    },

    updateDrillStats(drill) {
        if (!this.elements.drillStats) return;
        const pct = drill.overallPct();
        const total = drill.stats.total;
        let text = total + ' drills \u2014 ' + pct + '% correct';

        const byType = drill.stats.byType;
        const parts = [];
        for (const [type, bucket] of Object.entries(byType)) {
            if (bucket.total > 0) {
                const typePct = Math.round((bucket.correct / bucket.total) * 100);
                parts.push(type + ': ' + typePct + '%');
            }
        }
        if (parts.length) text += ' (' + parts.join(', ') + ')';

        this.elements.drillStats.textContent = text;

        // Weak spots
        if (this.elements.drillWeakSpots) {
            const weak = drill.getWeakSpots();
            if (weak.length > 0) {
                this.elements.drillWeakSpots.textContent = 'Weak: ' + weak.map(w => w.type + ' ' + w.pct + '%').join(', ');
                this.elements.drillWeakSpots.style.display = '';
            } else {
                this.elements.drillWeakSpots.textContent = '';
                this.elements.drillWeakSpots.style.display = 'none';
            }
        }
    },

    // ── Session Summary ──

    showSessionSummary(tracker) {
        if (!this.elements.summarySection) return;

        const grouped = tracker.getMisplaysByType();
        let html = '<div class="summary-title">Session Summary</div>';

        // Overall stats
        html += '<div class="summary-stat">Accuracy: ' + tracker.overallPct() + '% (' + tracker.overall.correct + '/' + tracker.overall.total + ')</div>';
        for (const type of ['hard', 'soft', 'pair']) {
            const b = tracker.byType[type];
            if (b.total > 0) {
                html += '<div class="summary-stat">' + type + ': ' + tracker.typePct(type) + '% (' + b.correct + '/' + b.total + ')</div>';
            }
        }

        // Misplays grouped
        for (const type of ['hard', 'soft', 'pair']) {
            const plays = grouped[type];
            if (plays.length === 0) continue;
            html += '<div class="summary-group-title">' + type + ' misplays:</div>';
            for (const m of plays) {
                html += '<div class="summary-misplay">' + m.playerHand + ' vs ' + m.dealerUpcard + ': played ' + m.playerAction + ', optimal ' + m.optimalAction + '</div>';
            }
        }

        if (tracker.misplays.length === 0) {
            html += '<div class="summary-stat">No misplays this session!</div>';
        }

        this.elements.summarySection.innerHTML = html;
        this.elements.summarySection.style.display = 'block';
    },

    hideSessionSummary() {
        if (this.elements.summarySection) {
            this.elements.summarySection.style.display = 'none';
        }
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UI };
}
