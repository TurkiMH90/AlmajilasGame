import { initEngine } from './babylon/engine';
import { SceneManager, SceneType } from './babylon/scene-manager';
import { createGameState, GameState as GameStateType } from './core/game-state';
import { TurnMachine } from './core/turn-machine';
import { HUD } from './ui/hud';
import { MinigameUI } from './ui/minigame-ui';
import { EndScreen } from './ui/end-screen';
import { TileType } from './core/constants';
import { showTriviaOverlay, showTriviaByType } from './ui/trivia-overlay';

import { SelectionScreen, GameConfig } from './ui/selection-screen';
import { Player } from './core/game-state';

/**
 * Main game entry point
 * Integrates state machine, scenes, and UI components
 */

class Game {
  private sceneManager: SceneManager;
  private gameState: GameStateType;
  private turnMachine: TurnMachine;
  private hud: HUD;
  private minigameUI: MinigameUI;
  private endScreen: EndScreen;
  private isMoving: boolean = false;

  constructor(config: GameConfig) {
    // Initialize Babylon.js engine
    initEngine('renderCanvas');

    // Create game state with deterministic seed (can be changed for different games)
    const seed = Date.now(); // Use timestamp as seed (could be set to fixed value for reproducibility)

    // Pass players from config
    this.gameState = createGameState(seed, config.players);
    console.log('Game seed:', this.gameState.rng.getSeed());

    // Initialize scene manager
    this.sceneManager = new SceneManager();

    // Initialize turn machine with state change callback
    this.turnMachine = new TurnMachine(this.gameState, (state) => {
      this.onStateChange(state);
    });

    // Setup UI
    this.setupUI();

    // Initialize scenes
    this.setupScenes();

    // Initialize board
    this.initializeBoard();

    // Listen for test events from Dev Tools
    window.addEventListener('testBlueTile', () => {
      this.testBlueTileMinigame();
    });

    // Start first turn
    this.turnMachine.startTurn();
    this.updateUI();
  }

  /**
   * Test blue tile minigame directly (for debugging)
   */
  private testBlueTileMinigame(): void {
    console.log('Testing Blue Tile - Starting minigame in test mode');
    // Force state to OPTIONAL_MINIGAME using TurnMachine's method
    this.turnMachine.forceStateForTesting('OPTIONAL_MINIGAME');
    this.handleStartMinigame();
  }

  /**
   * Setup UI components
   */
  private setupUI(): void {
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    // Clear any previous UI (like selection screen)
    app.innerHTML = '';

    // Create UI containers
    const hudContainer = document.createElement('div');
    hudContainer.id = 'hud';
    app.appendChild(hudContainer);

    const minigameContainer = document.createElement('div');
    minigameContainer.id = 'minigame-ui';
    app.appendChild(minigameContainer);

    const endScreenContainer = document.createElement('div');
    endScreenContainer.id = 'end-screen';
    app.appendChild(endScreenContainer);

    // Create UI components
    this.hud = new HUD(
      hudContainer,
      () => this.handleRollDice(),
      () => this.handleTestTrivia()
    );
    this.minigameUI = new MinigameUI(minigameContainer, (correct) => this.handleMinigameComplete(correct), this.gameState.rng);
    this.endScreen = new EndScreen(endScreenContainer, () => this.handleRestart());
  }

  /**
   * Handle test trivia button click - cycles through text, audio, video
   */
  private testQuestionTypeIndex = 0;
  private questionTypes: ('text' | 'audio' | 'video')[] = ['text', 'audio', 'video'];

  private handleTestTrivia(): void {
    const questionType = this.questionTypes[this.testQuestionTypeIndex];
    this.testQuestionTypeIndex = (this.testQuestionTypeIndex + 1) % this.questionTypes.length;

    console.log(`[Game] Testing ${questionType} trivia from Supabase`);

    showTriviaByType(questionType, (result) => {
      console.log('[Game] Trivia result:', result);
      if (result.success) {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (currentPlayer) {
          currentPlayer.points += result.pointsEarned;
          this.hud.showTileMessage('minigame_win', result.pointsEarned);
        }
      } else {
        this.hud.showTileMessage('minigame_lose', 0);
      }
      this.updateUI();
    });
  }

  /**
   * Setup scenes
   */
  private setupScenes(): void {
    // Initialize board scene
    this.sceneManager.initBoardScene(
      () => { /* dice roll callback - handled by HUD button */ },
      () => this.handlePawnMoveComplete()
    );

    // Initialize minigame scene
    this.sceneManager.initMinigameScene(() => { });

    // Pre-load the 3D dice model
    const boardScene = this.sceneManager.getBoardScene();
    if (boardScene) {
      boardScene.loadDice();
    }
  }

