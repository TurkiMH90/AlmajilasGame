import { GameState as GameStateType } from '../core/game-state';

/**
 * EndScreen - Shows final score and game over message
 */

export class EndScreen {
  private container: HTMLElement;
  private onRestart: () => void;

  constructor(container: HTMLElement, onRestart: () => void) {
    this.container = container;
    this.onRestart = onRestart;
    this.setupUI();
  }

  /**
   * Setup the end screen UI
   */
  private setupUI(): void {
    this.container.className = 'end-screen';
    this.container.style.display = 'none';
  }

  /**
   * Show the end screen with winner and final scores
   */
  show(gameState: GameStateType): void {
    // Sort players by points
    const sortedPlayers = [...gameState.players].sort((a, b) => b.points - a.points);
    const winner = sortedPlayers[0];

    this.container.innerHTML = `
      <div class="end-screen-content">
        <div class="winner-section">
          <h1 class="end-title">🎉 انتهت اللعبة! 🎉</h1>
          <div class="winner-card">
            <div class="winner-badge">🏆 الفائز 🏆</div>
            ${winner.portrait ? `<img class="winner-portrait" src="${winner.portrait}" alt="${winner.characterName}" />` : ''}
            <div class="winner-name" style="color: ${winner.color}">${winner.characterName || winner.name}</div>
            <div class="winner-points">${winner.points} نقطة</div>
          </div>
        </div>
        
        <div class="final-scores">
          <h2>النتائج النهائية</h2>
          <div class="scores-list">
            ${sortedPlayers.map((player, index) => `
              <div class="score-row" style="border-left-color: ${player.color}">
                <span class="score-rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1)}</span>
                ${player.portrait ? `<img class="score-portrait" src="${player.portrait}" alt="${player.characterName}" />` : ''}
                <span class="score-name" style="color: ${player.color}">${player.characterName || player.name}</span>
                <span class="score-points">${player.points}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <button class="restart-button" id="restart-btn">العب مرة أخرى 🔄</button>
      </div>
    `;

    // Add restart button listener
    const restartBtn = this.container.querySelector('#restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.onRestart();
      });
    }

    this.container.style.display = 'flex';
  }

  /**
   * Hide the end screen
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }
}

