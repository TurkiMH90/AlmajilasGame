# 3D Character Implementation System

This document outlines the technical implementation of 3D characters in the Majlis Game. The system is designed to robustly handle diverse 3D models from different sources by normalizing their size, position, and materials at runtime.

---

## 📋 Guidelines for 3D Designers/Animators

> **If you're creating new characters for this game, follow these guidelines to ensure easy integration.**

### ✅ Do's (Best Practices)

| Requirement | Details |
|-------------|---------|
| **Single Root Node** | Export the model with a single root node that parents ALL meshes. This allows us to manipulate the entire character by moving just the root. |
| **Origin at Feet** | Position the model so the origin (0,0,0) is at the character's feet, centered horizontally. |
| **Facing +Z or -Z** | Orient the character facing forward along the Z-axis (positive or negative). |
| **Upright Orientation** | Export the character standing upright (head up, feet down). Avoid exporting lying down or sideways. |
| **Reasonable Scale** | Use metric scale (1 unit = 1 meter). A typical character should be ~1.5-2.0 units tall. |
| **Opaque Materials** | Use fully opaque materials. Avoid unnecessary transparency on body parts. |
| **GLB Format** | Export as `.glb` (binary glTF) for optimal loading. |
| **Baked Transforms** | Apply all transforms (location, rotation, scale) before exporting so the model's local transform is identity. |

### ❌ Don'ts (Common Problems)

| Issue | Why It's a Problem |
|-------|-------------------|
| **Multiple independent root meshes** | Our code parents the root node; orphaned meshes will float separately (causes fragmentation). |
| **Origin far from model** | The character will appear offset from its tile position on the game board. |
| **Exported lying down (Z-up)** | Requires manual rotation correction in code. |
| **Transparency on body** | Characters appear ghostly; we force opacity but it can cause visual artifacts. |
| **Extremely large/small scale** | Auto-scaling handles this, but extreme values can cause precision issues. |

### 📁 File Delivery Checklist

```
✓ Character model: [name].glb
✓ Portrait image: [name]_portrait.png (256x256, transparent background)
✓ Character height: 1.5-2.0 meters in file
✓ Single root node hierarchy
✓ Origin at feet, facing Z-axis
✓ All transforms applied/baked
```

---

## 1. Data Structure & Configuration
**File:** [`src/ui/selection-screen.ts`](../ui/selection-screen.ts)

Characters are defined in the `AVAILABLE_CHARACTERS` array. This configuration acts as the "source of truth" for what models to load and how to initially orient them.

```typescript
const AVAILABLE_CHARACTERS = [
  { 
    name: 'Amy Rose', 
    file: 'amy_rose.glb',        // Filename in /public/character/
    color: '#FF69B4',            // Fallback color for UI
    rotX: -Math.PI / 2,          // X rotation (to stand upright if model is lying down)
    rotY: Math.PI,               // Y rotation (to face camera - optional)
    portrait: '/portraits/...'   // 2D UI asset
  },
  // ...
];
```

### Adding a New Character

1. Place the `.glb` file in `/public/character/`
2. Place the portrait in `/public/portraits/`
3. Add an entry to `AVAILABLE_CHARACTERS`:
   - `name`: Display name
   - `file`: Filename only (not path)
   - `color`: Hex color for fallback/UI
   - `rotX`: Usually `0` if upright, `-Math.PI/2` if exported lying down
   - `rotY`: Usually `0` if facing camera, `Math.PI` if facing away
   - `portrait`: Path to portrait image

---

## 2. The Loading & Normalization Pipeline
**Files:** 
- [`src/babylon/board-scene.ts`](../babylon/board-scene.ts) (game board)
- [`src/ui/selection-screen.ts`](../ui/selection-screen.ts) (selection preview)

The core logic resides in the `createPawn` method (board scene) and `loadCharacterModel` method (selection screen). Since external 3D assets often have inconsistent scales, pivots, and material settings, we run them through a normalization pipeline.

### Step 1: Import & Parent
We use Babylon.js's `SceneLoader.ImportMesh` to load the `.glb` file asynchronously, then parent all meshes to our character node.