  /**
   * Initialize board with tiles and pawn
   */
  private initializeBoard(): void {
    const boardScene = this.sceneManager.getBoardScene();
    if (!boardScene) return;

    // Update tile colors based on game state
    boardScene.updateTiles(this.gameState);

    // Initial positioning for ALL players
    this.gameState.players.forEach(player => {
      // We need to update BoardScene to support multiple pawns first!
      // But for now, we'll pass the list to updatePawnPositions (plural)
      boardScene.updatePawnPositions(this.gameState.players);
    });
  }

  /**
   * Handle state machine state changes
   */
  private onStateChange(state: string): void {
    console.log('State changed to:', state);

    switch (state) {
      case 'GAME_END':
        this.handleGameEnd();
        break;
      case 'OPTIONAL_MINIGAME':
        this.handleStartMinigame();
        break;
      default:
        this.updateUI();
    }
  }

  /**
   * Handle dice roll button click
   */
  private async handleRollDice(): Promise<void> {
    if (this.isMoving) return;

    try {
      const currentState = this.turnMachine.getState();
      if (currentState !== 'TURN_START' && currentState !== 'ROLL_DICE') {
        console.warn('Cannot roll dice in state:', currentState);
        return;
      }

      // Disable roll button during dice animation
      this.isMoving = true;

      // Get the dice result first (but don't show it yet)
      const diceResult = this.turnMachine.rollDice();
      console.log('Dice rolled:', diceResult);

      // Get current player for positioning
      const gameState = this.turnMachine.getGameState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      // Play 3D dice animation (5 seconds)
      const boardScene = this.sceneManager.getBoardScene();
      if (boardScene) {
        await boardScene.rollDice3D(currentPlayer.id, diceResult);
      }

      // Show dice result in HUD after animation
      this.hud.showDiceRoll(diceResult);
      this.updateUI();

      // Re-enable and start movement
      this.isMoving = false;

      // Debug: Verify dice result matches what was rolled
      const moveGameState = this.turnMachine.getGameState();
      console.log(`About to move. Dice shown: ${diceResult}, GameState diceResult: ${moveGameState.diceResult}`);

      this.handleMove();
    } catch (error) {
      console.error('Error rolling dice:', error);
      this.isMoving = false;
    }
  }

  /**
   * Handle pawn movement
   */
  private async handleMove(): Promise<void> {
    if (this.isMoving) {
      console.log('Already moving, skipping...');
      return;
    }

    const currentState = this.turnMachine.getState();
    if (currentState !== 'MOVE') {
      console.warn('Cannot move in state:', currentState);
      return;
    }

    const gameState = this.turnMachine.getGameState();
    const diceResult = gameState.diceResult;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (diceResult === null || diceResult < 1) {
      console.error('Invalid dice result:', diceResult);
      return;
    }

    const currentPosition = currentPlayer.pawnPosition;
    const newPosition = (currentPosition + diceResult) % 50;

    console.log(`Moving ${currentPlayer.name} from position ${currentPosition} to ${newPosition} (${diceResult} steps)`);

    this.isMoving = true;
    this.hud.hideTileMessage();

    try {
      const boardScene = this.sceneManager.getBoardScene();
      if (!boardScene) {
        throw new Error('Board scene not found');
      }

      // Ensure pawn is at the correct starting position
      // boardScene.updatePawnPosition(currentPosition); // Need to target specific pawn

      // Wait a frame to ensure position is set
      await new Promise(resolve => setTimeout(resolve, 50));

      // Move pawn with animation
      // We need to tell boardScene WHICH pawn to move
      await boardScene.movePawn(currentPlayer.id, currentPosition, diceResult, gameState);

      // Update game state position after movement completes
      currentPlayer.pawnPosition = newPosition;

      // Transition to RESOLVE_TILE state since we handled movement visually
      this.turnMachine.transitionToResolveTile();

      // Now resolve the tile
      this.turnMachine.resolveTile();

      // Wait 2 seconds so player can see where they landed before showing tile notification
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.handleTileResolved();
    } catch (error) {
      console.error('Error moving pawn:', error);
      this.isMoving = false;
    } finally {
      // Don't set isMoving to false here - let it be set after tile resolution
    }
  }

  /**
   * Handle pawn move completion (callback from scene)
   */
  private handlePawnMoveComplete(): void {
    // This is called by the board scene when animation completes
    // The actual tile resolution happens in handleMove()
  }

