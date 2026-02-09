# Camera System Documentation

**Date:** February 7th, 2026  
**Author:** AI Assistant (Antigravity)

---

## Overview

This document describes the camera follow system implemented in `BoardScene.ts` for the Majlis Game. The camera follows players as they move around the board and smoothly transitions between players when turns change.

---

## Camera Architecture

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `FollowCamera` | `setupScene()` | Main camera that follows targets |
| `isMoving` flag | Class property | Tracks if a pawn is currently moving |
| `updateCameraFollow()` | Method | Handles transitions between players |
| `movePawn()` | Method | Handles camera following during movement |

### Camera Properties (in `setupScene`)

```typescript
this.camera.radius = 18;           // Distance from target
this.camera.heightOffset = 15;     // Height above target
this.camera.rotationOffset = 180;  // Follow from behind
this.camera.cameraAcceleration = 0.05;  // Base acceleration (slow)
this.camera.maxCameraSpeed = 20;   // Maximum speed
```

---

## How Camera Following Works

### 1. During Pawn Movement

When a player moves, the camera follows them directly using a **before-render observer**:

```typescript
// In movePawn():
const followObserver = this.scene.onBeforeRenderObservable.add(() => {
  // Calculate target camera position (pawn position + offset)
  const targetCameraPos = pawn.position.add(cameraOffset);
  
  // Smoothly interpolate camera position (lerp factor 0.5)
  this.camera.position = Vector3.Lerp(this.camera.position, targetCameraPos, 0.5);
  
  // Update what camera looks at
  this.camera.setTarget(pawn.position);
});
```

**Key design decisions:**
- Camera offset is calculated at start of movement and maintained throughout
- `Vector3.Lerp` with factor 0.5 provides smooth but responsive following
- `setTarget()` is called every frame to keep camera looking at pawn
- Observer is cleaned up after movement completes

### 2. After Movement / Switching Players

When a turn ends and camera needs to switch to next player, `updateCameraFollow()` handles a smooth transition:

```typescript
// Creates animated transition over 60 frames (1 second)
const transitionObserver = this.scene.onBeforeRenderObservable.add(() => {
  // Abort if movement starts
  if (this.isMoving) {
    // cleanup and return
  }
  
  // Ease in-out interpolation
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  tempTarget.position = Vector3.Lerp(startPos, targetPosition, eased);
});
```

---

## Issues Encountered & Solutions

### Issue 1: Camera Not Following During Movement

**Problem:** FollowCamera's `lockedTarget` property alone wasn't enough - camera didn't move.

**Root Cause:** FollowCamera's `cameraAcceleration` was set to 0.05 (very slow), so the camera barely moved during the 1-second tile animations.

**Solution:** Bypass FollowCamera's automatic following. Instead, directly update `camera.position` each frame using `Vector3.Lerp`.

---

### Issue 2: Camera Stuck After Movement Ends

**Problem:** After pawn finished moving, camera would freeze/get stuck.

**Root Cause:** The `cameraFollowTarget` mesh used during movement was disposed, but camera's `lockedTarget` still pointed to it.

**Solution:** After cleanup, explicitly set `camera.lockedTarget` to the final destination tile:

```typescript
const finalTile = this.tiles[(startPosition + steps) % 50];
if (finalTile && this.camera) {
  this.camera.lockedTarget = finalTile;
}
```

---

### Issue 3: Smooth Transition Breaking Movement Following

**Problem:** Adding smooth transition animation in `updateCameraFollow()` broke the camera following during movement.

**Root Cause:** The smooth transition observer was conflicting with the movement following observer.

**Solution:** 
1. Check `isMoving` flag at start of `updateCameraFollow()` - return immediately if true
2. Inside transition observer, check `isMoving` again and abort if movement starts

---

### Issue 4: Camera Looking at Wrong Position

**Problem:** Camera was moving but not looking at the pawn correctly.

**Root Cause:** Only updating `lockedTarget` mesh position, not telling camera where to look.

**Solution:** Call `this.camera.setTarget(pawn.position)` every frame during movement.

---

## The `isMoving` Flag

This boolean flag is critical for coordinating camera behavior:

| When | Value | Effect |
|------|-------|--------|
| Movement starts | `true` | Blocks `updateCameraFollow()` from interfering |
| Movement ends | `false` | Allows smooth transitions to work |

**Set in:** `movePawn()` method  
**Checked in:** `updateCameraFollow()` method

---

## Debug Logging

The following console logs help debug camera issues:

```
[CAMERA] Created follow target at: (position)
[CAMERA] Camera offset: (offset vector)
[CAMERA] Frame X pawn: (pos) camera: (pos)    <- Every 60 frames during movement
[CAMERA] Movement complete
[CAMERA] Locked to final tile at position X
[CAMERA] updateCameraFollow called for tile X isMoving: true/false
[CAMERA] Starting smooth transition from (pos) to (pos)
[CAMERA] Smooth transition complete to tile X
[CAMERA] Transition aborted - movement started
```

---

## File Locations

- **Camera setup:** `board-scene.ts` → `setupScene()` method (~line 85-95)
- **Movement following:** `board-scene.ts` → `movePawn()` method (~line 713-850)
- **Player switching:** `board-scene.ts` → `updateCameraFollow()` method (~line 436-510)
- **Highlight trigger:** `board-scene.ts` → `highlightCurrentTile()` → calls `updateCameraFollow()`

---

## Future Recommendations

1. **Remove debug logs** once camera is stable to reduce console noise
2. **Consider adding camera shake** for special events (landing on special tiles)
3. **Test with 4+ players** to ensure transitions work across larger board distances
4. **Add camera bounds** to prevent camera from going outside the game world

---

## Summary

The camera system uses two separate mechanisms:
1. **Direct position control** during pawn movement (before-render observer in `movePawn`)
2. **Animated transitions** when switching players (before-render observer in `updateCameraFollow`)

The `isMoving` flag ensures these two systems don't conflict with each other.
