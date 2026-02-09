# Changelog - February 9th, 2026

## Summary
Fixed character positioning and tile styling in the board game.

---

## Changes Made

### 1. Start/Finish Tile Styling
**Location:** `board-scene.ts` → `createTiles()` (line ~316)

- Tile 0 (START) and Tile 49 (FINISH) are now **black** (`Color3(0.1, 0.1, 0.1)`)
- Added skip logic in `updateTiles()` to preserve black color regardless of tile type

```typescript
// In createTiles():
if (i === 0 || i === positions.length - 1) {
  material.diffuseColor = new Color3(0.1, 0.1, 0.1); // Black for start/finish
}

// In updateTiles():
if (index === 0 || index === this.tiles.length - 1) return; // Skip black tiles
```

---

### 2. Character Height Fix
**Location:** `board-scene.ts` → `createPawn()` (line ~698) and `updatePawnPositions()` (line ~526)

#### Problem
Characters appeared below/inside tiles instead of standing on them.

#### Root Cause
The Y offset calculation used world coordinates while the pawn was already positioned:
```typescript
// OLD (wrong):
const yOffset = -minY_final;  // minY_final was in world coords → negative offset!
```

#### Solution
1. Added `pawnYOffsets` Map to store per-character Y offsets
2. Fixed calculation to convert world → local coordinates:

```typescript
// NEW (correct):
const localMinY = minY_world - pawn.position.y;  // Convert to local
const yOffset = -localMinY;                       // Correct positive offset
this.pawnYOffsets.set(playerId, yOffset);
```

3. Updated `updatePawnPositions()` to use stored offset:
```typescript
const characterYOffset = this.pawnYOffsets.get(player.id) || 0;
pawn.position = tile.position.clone().add(new Vector3(offset.x, characterYOffset, offset.z));
```

4. Updated `movePawn()` to use same offset during movement animation

---

## Debug Logging Added

| Log | Meaning |
|-----|---------|
| `[TILE] Tile X set to BLACK (START/FINISH)` | Tile color set |
| `[PAWN] Player X at tile Y: Tile Y, CharOffset, Final Y` | Pawn positioning |
| `Character X loaded: filename, minY_world, pawnY, yOffset` | Character model loaded with offset calculated |

---

## Files Modified
- `src/babylon/board-scene.ts`
  - `createTiles()` - Black color for tiles 0 and 49
  - `updateTiles()` - Skip tiles 0 and 49
  - `createPawn()` - Fixed Y offset calculation, store in `pawnYOffsets`
  - `updatePawnPositions()` - Apply stored Y offset
  - `movePawn()` - Apply stored Y offset during animation

---

## Testing Checklist
- [x] Tile 0 appears black (start)
- [x] Tile 49 appears black (finish)
- [x] Characters stand on tiles at start
- [x] Characters stay on tiles during movement
- [x] Characters remain properly positioned after movement