  /**
   * Handle tile resolution
   */
  private handleTileResolved(): void {
    const gameState = this.turnMachine.getGameState();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentTile = gameState.tiles[currentPlayer.pawnPosition];
    const points = gameState.pendingPoints ?? 0;

    // Show tile message
    if (currentTile && currentTile.type !== TileType.BLUE) {
      this.hud.showTileMessage(currentTile.type, points);
    }

    // Update UI
    this.updateUI();

    // Reset moving flag
    this.isMoving = false;

    // If not minigame, end turn automatically after message
    if (currentTile && currentTile.type !== TileType.BLUE) {
      setTimeout(() => {
        this.turnMachine.endTurn();
        this.updateUI();
      }, 4000); // Wait for message to display
    }
  }

  /**
   * Handle minigame start
   */
  private handleStartMinigame(): void {
    console.log('Starting minigame');
    this.sceneManager.switchToScene(SceneType.MINIGAME);
    this.minigameUI.start();
  }

  /**
   * Handle minigame completion (trivia: correct = true, incorrect = false)
   */
  private handleMinigameComplete(correct: boolean): void {
    console.log('Minigame completed:', correct ? 'Correct!' : 'Wrong answer');

    // Complete minigame in turn machine
    try {
      this.turnMachine.completeMinigame(correct);

      // Show points earned (or lost)
      const gameState = this.turnMachine.getGameState();
      const points = gameState.pendingPoints ?? 0;

      // Show appropriate message based on correct/wrong answer
      if (correct) {
        this.hud.showTileMessage('minigame_win', points);
      } else {
        this.hud.showTileMessage('minigame_lose', 0);
      }

      // Switch back to board scene BEFORE hiding minigame UI
      // This ensures the board scene is ready to render
      this.sceneManager.switchToScene(SceneType.BOARD);

      // Update board state to ensure everything is in sync
      this.updateUI();

      // End turn after message
      setTimeout(() => {
        this.turnMachine.endTurn();
        this.updateUI();
      }, 4000);
    } catch (error) {
      console.error('Error completing minigame:', error);
      // Try to switch back to board scene even on error
      try {
        this.sceneManager.switchToScene(SceneType.BOARD);
      } catch (switchError) {
        console.error('Error switching back to board scene:', switchError);
      }
    }
  }

  /**
   * Handle game end
   */
  private handleGameEnd(): void {
    const winners = [...this.gameState.players].sort((a, b) => b.points - a.points);
    const winner = winners[0];
    console.log('Game ended. Winner:', winner.name);

    // Play victory animation before showing end screen
    const boardScene = this.sceneManager.getBoardScene();
    if (boardScene) {
      boardScene.playVictoryAnimation(winner.id).then(() => {
        this.updateUI();
        this.endScreen.show(this.gameState);
      });
    } else {
      this.updateUI();
      this.endScreen.show(this.gameState);
    }
  }

  /**
   * Handle restart
   */
  private handleRestart(): void {
    // Reload page to return to selection screen
    window.location.reload();
  }

  /**
   * Update all UI components
   */
  private updateUI(): void {
    const gameState = this.turnMachine.getGameState();
    this.hud.update(gameState);

    // Update board tiles if needed
    const boardScene = this.sceneManager.getBoardScene();
    if (boardScene) {
      boardScene.updateTiles(gameState);
      // boardScene.updatePawnPosition(gameState.pawnPosition); // REMOVED - need multi-pawn update
      boardScene.updatePawnPositions(gameState.players); // NEW method to add

      // Highlight pawn during active turn (not moving and not in minigame)
      const currentState = this.turnMachine.getState();
      const isActive = !this.isMoving &&
        (currentState === 'TURN_START' || currentState === 'ROLL_DICE' || currentState === 'MOVE');
      boardScene.setActiveTurn(isActive);

      // Show/hide spinning dice above current player
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer && (currentState === 'TURN_START' || currentState === 'ROLL_DICE')) {
        // Show dice above current player, spinning continuously
        boardScene.showDiceAbovePlayer(currentPlayer.id);
      } else {
        // Hide dice during movement or other states
        // (rollDice3D handles hiding after the slowdown animation)
      }
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
} else {
  initApp();
}

function initApp() {
  const app = document.getElementById('app');
  if (app) {
    new SelectionScreen(app, (config) => {
      // Clear selection screen is handled by setupUI clearing innerHTML
      new Game(config);
    });
  }
}

