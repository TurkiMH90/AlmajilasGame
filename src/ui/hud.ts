import { GameState as GameStateType } from '../core/game-state';

/**
 * HUD (Heads-Up Display) - Main game UI overlay
 * Displays: Roll dice button, Turn counter, Current points, Tile landed message
 */

export class HUD {
  private container: HTMLElement;
  private rollButton!: HTMLButtonElement;
  private turnCounter!: HTMLElement;
  private pointsDisplay!: HTMLElement;
  private tileMessage!: HTMLElement;
  private dicePopup!: HTMLElement;
  private leaderboard!: HTMLElement;
  private onRollDice: () => void;

  constructor(container: HTMLElement, onRollDice: () => void) {
    this.container = container;
    this.onRollDice = onRollDice;
    this.setupUI();
  }

  /**
   * Setup the HUD UI elements
   */
  private setupUI(): void {
    // Main HUD container
    this.container.className = 'hud-container';

    // Turn counter
    const turnContainer = document.createElement('div');
    turnContainer.className = 'hud-item';
    this.turnCounter = document.createElement('div');
    this.turnCounter.className = 'hud-value';
    this.turnCounter.textContent = 'الدور: 1';
    turnContainer.appendChild(document.createTextNode('الدور: '));
    turnContainer.appendChild(this.turnCounter);
    this.container.appendChild(turnContainer);

    // Points display
    const pointsContainer = document.createElement('div');
    pointsContainer.className = 'hud-item';
    this.pointsDisplay = document.createElement('div');
    this.pointsDisplay.className = 'hud-value';
    this.pointsDisplay.textContent = '0';
    pointsContainer.appendChild(document.createTextNode('النقاط: '));
    pointsContainer.appendChild(this.pointsDisplay);
    this.container.appendChild(pointsContainer);

    // Roll dice button
    this.rollButton = document.createElement('button');
    this.rollButton.className = 'roll-button';
    this.rollButton.textContent = 'ارمِ النرد';
    this.rollButton.addEventListener('click', () => {
      this.onRollDice();
    });
    this.container.appendChild(this.rollButton);

    // Tile message (shows when landing on a tile)
    this.tileMessage = document.createElement('div');
    this.tileMessage.className = 'tile-message';
    this.tileMessage.style.display = 'none';
    this.container.appendChild(this.tileMessage);

    // Dice roll popup (shows dice number with animation)
    this.dicePopup = document.createElement('div');
    this.dicePopup.className = 'dice-popup';
    this.dicePopup.style.display = 'none';
    document.body.appendChild(this.dicePopup);

    // Leaderboard panel (top right)
    this.leaderboard = document.createElement('div');
    this.leaderboard.className = 'leaderboard-panel';
    this.leaderboard.innerHTML = `
      <div class="leaderboard-title">🏆 لوحة المتصدرين</div>
      <div class="leaderboard-list"></div>
    `;
    document.body.appendChild(this.leaderboard);
  }

  /**
   * Update HUD with current game state
   */
  update(gameState: GameStateType): void {
    // Update turn counter
    this.turnCounter.textContent = `${gameState.turn} / 12`;

    // Update points (Current Player)
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer) {
      this.pointsDisplay.textContent = `${currentPlayer.name}: ${currentPlayer.points}`;
      // Optionally change color to match player
      this.pointsDisplay.style.color = currentPlayer.color;
    }

    // Update roll button state
    const canRoll = gameState.currentState === 'TURN_START' || gameState.currentState === 'ROLL_DICE';
    this.rollButton.disabled = !canRoll;
    this.rollButton.style.opacity = canRoll ? '1' : '0.5';
    this.rollButton.style.cursor = canRoll ? 'pointer' : 'not-allowed';

    // Show dice result if available
    if (gameState.diceResult !== null) {
      this.rollButton.textContent = `النرد: ${gameState.diceResult}`;
    } else {
      this.rollButton.textContent = 'ارمِ النرد';
    }

    // Update leaderboard
    this.updateLeaderboard(gameState);
  }

  /**
   * Update the leaderboard panel with sorted players
   */
  private updateLeaderboard(gameState: GameStateType): void {
    const leaderboardList = this.leaderboard.querySelector('.leaderboard-list');
    if (!leaderboardList) return;

    // Sort players by points (highest first)
    const sortedPlayers = [...gameState.players].sort((a, b) => b.points - a.points);

    let html = '';
    sortedPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const isCurrentPlayer = player.id === gameState.players[gameState.currentPlayerIndex]?.id;
      const portraitHtml = player.portrait
        ? `<img class="leaderboard-portrait" src="${player.portrait}" alt="${player.characterName}" />`
        : `<span class="leaderboard-icon" style="background: ${player.color}">${player.characterName?.charAt(0) || '?'}</span>`;
      html += `
        <div class="leaderboard-row ${isCurrentPlayer ? 'current' : ''}" style="border-left-color: ${player.color}">
          <span class="leaderboard-rank">${medal || (index + 1)}</span>
          ${portraitHtml}
          <span class="leaderboard-name">${player.characterName || player.name}</span>
          <span class="leaderboard-points">${player.points}</span>
        </div>
      `;
    });

    leaderboardList.innerHTML = html;
  }

  /**
   * Show dice roll result with animation
   */
  showDiceRoll(diceResult: number): void {
    // Add roll animation to button
    this.rollButton.classList.add('rolling');

    // Show dice popup with number
    this.dicePopup.textContent = diceResult.toString();
    this.dicePopup.style.display = 'flex';
    this.dicePopup.classList.add('show');

    // Hide popup after animation
    setTimeout(() => {
      this.rollButton.classList.remove('rolling');
      this.dicePopup.classList.remove('show');
      setTimeout(() => {
        this.dicePopup.style.display = 'none';
      }, 500);
    }, 1500);
  }

  /**
   * Show tile landed message
   */
  showTileMessage(tileType: string, points: number): void {
    const sign = points >= 0 ? '+' : '';
    let message = '';

    switch (tileType) {
      case 'green':
        message = `🟢 مربع أخضر! ${sign}${points} نقاط`;
        break;
      case 'red':
        message = `🔴 مربع أحمر! ${sign}${points} نقاط`;
        break;
      case 'yellow':
        message = `🟡 مربع أصفر! ${sign}${points} نقاط`;
        break;
      case 'blue':
        message = `🔵 مربع أزرق! اللعبة الصغيرة تبدأ...`;
        break;
    }

    this.tileMessage.textContent = message;
    this.tileMessage.style.display = 'block';
    this.tileMessage.className = 'tile-message show';

    // Hide after 3 seconds
    setTimeout(() => {
      this.tileMessage.className = 'tile-message';
      setTimeout(() => {
        this.tileMessage.style.display = 'none';
      }, 500);
    }, 3000);
  }

  /**
   * Hide tile message
   */
  hideTileMessage(): void {
    this.tileMessage.className = 'tile-message';
    setTimeout(() => {
      this.tileMessage.style.display = 'none';
    }, 500);
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }
}

