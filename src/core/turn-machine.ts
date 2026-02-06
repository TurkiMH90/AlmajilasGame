import { GameState as GameStateType, getYellowTilePoints, getMinigamePoints } from './game-state';
import { TileType, DICE_MIN, DICE_MAX, MAX_TURNS, TILE_REWARDS, GameState, MINIGAME_MAX_POINTS } from './constants';

/**
 * Turn state machine - manages the turn flow
 * States: TurnStart → RollDice → Move → ResolveTile → OptionalMinigame → EndTurn → GameEnd
 */

export type TurnState =
  | 'TURN_START'
  | 'ROLL_DICE'
  | 'MOVE'
  | 'RESOLVE_TILE'
  | 'OPTIONAL_MINIGAME'
  | 'END_TURN'
  | 'GAME_END';

export class TurnMachine {
  private state: TurnState;
  private gameState: GameStateType;
  private onStateChange?: (state: TurnState) => void;

  constructor(gameState: GameStateType, onStateChange?: (state: TurnState) => void) {
    this.gameState = gameState;
    this.state = gameState.currentState as TurnState;
    this.onStateChange = onStateChange;
  }

  /**
   * Get current state
   */
  getState(): TurnState {
    return this.state;
  }

  /**
   * Transition to a new state
   */
  private setState(newState: TurnState): void {
    this.state = newState;
    this.gameState.currentState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  /**
   * Force state for testing purposes (DEV ONLY)
   */
  forceStateForTesting(newState: TurnState): void {
    console.log(`[DEBUG] Forcing state to: ${newState}`);
    this.state = newState;
    this.gameState.currentState = newState;
  }

  /**
   * Get current player
   */
  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  /**
   * Start a new turn
   */
  startTurn(): void {
    // Check if game over
    if (this.gameState.turn > MAX_TURNS) {
      this.setState('GAME_END');
      return;
    }
    this.setState('TURN_START');
  }

  /**
   * Roll the dice (1-6)
   */
  rollDice(): number {
    if (this.state !== 'TURN_START' && this.state !== 'ROLL_DICE') {
      throw new Error(`Cannot roll dice in state: ${this.state}`);
    }

    const diceValue = this.gameState.rng.randomInt(DICE_MIN, DICE_MAX);
    this.gameState.diceResult = diceValue;
    this.setState('MOVE');
    return diceValue;
  }

  /**
   * Move pawn by dice result
   * Moves one tile at a time, wrapping around at tile 50
   */
  movePawn(moveCallback?: (newPosition: number) => void): void {
    if (this.state !== 'MOVE') {
      throw new Error(`Cannot move in state: ${this.state}`);
    }

    if (this.gameState.diceResult === null) {
      throw new Error('Cannot move without dice result');
    }

    const player = this.getCurrentPlayer();

    // Move step by step (handled by animation, but update final position)
    const steps = this.gameState.diceResult;
    const newPosition = (player.pawnPosition + steps) % 50;
    player.pawnPosition = newPosition; // Update INDIVIDUAL player position

    if (moveCallback) {
      moveCallback(newPosition);
    }

    // After movement completes (handled by animation callback), resolve tile
    this.setState('RESOLVE_TILE');
  }

  /**
   * Transition to RESOLVE_TILE state after visual movement completes
   * Used when handling movement animation externally
   */
  transitionToResolveTile(): void {
    if (this.state !== 'MOVE') {
      throw new Error(`Cannot transition to RESOLVE_TILE from state: ${this.state}`);
    }
    this.setState('RESOLVE_TILE');
  }

  /**
   * Resolve the tile the pawn landed on
   */
  resolveTile(): void {
    if (this.state !== 'RESOLVE_TILE') {
      throw new Error(`Cannot resolve tile in state: ${this.state}`);
    }

    const player = this.getCurrentPlayer();
    const currentTile = this.gameState.tiles[player.pawnPosition];
    this.gameState.pendingPoints = null;

    switch (currentTile.type) {
      case TileType.GREEN:
        this.gameState.pendingPoints = TILE_REWARDS.GREEN;
        player.points += TILE_REWARDS.GREEN;
        this.setState('END_TURN');
        break;

      case TileType.RED:
        this.gameState.pendingPoints = TILE_REWARDS.RED;
        player.points += TILE_REWARDS.RED;
        this.setState('END_TURN');
        break;

      case TileType.YELLOW:
        const yellowPoints = getYellowTilePoints(this.gameState.rng);
        this.gameState.pendingPoints = yellowPoints;
        player.points += yellowPoints;
        this.setState('END_TURN');
        break;

      case TileType.BLUE:
        // Minigame tile - don't apply points yet
        this.setState('OPTIONAL_MINIGAME');
        break;

      default:
        this.setState('END_TURN');
    }
  }

  /**
   * Complete minigame and apply points (trivia: correct = true, incorrect = false)
   */
  completeMinigame(correct: boolean): void {
    if (this.state !== 'OPTIONAL_MINIGAME') {
      throw new Error(`Cannot complete minigame in state: ${this.state}`);
    }

    const player = this.getCurrentPlayer();
    this.gameState.minigameScore = correct ? 1 : 0; // Store as 1 for correct, 0 for incorrect
    const minigamePoints = getMinigamePoints(correct);
    this.gameState.pendingPoints = minigamePoints;
    player.points += minigamePoints;
    this.setState('END_TURN');
  }

  /**
   * End the current turn and move to next
   */
  endTurn(): void {
    if (this.state !== 'END_TURN') {
      throw new Error(`Cannot end turn in state: ${this.state}`);
    }

    // Advance to next player
    const numPlayers = this.gameState.players.length;
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % numPlayers;

    // If we wrapped around to player 0, increment global turn counter
    if (this.gameState.currentPlayerIndex === 0) {
      this.gameState.turn++;
    }

    this.gameState.diceResult = null;
    this.gameState.pendingPoints = null;
    this.gameState.minigameScore = null;

    if (this.gameState.turn > MAX_TURNS) {
      this.setState('GAME_END');
    } else {
      this.startTurn();
    }
  }

  /**
   * Get the current game state
   */
  getGameState(): GameStateType {
    return this.gameState;
  }
}

