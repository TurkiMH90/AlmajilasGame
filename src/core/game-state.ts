import { TileType, TILE_COUNT, MAX_TURNS, TILE_REWARDS } from './constants';
import { RNG } from './rng';

/**
 * GameState shape - represents the complete game state
 */
export interface Player {
  id: number;
  name: string; // e.g., "Player 1" or "Team Red"
  isTeam: boolean; // true if it represents a team
  characterModel: string; // Path to GLB
  characterName: string; // Name of the character (e.g., "Sonic", "Amy Rose")
  portrait: string; // Path to portrait image
  color: string; // Hex color for UI
  pawnPosition: number; // Current tile index (0-49)
  points: number;
}

/**
 * GameState shape - represents the complete game state
 */
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  tiles: Tile[]; // Array of 50 tiles
  currentState: string; // Current turn state machine state
  diceResult: number | null;
  pendingPoints: number | null; // Points from current tile resolution
  minigameScore: number | null; // Score from minigame (clicks/taps)
  rng: RNG; // Deterministic random number generator
}

export interface Tile {
  type: TileType;
  index: number;
}

/**
 * Initialize a new game state
 * @param seed - Random seed
 * @param players - Initial configuration of players
 */
export function createGameState(seed?: number, players: Player[] = []): GameState {
  const rng = new RNG(seed);

  // Generate tiles with proper distribution
  const tiles = generateTiles(rng);

  return {
    players,
    currentPlayerIndex: 0,
    turn: 1,
    tiles,
    currentState: 'TURN_START',
    diceResult: null,
    pendingPoints: null,
    minigameScore: null,
    rng
  };
}

/**
 * Tile generation and placement
 * Creates 50 tiles with proper type distribution in a looped path
 */
function generateTiles(rng: RNG): Tile[] {
  const tiles: Tile[] = [];

  // Create tiles based on distribution
  const tileTypes: TileType[] = [];

  for (let i = 0; i < 20; i++) tileTypes.push(TileType.GREEN);
  for (let i = 0; i < 15; i++) tileTypes.push(TileType.RED);
  for (let i = 0; i < 10; i++) tileTypes.push(TileType.YELLOW);
  for (let i = 0; i < 5; i++) tileTypes.push(TileType.BLUE);

  // Shuffle to randomize placement
  const shuffled = rng.shuffle(tileTypes);

  // Create tile objects with index
  for (let i = 0; i < TILE_COUNT; i++) {
    tiles.push({
      type: shuffled[i],
      index: i
    });
  }

  return tiles;
}

/**
 * Calculate points from a yellow (random) tile
 */
export function getYellowTilePoints(rng: RNG): number {
  return rng.pick(TILE_REWARDS.YELLOW_OPTIONS);
}

/**
 * Calculate points from minigame (trivia) score
 * Correct answer = 10 points, wrong answer = 0 points
 */
export function getMinigamePoints(correct: boolean): number {
  return correct ? 10 : 0;
}