```typescript
meshes.forEach((mesh) => {
  mesh.parent = pawn;
});
```

> **Important:** We do NOT modify individual mesh positions. Many models have complex internal hierarchies (e.g., head attached to body via skeleton). Modifying mesh positions can break these relationships and cause body parts to detach.

### Step 2: Material Standardization
**Problem:** Models often import with transparency enabled by default, causing "ghostly" or see-through characters.
**Solution:** We iterate through every material and force it to be opaque.

```typescript
if (mesh.material) {
  mesh.material.alpha = 1.0;                     // 100% Opacity
  (mesh.material as any).transparencyMode = 0;   // Force OPAQUE mode
  mesh.material.backFaceCulling = false;         // Render both sides
}
```

### Step 3: Auto-Scaling
**Problem:** One model might be 100 units tall (meters), another might be 0.1 units (centimeters).
**Solution:** We calculate the world-space bounding box of the loaded model and scale it to fit a target size (2.0 world units).

```typescript
const height = maxY - minY;
const scale = targetSize / height;
pawn.scaling = new Vector3(scale, scale, scale);
```

### Step 4: Ground Positioning
After scaling, we recalculate the lowest point of the model in world space and adjust the Y position so the character's feet touch the ground.

```typescript
let minY_final = Infinity;
meshes.forEach((mesh) => {
  const bb = mesh.getBoundingInfo().boundingBox;
  minY_final = Math.min(minY_final, bb.minimumWorld.y);
});
pawn.position.y = -minY_final + 0.1;
```

---

## 3. Handling Complex Models (e.g., Amy Rose)

Some models have complex internal hierarchies that break when we parent all meshes individually. For these models, we use a special handling approach:

### The Problem
When parenting each mesh to our character node individually, the model's internal hierarchy (parent-child relationships between meshes like head→body→legs) is lost. This causes body parts to appear detached.

### The Solution
1. **Only parent top-level meshes** - Find meshes without parents and parent only those to our rotation node.
2. **Create an intermediate rotation node** - For models that need additional rotation (like facing forward), we create a `TransformNode` between our character and the model's root.

```typescript
if (needsSpecialHandling && meshes.length > 0) {
  // Create intermediate node for rotation
  const rotationNode = new TransformNode(`rotation_node_${index}`, scene);
  rotationNode.parent = parent;
  rotationNode.rotation.y = Math.PI; // 180 degrees to face camera
  
  // Parent all top-level meshes
  meshes.forEach(mesh => {
    if (!mesh.parent) {
      mesh.parent = rotationNode;
    }
  });
}
```

### Lesson Learned
> **Do NOT modify individual mesh positions.** If a character's body parts appear detached, the solution is to preserve the model's internal hierarchy, not to try "recentering" the meshes. The original attempt to calculate and subtract a centroid from each mesh position caused fragmentation.

---

## 4. Movement System
**File:** [`src/babylon/board-scene.ts`](../babylon/board-scene.ts) (`movePawn`)

Movement is tile-based.
1.  **Tiles:** The board is a linear array of 50 `MeshBuilder.CreateBox` objects.
2.  **Positioning:** We don't use physics. We simply pick the target tile's position.
3.  **Offset:** If multiple players are on the same tile, we apply a small radial offset (`getPawnOffset`) so they don't clip into each other.
4.  **Animation:** We create a `BABYLON.Animation` to interpolate the position from Tile A to Tile B smoothly.

```typescript
const moveAnim = new Animation(..., "position", ...);
// Keys: 
// Frame 0: Current Position
// Frame 20: Next Tile Position (with offset)
```

---

## 5. Known Issues & Workarounds

| Character | Issue | Workaround | Status |
|-----------|-------|------------|--------|
| Amy Rose | Fragmented when parenting normally | Use special handling: parent only root node | ✅ Fixed |
| Amy W (Werehog Amy) | Very large model, fragmented parts | Custom scale (0.1), special handling attempted | ⚠️ Partial - some fragments remain |

### Future Improvements
- Consider using armature/skeleton transforms if available
- Detect model hierarchy complexity automatically
- Add per-model scale override in config






radius: 24.0, heightOffset: 8.0, rotationOffset: 190.0