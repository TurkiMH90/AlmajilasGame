# Majlis Game - Mario Party Inspired

A turn-based 3D board game built with TypeScript, Vite, and Babylon.js.

## Features

- **50 tiles** arranged in a looped path (rounded rectangle)
- **4 tile types**:
  - 🟢 Green: +3 points
  - 🔴 Red: -3 points
  - 🟡 Yellow: Random reward/penalty (+5, +2, -2, -5)
  - 🔵 Blue: Minigame tile
- **Dice rolling** (1-6) to move pawn
- **Minigame**: 5-second click/tap speed challenge
- **12 turns** to achieve highest score
- **Deterministic RNG** for reproducible games
- **State machine** for turn flow management
- **3D graphics** using Babylon.js
- **Responsive UI** for desktop and mobile

## Tech Stack

- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **Babylon.js** - 3D graphics engine
- **Scene Manager** - Switches between BoardScene and MinigameScene
- **State Machine** - Manages turn flow (TurnStart → RollDice → Move → ResolveTile → OptionalMinigame → EndTurn → GameEnd)

## Project Structure

```
/src
  /core
    game-state.ts      # GameState shape and initialization
    turn-machine.ts    # Turn state machine
    rng.ts             # Deterministic random number generator
    constants.ts       # Game constants and enums

  /babylon
    engine.ts          # Babylon.js engine setup
    scene-manager.ts   # Scene switching logic
    board-scene.ts     # 3D board with 50 tiles and pawn
    minigame-scene.ts  # Minigame 3D backdrop

  /ui
    hud.ts             # Heads-up display (turn, points, dice button)
    minigame-ui.ts     # Minigame overlay UI
    end-screen.ts      # Game over screen

  main.ts              # Main game entry point
  style.css            # Responsive styles
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:3000`

## Build

```bash
npm run build
```

## How to Play

1. **Roll Dice** - Click the "Roll Dice" button to get a number between 1-6
2. **Move Pawn** - Watch your pawn move step-by-step across tiles
3. **Land on Tiles**:
   - Green tiles give +3 points
   - Red tiles take -3 points
   - Yellow tiles give random points (+5, +2, -2, or -5)
   - Blue tiles start a minigame
4. **Minigame** - Tap/click as fast as possible for 5 seconds to earn points (0-10)
5. **Complete 12 turns** - Highest score wins!

## Code Architecture

### GameState Shape

The `GameState` interface contains:

- `points`: Current player score
- `turn`: Current turn number (1-12)
- `pawnPosition`: Current tile index (0-49)
- `tiles`: Array of 50 tiles with types
- `currentState`: Current state machine state
- `diceResult`: Last dice roll result
- `pendingPoints`: Points from current tile
- `rng`: Deterministic random number generator

### Turn State Machine

States flow as:

1. **TURN_START** - New turn begins
2. **ROLL_DICE** - Player rolls dice (1-6)
3. **MOVE** - Pawn moves step-by-step with animation
4. **RESOLVE_TILE** - Apply tile effects (green/red/yellow) or trigger minigame (blue)
5. **OPTIONAL_MINIGAME** - Minigame plays (only for blue tiles)
6. **END_TURN** - Turn completes, increment turn counter
7. **GAME_END** - 12 turns complete, show final score

### Tile Generation

Tiles are generated with distribution:

- 20 Green tiles
- 15 Red tiles
- 10 Yellow tiles
- 5 Blue tiles

Total: 50 tiles arranged in a rounded rectangle path.

### Pawn Movement Logic

- Dice result determines number of steps
- Pawn moves one tile at a time with smooth animation
- Position wraps around at tile 50 (returns to tile 0)
- After movement completes, tile is resolved

### Minigame Integration

- Blue tiles trigger minigame overlay
- Scene switches from BoardScene to MinigameScene
- Player has 5 seconds to click/tap as fast as possible
- Click count converts to points: 0 clicks = 0 points, 50+ clicks = 10 points (linear scaling)
- After minigame, return to board and continue turn

## Browser Support

- Modern browsers with WebGL support
- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: iOS Safari, Chrome Mobile, Samsung Internet

## License

MIT
