/**
 * Game constants and configuration
 */

export const TILE_COUNT = 50;
export const MAX_TURNS = 12;
export const DICE_MIN = 1;
export const DICE_MAX = 6;

// Tile type distribution (must sum to 50)
export const GREEN_TILE_COUNT = 20;  // +3 points
export const RED_TILE_COUNT = 15;    // -3 points
export const YELLOW_TILE_COUNT = 10; // Random: +5, +2, -2, -5
export const BLUE_TILE_COUNT = 5;    // Minigame

export const TILE_REWARDS = {
  GREEN: 3,
  RED: -3,
  YELLOW_OPTIONS: [5, 2, -2, -5] as const
};

export const MINIGAME_DURATION = 15000; // 15 seconds for trivia minigame
export const MINIGAME_MAX_POINTS = 10; // Maximum points from minigame
export const TRIVIA_TIME_PER_QUESTION = 15000; // 15 seconds per question

export enum TileType {
  GREEN = 'green',
  RED = 'red',
  YELLOW = 'yellow',
  BLUE = 'blue'
}

export enum GameState {
  TURN_START = 'TURN_START',
  ROLL_DICE = 'ROLL_DICE',
  MOVE = 'MOVE',
  RESOLVE_TILE = 'RESOLVE_TILE',
  OPTIONAL_MINIGAME = 'OPTIONAL_MINIGAME',
  END_TURN = 'END_TURN',
  GAME_END = 'GAME_END'
}

