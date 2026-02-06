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
    // Main HUD overlay (transparent container)
    this.container.className = 'hud-container';

    // --- PLAYER STATUS CARD (Top Left) ---
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';

    // Turn Info Row
    const turnInfo = document.createElement('div');
    turnInfo.className = 'turn-info';

    const turnLabel = document.createElement('span');
    turnLabel.className = 'turn-label';
    turnLabel.textContent = 'الدور'; // Turn

    this.turnCounter = document.createElement('span');
    this.turnCounter.className = 'turn-value';
    this.turnCounter.textContent = '1 / 12';

    turnInfo.appendChild(turnLabel);
    turnInfo.appendChild(this.turnCounter);
    playerCard.appendChild(turnInfo);

    // Player Details Row
    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.id = 'hud-player-avatar';
    avatar.textContent = '👤';
    playerInfo.appendChild(avatar);

    // Name & Score
    const details = document.createElement('div');
    details.className = 'player-details';

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'player-name';
    nameDisplay.id = 'hud-player-name';
    nameDisplay.textContent = 'Player 1';

    this.pointsDisplay = document.createElement('div');
    this.pointsDisplay.className = 'player-score';
    this.pointsDisplay.textContent = '0 نقاط'; // Points

    details.appendChild(nameDisplay);
    details.appendChild(this.pointsDisplay);
    playerInfo.appendChild(details);

    playerCard.appendChild(playerInfo);
    this.container.appendChild(playerCard);

    // --- ROLL DICE BUTTON (Bottom Right) ---
    const rollContainer = document.createElement('div');
    rollContainer.className = 'roll-button-container';

    this.rollButton = document.createElement('button');
    this.rollButton.className = 'roll-button';
    this.rollButton.innerHTML = `
      <span class="roll-icon">🎲</span>
      <span class="roll-text">ارمِ النرد</span>
    `;
    this.rollButton.addEventListener('click', () => {
      this.onRollDice();
    });
    rollContainer.appendChild(this.rollButton);
    this.container.appendChild(rollContainer);

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

    // Leaderboard panel (top right) - Updated structure
    this.leaderboard = document.createElement('div');
    this.leaderboard.className = 'leaderboard-panel';
    this.leaderboard.innerHTML = `
      <div class="leaderboard-header">
        <span class="leaderboard-icon">🏆</span>
        <span class="leaderboard-title">المتصدرين</span>
      </div>
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

    // Update Player Card (Current Player)
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer) {
      // Update Name
      const nameEl = document.getElementById('hud-player-name');
      if (nameEl) {
        nameEl.textContent = currentPlayer.characterName || currentPlayer.name;
        nameEl.style.color = currentPlayer.color; // Tint name with player color
      }

      // Update Points
      this.pointsDisplay.textContent = `${currentPlayer.points} 💎`; // Using gem icon for points

      // Update Avatar
      const avatarEl = document.getElementById('hud-player-avatar');
      if (avatarEl) {
        if (currentPlayer.portrait) {
          avatarEl.innerHTML = `<img src="${currentPlayer.portrait}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
          avatarEl.style.borderColor = currentPlayer.color;
        } else {
          avatarEl.textContent = currentPlayer.characterName?.charAt(0) || '?';
          avatarEl.style.backgroundColor = currentPlayer.color;
          avatarEl.style.border = '2px solid white';
        }
      }

      // Border color for card
      const card = this.container.querySelector('.player-card') as HTMLElement;
      if (card) {
        card.style.borderLeftColor = currentPlayer.color;
      }
    }

    // Update roll button state
    const canRoll = gameState.currentState === 'TURN_START' || gameState.currentState === 'ROLL_DICE';
    this.rollButton.disabled = !canRoll;
    this.rollButton.style.opacity = canRoll ? '1' : '0.6';
    this.rollButton.style.cursor = canRoll ? 'pointer' : 'not-allowed';

    // Update button text/icon based on state
    // Update button text/icon based on state
    const rollText = this.rollButton.querySelector('.roll-text');
    if (rollText) {
      if (canRoll) {
        rollText.textContent = 'ارمِ النرد';
      } else {
        rollText.textContent = '...';
      }
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
      const rank = index + 1;
      const isCurrentPlayer = player.id === gameState.players[gameState.currentPlayerIndex]?.id;

      // Rank badge style
      let rankBadge = `<span class="rank-num">${rank}</span>`;
      if (index === 0) rankBadge = '🥇';
      if (index === 1) rankBadge = '🥈';
      if (index === 2) rankBadge = '🥉';

      const portraitHtml = player.portrait
        ? `<img class="lb-portrait-img" src="${player.portrait}" alt="${player.characterName}" />`
        : `<span class="lb-initial" style="background: ${player.color}">${player.characterName?.charAt(0) || '?'}</span>`;

      html += `
        <div class="lb-row ${isCurrentPlayer ? 'active' : ''}" style="${isCurrentPlayer ? `border-right: 3px solid ${player.color}; background: rgba(255,255,255,0.1);` : ''}">
          <div class="lb-rank">${rankBadge}</div>
          <div class="lb-avatar">${portraitHtml}</div>
          <div class="lb-name">${player.characterName || player.name}</div>
          <div class="lb-score">${player.points}</div>
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
      case 'minigame_win':
        message = `🏆 إجابة صحيحة! +${points} نقاط`;
        break;
      case 'minigame_lose':
        message = `❌ إجابة خاطئة! +0 نقاط`;
        break;
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

    let typeClass = 'neutral';
    if (tileType === 'green' || tileType === 'minigame_win') typeClass = 'positive';
    if (tileType === 'red' || tileType === 'minigame_lose') typeClass = 'negative';
    if (tileType === 'yellow') typeClass = 'yellow';
    if (tileType === 'blue') typeClass = 'special';

    this.tileMessage.innerHTML = `<span class="tm-icon">${message.split(' ')[0]}</span> <span class="tm-text">${message.substring(2)}</span>`;
    this.tileMessage.style.display = 'flex';
    // Force reflow
    void this.tileMessage.offsetWidth;
    this.tileMessage.className = `tile-message show ${typeClass}`;

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

