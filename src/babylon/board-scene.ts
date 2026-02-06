import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Animation } from '@babylonjs/core/Animations/animation';
import { EasingFunction, CubicEase } from '@babylonjs/core/Animations/easing';
import { Animatable } from '@babylonjs/core/Animations/animatable';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Animations/animatable';
import { TileType } from '../core/constants';
import { GameState as GameStateType } from '../core/game-state';
import { getCharacterRotation } from '../core/character-config';

/**
 * BoardScene - 3D board with 50 tiles arranged in a linear path on mansion map
 * Camera follows the active player character
 * Handles pawn movement animation and tile visualization
 */

export class BoardScene {
  public scene: Scene;
  private engine: Engine;
  private camera!: FollowCamera;
  private tiles: any[] = [];
  private tileGlows: any[] = []; // Glow meshes for current tile highlight
  private startTileMarker: any = null; // Special marker for tile 0

  // Multi-pawn support
  private pawns: Map<number, any> = new Map(); // Map playerId -> pawn mesh
  private pawnShadows: Map<number, any> = new Map();
  private pawnBodies: Map<number, any> = new Map();

  private shadowGenerator: ShadowGenerator | null = null;
  private mainLight: DirectionalLight | null = null;
  private idleAnimations: Map<number, Animatable | null> = new Map();

  private onDiceRoll: () => void;
  private onPawnMoveComplete: () => void;
  private currentAnimation: Animatable | null = null;
  private activePlayerId: number = -1; // Track current active player for highlight
  private currentTileIndex: number = 0; // Track current tile for camera zoom
  private isMapView: boolean = false; // Track if camera is in map view mode
  private mapViewButton: HTMLButtonElement | null = null; // View map button reference
  private savedCameraTarget: any = null; // Store camera target when switching to map view
  private presetButtons: HTMLButtonElement[] = []; // Camera preset buttons

  // Arabian theme decorations
  private palmTrees: any[] = [];
  private buildings: any[] = [];
  private waterPlane: any = null;

  // 3D Dice system
  private diceNode: TransformNode | null = null;
  private diceMeshes: Mesh[] = [];
  private diceSpinning: boolean = false;
  private diceSpinSpeed: number = 0;
  private targetDiceResult: number = 1;
  private diceGlow: Mesh | null = null;
  private diceResolve: (() => void) | null = null;

  // Tile Editor system
  private tileEditMode: boolean = false;
  private selectedTileIndex: number = -1;
  private tileEditorPanel: HTMLDivElement | null = null;
  private isDraggingTile: boolean = false;
  private dragPlane: Mesh | null = null;

  constructor(engine: Engine, onDiceRoll: () => void, onPawnMoveComplete: () => void) {
    this.engine = engine;
    this.onDiceRoll = onDiceRoll;
    this.onPawnMoveComplete = onPawnMoveComplete;
    this.scene = new Scene(engine);
    this.setupScene();
  }

  /**
   * Setup the 3D scene with clean, low-poly board game aesthetic
   */
  private setupScene(): void {
    // Clean neutral background - soft blue-grey (calming, not distracting)
    this.scene.clearColor = new Color4(0.85, 0.88, 0.92, 1.0);

    // FollowCamera for character following
    this.camera = new FollowCamera('camera', new Vector3(0, 5, -10), this.scene);
    this.camera.radius = 18; // Distance from target (increased for wider view)
    this.camera.heightOffset = 15; // Height above target (higher for isometric-like view)
    this.camera.rotationOffset = 180; // Follow from behind
    this.camera.cameraAcceleration = 0.05; // Smooth acceleration
    this.camera.maxCameraSpeed = 20; // Maximum speed

    this.scene.activeCamera = this.camera;
    this.camera.setTarget(Vector3.Zero());

    // Clean, soft lighting (friendly atmosphere)
    // Main light - soft directional from above-front
    this.mainLight = new DirectionalLight('dirLight', new Vector3(-0.3, -1, -0.5), this.scene);
    this.mainLight.intensity = 0.8;
    this.mainLight.position = new Vector3(10, 20, 10);
    this.mainLight.diffuse = new Color3(1.0, 1.0, 0.98); // Slightly warm white

    // Soft ambient for fill
    this.scene.ambientColor = new Color3(0.3, 0.3, 0.35);

    // Hemispheric fill light (sky above, soft ground bounce)
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new Color3(0.95, 0.95, 1.0);   // Cool white from sky
    hemiLight.groundColor = new Color3(0.4, 0.4, 0.45); // Neutral ground bounce

    // Soft shadows (mobile-safe, 512px resolution)
    try {
      if (this.mainLight) {
        this.shadowGenerator = new ShadowGenerator(512, this.mainLight);
        try {
          this.shadowGenerator.useBlurExponentialShadowMap = true;
          this.shadowGenerator.blurKernel = 8; // Soft but performant
        } catch (e) {
          console.warn('Soft shadows not available');
        }
        this.shadowGenerator.setDarkness(0.25); // Light shadows for playful feel
        this.shadowGenerator.bias = 0.00001;
      }
    } catch (e) {
      console.warn('Shadow generator not available:', e);
      this.shadowGenerator = null;
    }

    try {
      // Load mansion map
      this.loadMansionMap();

      // Create 50 tiles in linear path
      this.createTiles();

      // Pawns are created later via updatePawnPositions

      // Create view map button
      this.createViewMapButton();

      // Create camera preset buttons
      // this.createCameraPresetButtons(); // Removed: integrated into Dev Tools

      // Setup input
      this.setupInput();

      console.log('Linear Board Scene ready! Tiles:', this.tiles.length);
    } catch (error) {
      console.error('Error setting up scene:', error);
      throw error;
    }
  }

  /**
   * Load the mansion map as the base environment
   */
  private loadMansionMap(): void {
    SceneLoader.ImportMesh(
      '',
      '/models/',
      'mansion_map.glb',
      this.scene,
      (meshes) => {
        console.log('Mansion map loaded successfully');
        meshes.forEach((mesh) => {
          // Enable shadows on mansion map
          if (mesh instanceof Mesh) {
            mesh.receiveShadows = true;
          }
        });
      },
      null,
      (scene, message, exception) => {
        console.error('Failed to load mansion map:', message, exception);
      }
    );
  }

  /**
   * Create neutral base platform beneath the board
   */
  private createBasePlatform(): void {
    // Main floor - darker than tiles for contrast
    const floor = MeshBuilder.CreateBox('basePlatform', {
      width: 22,
      height: 0.3,
      depth: 22
    }, this.scene);
    floor.position.y = -0.25;

    const floorMat = new StandardMaterial('floor_mat', this.scene);
    floorMat.diffuseColor = new Color3(0.25, 0.28, 0.32); // Dark grey-blue
    floorMat.specularColor = new Color3(0.1, 0.1, 0.1);
    floor.material = floorMat;
    floor.receiveShadows = true;

    // Subtle border/frame around the board
    const borderThickness = 0.4;
    const borderHeight = 0.15;
    const boardSize = 20;

    const borderMat = new StandardMaterial('border_mat', this.scene);
    borderMat.diffuseColor = new Color3(0.35, 0.38, 0.42); // Slightly lighter grey

    // Four border segments
    const borders = [
      { w: boardSize + borderThickness * 2, d: borderThickness, x: 0, z: boardSize / 2 + borderThickness / 2 },
      { w: boardSize + borderThickness * 2, d: borderThickness, x: 0, z: -boardSize / 2 - borderThickness / 2 },
      { w: borderThickness, d: boardSize, x: boardSize / 2 + borderThickness / 2, z: 0 },
      { w: borderThickness, d: boardSize, x: -boardSize / 2 - borderThickness / 2, z: 0 },
    ];

    borders.forEach((b, i) => {
      const border = MeshBuilder.CreateBox(`border_${i}`, {
        width: b.w,
        height: borderHeight,
        depth: b.d
      }, this.scene);
      border.position = new Vector3(b.x, 0.05, b.z);
      border.material = borderMat;
    });
  }

  /**
   * Create 50 tiles along a custom path through the garden and mansion
   */
  private createTiles(): void {
    const tileSize = 0.9;
    const tileHeight = 0.15;
    const tileY = 0.5; // Height above ground

    // Custom tile path - positioned along garden walkways and through mansion
    const customPath: { x: number, z: number }[] = [
      { x: -45, z: -40 },
      { x: -37.8, z: -40 },
      { x: -30.6, z: -40 },
      { x: -23.4, z: -40 },
      { x: -16.2, z: -40 },
      { x: -9, z: -40 },
      { x: -1.8, z: -41 },
      { x: 2.4, z: -46 },
      { x: 5.6, z: -40 },
      { x: 5.8, z: -35 },
      { x: 6, z: -30 },
      { x: 6.2, z: -25 },
      { x: 4.4, z: -20 },
      { x: 4, z: -6.4 },
      { x: 0, z: -1.2 },
      { x: 0, z: 6 },
      { x: 0, z: 13.2 },
      { x: 7, z: 13.4 },
      { x: 7, z: 19.6 },
      { x: 7, z: 26.8 },
      { x: 7, z: 31 },
      { x: 15, z: 30.2 },
      { x: 15, z: 36.4 },
      { x: 7, z: 35.6 },
      { x: 0, z: 35.8 },
      { x: 0, z: 29 },
      { x: -5.2, z: 24 },
      { x: -5.4, z: 17 },
      { x: -11.6, z: 13 },
      { x: -18.8, z: 13 },
      { x: -26, z: 13 },
      { x: -33.2, z: 13 },
      { x: -38.4, z: 13 },
      { x: -43.6, z: 13 },
      { x: -47.8, z: 13 },
      { x: -54, z: 11 },
      { x: -54.2, z: 5 },
      { x: -59.4, z: -1 },
      { x: -66, z: -2.6 },
      { x: -74, z: -2.8 },
      { x: -74, z: -8 },
      { x: -74, z: -13.2 },
      { x: -74, z: -17.4 },
      { x: -74, z: -22.6 },
      { x: -67, z: -22.8 },
      { x: -60, z: -25 },
      { x: -60, z: -13.2 },
      { x: -53, z: -13.4 },
      { x: -46, z: -13.6 },
      { x: -39, z: -13.8 },
    ];

    const positions = customPath;

    // Create tiles at calculated positions
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];

      const tile = MeshBuilder.CreateBox(`tile_${i}`, {
        width: tileSize,
        height: tileHeight,
        depth: tileSize
      }, this.scene);

      tile.position = new Vector3(pos.x, tileY, pos.z);

      try {
        if (this.shadowGenerator) {
          this.shadowGenerator.addShadowCaster(tile);
        }
      } catch (e) { }

      const material = new StandardMaterial(`tile_mat_${i}`, this.scene);
      material.diffuseColor = new Color3(0.5, 0.5, 0.5);
      material.specularColor = new Color3(0.15, 0.15, 0.15);
      material.roughness = 0.7;
      tile.material = material;
      tile.isPickable = true; // Enable picking for tile editor

      const glowSize = tileSize * 1.15;
      const glow = MeshBuilder.CreateBox(`tile_glow_${i}`, {
        width: glowSize,
        height: tileHeight * 0.1,
        depth: glowSize
      }, this.scene);
      glow.position = new Vector3(pos.x, tileY + tileHeight * 0.6, pos.z);

      const glowMaterial = new StandardMaterial(`glow_mat_${i}`, this.scene);
      glowMaterial.emissiveColor = new Color3(1, 1, 0.5);
      glowMaterial.diffuseColor = new Color3(1, 1, 0.5);
      glowMaterial.alpha = 0;
      glow.material = glowMaterial;
      this.tileGlows.push(glow);

      if (i === 0) {
        this.createStartTileMarker(pos.x, tileY + tileHeight * 0.6, pos.z);
      }

      this.tiles.push(tile);
    }
  }

  private createStartTileMarker(x: number, y: number, z: number): void {
    this.startTileMarker = new TransformNode('start_marker', this.scene);
    this.startTileMarker.position = new Vector3(x, y, z);
    const markerMat = new StandardMaterial('start_mat', this.scene);
    markerMat.diffuseColor = new Color3(1.0, 0.98, 0.9);
    markerMat.emissiveColor = new Color3(0.2, 0.2, 0.18);
    const star = MeshBuilder.CreateCylinder('start_star', {
      diameterTop: 0, diameterBottom: 0.5, height: 0.4, tessellation: 4
    }, this.scene);
    star.position.y = 0.5;
    star.rotation.y = Math.PI / 4;
    star.parent = this.startTileMarker;
    star.material = markerMat;
    const pole = MeshBuilder.CreateCylinder('start_pole', {
      diameter: 0.08, height: 0.4, tessellation: 8
    }, this.scene);
    pole.position.y = 0.2;
    pole.parent = this.startTileMarker;
    const poleMat = new StandardMaterial('pole_mat', this.scene);
    poleMat.diffuseColor = new Color3(0.5, 0.5, 0.55);
    pole.material = poleMat;
    let floatPhase = 0;
    const floatAnim = () => {
      floatPhase += 0.03;
      star.position.y = 0.5 + Math.sin(floatPhase) * 0.08;
      star.rotation.y += 0.01;
      requestAnimationFrame(floatAnim);
    };
    floatAnim();
    try {
      if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(star);
        this.shadowGenerator.addShadowCaster(pole);
      }
    } catch (e) { }
  }

  updateTiles(gameState: GameStateType): void {
    gameState.tiles.forEach((tile, index) => {
      const mesh = this.tiles[index];
      if (!mesh) return;
      const material = mesh.material as StandardMaterial;
      switch (tile.type) {
        case TileType.GREEN:
          material.diffuseColor = new Color3(0.4, 0.75, 0.45);
          material.emissiveColor = new Color3(0.05, 0.12, 0.05);
          break;
        case TileType.RED:
          material.diffuseColor = new Color3(0.85, 0.4, 0.4);
          material.emissiveColor = new Color3(0.12, 0.05, 0.05);
          break;
        case TileType.YELLOW:
          material.diffuseColor = new Color3(0.95, 0.8, 0.35);
          material.emissiveColor = new Color3(0.15, 0.12, 0.04);
          break;
        case TileType.BLUE:
          material.diffuseColor = new Color3(0.4, 0.65, 0.9);
          material.emissiveColor = new Color3(0.05, 0.08, 0.15);
          break;
      }
    });
    // Highlight active player's pawn location? No, individual pawn highlights handled elsewhere.
    // Just highlights tile glow.
    // Use first player or active player?
    // Let's rely on updatePawnPositions to handle highlights?
    // Or we keep tile highlighting for the "camera focused" tile.
    const activePlayer = gameState.players[gameState.currentPlayerIndex];
    if (activePlayer) {
      this.highlightCurrentTile(activePlayer.pawnPosition);
    }
  }

  private highlightCurrentTile(position: number): void {
    this.tiles.forEach((tile, index) => {
      const glow = this.tileGlows[index];
      if (!glow) return;
      if (index === position) {
        tile.position.y = 0.55; // Slightly raised
        const glowMaterial = glow.material as StandardMaterial;
        glowMaterial.alpha = 0.6;
        glow.position.y = tile.position.y + 0.12;
        this.updateCameraFollow(position);
      } else {
        tile.position.y = 0.5; // Normal height
        const glowMaterial = glow.material as StandardMaterial;
        glowMaterial.alpha = 0;
      }
    });
  }

  /**
   * Update camera to follow the character at the given tile position
   */
  private updateCameraFollow(tileIndex: number): void {
    if (!this.camera || tileIndex < 0 || tileIndex >= this.tiles.length) return;
    const tile = this.tiles[tileIndex];
    if (!tile) return;

    // Set camera to follow the tile position
    this.camera.lockedTarget = tile;
  }



  updatePawnPositions(players: any[]): void {
    players.forEach(player => {
      if (!this.pawns.has(player.id)) {
        this.createPawn(player.id, player.characterModel);
      }
      const pawn = this.pawns.get(player.id);
      if (pawn) {
        const tile = this.tiles[player.pawnPosition];
        if (tile) {
          const offset = this.getPawnOffset(player.id, players.length);
          // Only snap to position if not moving?
          // For now, snap, unless we want to interpolate.
          // But movePawn handles interpolation.
          // We should only snap if the distance is far (jump) or initialization.
          pawn.position = tile.position.clone().add(new Vector3(offset.x, 0.65, offset.z));

          // Update rotation to face board center based on tile position
          pawn.rotation.y = this.getRotationForTile(player.pawnPosition);
        }
      }
    });
  }

  private getPawnOffset(playerId: number, totalPlayers: number): { x: number, z: number } {
    if (totalPlayers <= 1) return { x: 0, z: 0 };
    const radius = 0.25;
    const angle = (playerId / totalPlayers) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  /**
   * Calculate Y rotation for character in linear path
   * @param tileIndex - The tile index (0-49)
   * @returns Y rotation in radians (always 0 for linear path - facing forward)
   */
  private getRotationForTile(tileIndex: number): number {
    // In linear layout, all characters face forward along +Z axis
    return 0;
  }

  private createPawn(playerId: number, modelPath: string): void {
    const pawn = new TransformNode(`character_${playerId}`, this.scene);
    this.pawns.set(playerId, pawn);

    const pawnShadow = MeshBuilder.CreateDisc(`pawn_shadow_${playerId}`, { radius: 0.5, tessellation: 16 }, this.scene);
    pawnShadow.rotation.x = Math.PI / 2;
    pawnShadow.position.y = 0.02;
    pawnShadow.parent = pawn;
    this.pawnShadows.set(playerId, pawnShadow);

    const shadowMat = new StandardMaterial(`shadow_mat_${playerId}`, this.scene);
    shadowMat.diffuseColor = Color3.Black();
    shadowMat.alpha = 0.25;
    pawnShadow.material = shadowMat;

    const filename = modelPath.split('/').pop() || 'character.glb';

    SceneLoader.ImportMesh(
      '',
      '/character/',
      filename,
      this.scene,
      (meshes) => {
        if (meshes.length === 0) {
          this.createFallbackPawn(playerId);
          return;
        }

        // SPECIAL CASE: Some models have complex hierarchies - only parent the root node
        // to preserve the internal mesh relationships
        const isAmyRose = filename === 'amy_rose.glb';
        const isAmyW = filename === 'werehog_amy_rose.glb';
        const needsSpecialHandling = isAmyRose || isAmyW;

        if (needsSpecialHandling && meshes.length > 0) {
          // Create an intermediate rotation node for Amy Rose
          const rotationNode = new TransformNode(`rotation_node_${playerId}`, this.scene);
          rotationNode.parent = pawn;
          // No Y rotation - Amy should face forward along the board path

          // Find the root node and parent it to our rotation node
          const rootNode = meshes.find(m => m.name.includes('__root__')) || meshes[0];
          rootNode.parent = rotationNode;

          // Fix materials and shadows on all meshes
          meshes.forEach((mesh) => {
            if (mesh.material) {
              mesh.material.alpha = 1.0;
              if ('transparencyMode' in mesh.material) {
                (mesh.material as any).transparencyMode = 0;
              }
              mesh.material.backFaceCulling = false;
            }
            try {
              if (this.shadowGenerator && mesh instanceof Mesh) this.shadowGenerator.addShadowCaster(mesh);
            } catch (e) { }
          });
        } else {
          // Normal handling: Parent all meshes directly
          meshes.forEach((mesh) => {
            mesh.parent = pawn;
            if (mesh.material) {
              mesh.material.alpha = 1.0;
              if ('transparencyMode' in mesh.material) {
                (mesh.material as any).transparencyMode = 0;
              }
              mesh.material.backFaceCulling = false;
            }
            try {
              if (this.shadowGenerator && mesh instanceof Mesh) this.shadowGenerator.addShadowCaster(mesh);
            } catch (e) { }
          });
        }

        // STEP 2: Apply per-character rotation (skip for special handling - done via rotationNode)
        if (!needsSpecialHandling) {
          pawn.rotation.x = getCharacterRotation(filename);
          pawn.rotation.y = 0;
        }

        // STEP 3: Force world matrix update
        pawn.computeWorldMatrix(true);
        meshes.forEach((mesh) => {
          mesh.computeWorldMatrix(true);
          mesh.refreshBoundingInfo();
        });

        // STEP 4: Calculate world-space bounds for scaling
        let minY = Infinity, maxY = -Infinity;
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        meshes.forEach((mesh) => {
          const bb = mesh.getBoundingInfo().boundingBox;
          minY = Math.min(minY, bb.minimumWorld.y);
          maxY = Math.max(maxY, bb.maximumWorld.y);
          minX = Math.min(minX, bb.minimumWorld.x);
          maxX = Math.max(maxX, bb.maximumWorld.x);
          minZ = Math.min(minZ, bb.minimumWorld.z);
          maxZ = Math.max(maxZ, bb.maximumWorld.z);
        });

        // STEP 5: Scale to target size
        const height = maxY - minY;
        const width = Math.max(maxX - minX, maxZ - minZ);
        const maxDim = Math.max(height, width);
        const targetSize = 2.0;
        const scale = targetSize / Math.max(maxDim, 0.001);
        pawn.scaling = new Vector3(scale, scale, scale);

        // STEP 6: Update matrices after scaling
        pawn.computeWorldMatrix(true);
        meshes.forEach((mesh) => {
          mesh.computeWorldMatrix(true);
          mesh.refreshBoundingInfo();
        });

        // STEP 7: Recalculate minY after scaling and position so feet touch ground
        let minY_final = Infinity;
        meshes.forEach((mesh) => {
          const bb = mesh.getBoundingInfo().boundingBox;
          minY_final = Math.min(minY_final, bb.minimumWorld.y);
        });

        pawn.position.y = -minY_final + 0.1;

        console.log(`Character ${playerId} loaded: ${filename}, scale=${scale.toFixed(4)}, posY=${pawn.position.y.toFixed(2)}`);

        this.startIdleAnimation(playerId);
      },
      null,
      (scene, message) => {
        console.warn(`Failed to load ${filename}, using fallback.`);
        this.createFallbackPawn(playerId);
      }
    );

  }

  private createFallbackPawn(playerId: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    const box = MeshBuilder.CreateBox(`fallback_body_${playerId}`, { size: 0.5 }, this.scene);
    box.parent = pawn;
    box.position.y = 0.25;
    const mat = new StandardMaterial(`fallback_mat_${playerId}`, this.scene);
    const colors = [Color3.Red(), Color3.Blue(), Color3.Green(), Color3.Yellow()];
    mat.diffuseColor = colors[playerId % colors.length];
    box.material = mat;
    this.pawnBodies.set(playerId, { root: pawn, body: box });
    this.startIdleAnimation(playerId);
  }

  private startIdleAnimation(playerId: number): void {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;
    // Idle logic
  }

  setActiveTurn(active: boolean): void {
    // Highlight logic
  }

  /**
   * Reactivate the board scene (called when switching back from minigame)
   */
  reactivate(): void {
    if (this.camera) {
      this.scene.activeCamera = this.camera;
    }
  }

  async movePawn(playerId: number, startPosition: number, steps: number, gameState?: GameStateType): Promise<void> {
    const pawn = this.pawns.get(playerId);
    if (!pawn) return;

    // Set camera to follow this pawn
    if (this.camera) {
      this.camera.lockedTarget = pawn;
    }

    return new Promise((resolve) => {
      let currentPos = startPosition;
      let stepsMoved = 0;
      const numPlayers = this.pawns.size;
      const offset = this.getPawnOffset(playerId, numPlayers);

      const moveStep = () => {
        if (stepsMoved >= steps) {
          resolve();
          return;
        }
        const nextPos = (currentPos + 1) % 50;
        const nextTileMesh = this.tiles[nextPos];
        if (!nextTileMesh) {
          resolve();
          return;
        }
        const targetPos = nextTileMesh.position.clone().add(new Vector3(offset.x, 0.65, offset.z));
        const startPos = pawn.position.clone();

        // Create animation for position
        const moveAnim = new Animation(
          'moveAnim',
          'position',
          60,
          Animation.ANIMATIONTYPE_VECTOR3,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
          { frame: 0, value: startPos },
          { frame: 20, value: targetPos }
        ];
        moveAnim.setKeys(keys);

        // Apply easing
        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        moveAnim.setEasingFunction(ease);

        pawn.animations = [moveAnim];

        this.scene.beginAnimation(pawn, 0, 20, false, 1, () => {
          stepsMoved++;
          currentPos = nextPos;
          // Keep facing forward (rotation already set to 0)
          pawn.rotation.y = this.getRotationForTile(currentPos);
          moveStep();
        });
      };
      moveStep(); // Start moving
    });
  }

  /**
   * Create the View Map button
   */
  private createViewMapButton(): void {
    const button = document.createElement('button');
    button.id = 'view-map-button';
    button.textContent = 'عرض الخريطة';
    button.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      font-family: 'Cairo', Arial, sans-serif;
    `;

    button.onmouseenter = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
    };

    button.onmouseleave = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };

    button.onclick = () => {
      this.toggleMapView();
    };

    document.body.appendChild(button);
    this.mapViewButton = button;

    // Create Dev Tools Toggle Button (Icon)
    this.createDevToolsButton();

    // CAMERA ADJUSTMENT PANEL (Hidden by default)
    this.createCameraAdjustmentPanel();
  }

  /**
   * Create the floating Dev Tools icon button
   */
  private createDevToolsButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '🛠️';
    btn.title = 'Toggle Dev Tools';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px; /* Moved to Left to avoid Roll Button */
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      font-size: 24px;
      cursor: pointer;
      z-index: 2000;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.1) rotate(15deg)';
      btn.style.background = 'rgba(0, 0, 0, 0.9)';
      btn.style.boxShadow = '0 6px 15px rgba(0,0,0,0.5)';
      btn.style.borderColor = '#4ade80';
    };

    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1) rotate(0deg)';
      btn.style.background = 'rgba(0, 0, 0, 0.8)';
      btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    };

    btn.onclick = () => {
      this.toggleDevTools();
    };

    document.body.appendChild(btn);
  }

  /**
   * Toggle visibility of all dev tool panels
   */
  private toggleDevTools(): void {
    const cameraPanel = document.getElementById('camera-adjust-panel');
    const tileEditorPanel = document.getElementById('tile-editor-panel');

    // Check if currently visible
    const isVisible = cameraPanel ? cameraPanel.style.display !== 'none' : false;

    // Toggle state
    const newDisplay = isVisible ? 'none' : 'block';

    if (cameraPanel) cameraPanel.style.display = newDisplay;

    // For tile editor, we only show it if we are entering edit mode?
    // Or we just show the panel container if it was active?
    // Actually, let's toggle the camera panel visibility directly.
    // The tile editor panel is managed by toggleTileEditMode().
    // Let's add the Map View button and Test Victory button to the camera panel for centralization.

    console.log(`Dev Tools toggled: ${isVisible ? 'OFF' : 'ON'}`);
  }

  /**
   * Create a debug panel to adjust camera settings in real-time
   */
  private createCameraAdjustmentPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'camera-adjust-panel';
    panel.style.cssText = `
      position: fixed;
      top: 100px; /* Moved up slightly */
      right: 80px; /* Positioned near the toggle button */
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 12px;
      z-index: 1000;
      font-family: 'Cairo', Arial, sans-serif;
      min-width: 240px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: none; /* Hidden by default */
      max-height: 80vh;
      overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.textContent = '🛠️ Developer Tools';
    title.style.cssText = 'font-weight: bold; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px; color: #4ade80;';
    panel.appendChild(title);

    // --- General Debug Section ---
    const debugSection = document.createElement('div');
    debugSection.style.cssText = 'margin-bottom: 15px;';

    // Map View Button
    const mapBtn = document.createElement('button');
    mapBtn.textContent = '🗺️ Toggle Map View';
    mapBtn.style.cssText = 'width: 100%; margin-bottom: 8px; padding: 8px; background: #34495e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left;';
    mapBtn.onclick = () => this.toggleMapView();
    debugSection.appendChild(mapBtn);
    this.mapViewButton = mapBtn; // Store reference

    // Victory Test Button
    const victoryBtn = document.createElement('button');
    victoryBtn.textContent = '🏆 Test Victory Anim';
    victoryBtn.style.cssText = 'width: 100%; margin-bottom: 8px; padding: 8px; background: #8e44ad; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left;';
    victoryBtn.onclick = () => {
      const firstPlayerId = this.pawns.keys().next().value;
      if (firstPlayerId !== undefined) {
        console.log('Testing victory animation with player', firstPlayerId);
        this.playVictoryAnimation(firstPlayerId);
      }
    };
    debugSection.appendChild(victoryBtn);

    // Test Blue Tile Button
    const blueTileBtn = document.createElement('button');
    blueTileBtn.textContent = '🔵 Test Blue Tile (Minigame)';
    blueTileBtn.style.cssText = 'width: 100%; margin-bottom: 8px; padding: 8px; background: #2980b9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left;';
    blueTileBtn.onclick = () => {
      console.log('Testing Blue Tile minigame');
      // Dispatch custom event for main.ts to handle
      window.dispatchEvent(new CustomEvent('testBlueTile'));
    };
    debugSection.appendChild(blueTileBtn);

    panel.appendChild(debugSection);

    const cameraTitle = document.createElement('div');
    cameraTitle.textContent = '📷 Camera Settings';
    cameraTitle.style.cssText = 'font-weight: bold; margin: 10px 0 5px 0; font-size: 12px; color: #bdc3c7;';
    panel.appendChild(cameraTitle);

    // Camera Presets
    const presetsRow = document.createElement('div');
    presetsRow.style.cssText = 'display: flex; gap: 5px; margin-bottom: 10px;';

    const presets = [
      { label: 'Start', pos: 'start' },
      { label: 'Mid', pos: 'middle' },
      { label: 'End', pos: 'end' }
    ];

    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.label;
      btn.style.cssText = 'flex: 1; padding: 4px; background: #2c3e50; color: #ecf0f1; border: 1px solid #34495e; border-radius: 4px; cursor: pointer; font-size: 11px;';
      btn.onclick = () => this.jumpToPreset(p.pos as any);
      presetsRow.appendChild(btn);
    });
    panel.appendChild(presetsRow);

    // Helper to create adjustment row
    const createRow = (label: string, getValue: () => number, onChange: (delta: number) => void) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; margin: 8px 0; gap: 8px;';

      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      labelEl.style.cssText = 'flex: 1; font-size: 12px;';

      const valueEl = document.createElement('span');
      valueEl.style.cssText = 'width: 40px; text-align: center; font-weight: bold; font-family: monospace;';
      valueEl.textContent = getValue().toFixed(1);

      const minusBtn = document.createElement('button');
      minusBtn.textContent = '-';
      minusBtn.style.cssText = 'width: 24px; height: 24px; border: none; border-radius: 4px; background: #e74c3c; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;';
      minusBtn.onclick = () => {
        onChange(-2);
        valueEl.textContent = getValue().toFixed(1);
      };

      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.style.cssText = 'width: 24px; height: 24px; border: none; border-radius: 4px; background: #2ecc71; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;';
      plusBtn.onclick = () => {
        onChange(2);
        valueEl.textContent = getValue().toFixed(1);
      };

      row.appendChild(labelEl);
      row.appendChild(minusBtn);
      row.appendChild(valueEl);
      row.appendChild(plusBtn);
      return row;
    };

    // Radius (distance from character)
    panel.appendChild(createRow('Distance',
      () => this.camera.radius,
      (delta) => { this.camera.radius = Math.max(2, this.camera.radius + delta); }
    ));

    // Height offset
    panel.appendChild(createRow('Height',
      () => this.camera.heightOffset,
      (delta) => { this.camera.heightOffset += delta; }
    ));

    // Rotation offset
    panel.appendChild(createRow('Rotation',
      () => this.camera.rotationOffset,
      (delta) => { this.camera.rotationOffset += delta * 5; }
    ));

    // Print current values button
    const printBtn = document.createElement('button');
    printBtn.textContent = '📋 Copy Camera Values';
    printBtn.style.cssText = 'width: 100%; margin-top: 5px; padding: 6px; background: #2980b9; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 11px;';
    printBtn.onclick = () => {
      const values = `radius: ${this.camera.radius.toFixed(1)}, heightOffset: ${this.camera.heightOffset.toFixed(1)}, rotationOffset: ${this.camera.rotationOffset.toFixed(1)}`;
      console.log('Camera Settings:', values);
      navigator.clipboard.writeText(values).then(() => {
        printBtn.textContent = '✅ Copied!';
        setTimeout(() => printBtn.textContent = '📋 Copy Camera Values', 2000);
      });
    };
    panel.appendChild(printBtn);

    // Dice test section
    const diceSection = document.createElement('div');
    diceSection.style.cssText = 'margin-top: 15px; border-top: 1px solid #555; padding-top: 10px;';

    const diceTitle = document.createElement('div');
    diceTitle.textContent = '🎲 Test Dice Face';
    diceTitle.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #bdc3c7;';
    diceSection.appendChild(diceTitle);

    const diceButtonsRow = document.createElement('div');
    diceButtonsRow.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap;';

    for (let i = 1; i <= 6; i++) {
      const btn = document.createElement('button');
      btn.textContent = String(i);
      btn.style.cssText = 'width: 32px; height: 32px; background: #c0392b; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;';
      btn.onmouseenter = () => btn.style.background = '#e74c3c';
      btn.onmouseleave = () => btn.style.background = '#c0392b';
      btn.onclick = () => {
        console.log(`Testing dice face: ${i}`);
        this.testDiceFace(i);
      };
      diceButtonsRow.appendChild(btn);
    }

    diceSection.appendChild(diceButtonsRow);
    panel.appendChild(diceSection);

    // Tile Editor section
    const tileEditorSection = document.createElement('div');
    tileEditorSection.style.cssText = 'margin-top: 15px; border-top: 1px solid #555; padding-top: 10px;';

    const editTilesBtn = document.createElement('button');
    editTilesBtn.textContent = '🎯 Edit Tiles';
    editTilesBtn.style.cssText = 'width: 100%; padding: 10px; background: #d35400; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;';
    editTilesBtn.onmouseenter = () => editTilesBtn.style.background = '#e67e22';
    editTilesBtn.onmouseleave = () => editTilesBtn.style.background = '#d35400';
    editTilesBtn.onclick = () => this.toggleTileEditMode();
    tileEditorSection.appendChild(editTilesBtn);

    panel.appendChild(tileEditorSection);

    document.body.appendChild(panel);
  }

  /**
   * Test a specific dice face for visual verification
   */
  public testDiceFace(faceNumber: number): void {
    if (!this.diceNode) {
      this.loadDice();
      setTimeout(() => this.testDiceFace(faceNumber), 300);
      return;
    }

    // Position dice in view
    const activePawn = this.pawns.get(this.activePlayerId) || this.pawns.values().next().value;
    if (activePawn) {
      this.diceNode.position = new Vector3(activePawn.position.x, activePawn.position.y + 3, activePawn.position.z);
    } else {
      this.diceNode.position = new Vector3(0, 5, 0);
    }

    // Set rotation for requested face
    const targetRotation = this.getRotationForDiceResult(faceNumber);
    this.diceNode.rotation = targetRotation;
    this.diceNode.setEnabled(true);
    this.diceSpinning = false;

    console.log(`Dice set to face ${faceNumber} with rotation: (${targetRotation.x.toFixed(2)}, ${targetRotation.y.toFixed(2)}, ${targetRotation.z.toFixed(2)})`);
  }

  // ==================== TILE EDITOR SYSTEM ====================

  /**
   * Create the tile editor panel UI
   */
  private createTileEditorPanel(): void {
    this.tileEditorPanel = document.createElement('div');
    this.tileEditorPanel.id = 'tile-editor-panel';
    this.tileEditorPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 10px;
      z-index: 1000;
      font-family: 'Cairo', Arial, sans-serif;
      min-width: 280px;
      display: none;
    `;

    const title = document.createElement('div');
    title.textContent = '🎯 Tile Editor';
    title.style.cssText = 'font-weight: bold; margin-bottom: 10px; font-size: 16px; color: #f1c40f;';
    this.tileEditorPanel.appendChild(title);

    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <div style="font-size: 11px; margin-bottom: 8px; color: #bdc3c7;">
        Arrow keys to move selected tile<br>
        Hold Shift for larger moves
      </div>
    `;
    this.tileEditorPanel.appendChild(instructions);

    // Tile selector section
    const selectorSection = document.createElement('div');
    selectorSection.style.cssText = 'margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;';

    const selectorLabel = document.createElement('div');
    selectorLabel.textContent = 'Select Tile:';
    selectorLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px; color: #f1c40f;';
    selectorSection.appendChild(selectorLabel);

    const selectorRow = document.createElement('div');
    selectorRow.style.cssText = 'display: flex; align-items: center; gap: 5px;';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.style.cssText = 'width: 36px; height: 36px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;';
    prevBtn.onclick = () => {
      const newIndex = Math.max(0, this.selectedTileIndex - 1);
      this.selectTile(newIndex);
      (document.getElementById('tile-number-input') as HTMLInputElement).value = String(newIndex);
    };
    selectorRow.appendChild(prevBtn);

    // Number input
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.id = 'tile-number-input';
    numInput.min = '0';
    numInput.max = '49';
    numInput.value = '0';
    numInput.style.cssText = 'width: 60px; height: 30px; text-align: center; background: #2c3e50; color: white; border: 1px solid #3498db; border-radius: 5px; font-size: 14px;';
    numInput.onchange = () => {
      const index = Math.min(49, Math.max(0, parseInt(numInput.value) || 0));
      numInput.value = String(index);
      this.selectTile(index);
    };
    selectorRow.appendChild(numInput);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.style.cssText = 'width: 36px; height: 36px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;';
    nextBtn.onclick = () => {
      const newIndex = Math.min(49, this.selectedTileIndex + 1);
      this.selectTile(newIndex);
      (document.getElementById('tile-number-input') as HTMLInputElement).value = String(newIndex);
    };
    selectorRow.appendChild(nextBtn);

    // Go to tile button
    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.style.cssText = 'flex: 1; height: 36px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    goBtn.onclick = () => {
      const index = parseInt((document.getElementById('tile-number-input') as HTMLInputElement).value) || 0;
      this.selectTile(index);
      this.centerCameraOnTile(index);
    };
    selectorRow.appendChild(goBtn);

    selectorSection.appendChild(selectorRow);
    this.tileEditorPanel.appendChild(selectorSection);

    // Selected tile info
    const tileInfo = document.createElement('div');
    tileInfo.id = 'tile-info';
    tileInfo.style.cssText = 'margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; font-size: 12px;';
    tileInfo.textContent = 'No tile selected';
    this.tileEditorPanel.appendChild(tileInfo);

    // Movement controls section
    const moveSection = document.createElement('div');
    moveSection.style.cssText = 'margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;';

    const moveLabel = document.createElement('div');
    moveLabel.textContent = 'Move Tile:';
    moveLabel.style.cssText = 'font-size: 12px; margin-bottom: 8px; color: #f1c40f;';
    moveSection.appendChild(moveLabel);

    // Direction buttons grid
    const moveGrid = document.createElement('div');
    moveGrid.style.cssText = 'display: grid; grid-template-columns: 40px 40px 40px 40px; grid-gap: 4px; justify-content: center;';

    const createMoveBtn = (text: string, dx: number, dz: number) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = 'width: 40px; height: 32px; background: #9b59b6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
      btn.onclick = () => this.moveTile(dx, dz);
      return btn;
    };

    // Row 1: empty, up, empty, big up
    moveGrid.appendChild(document.createElement('span'));
    moveGrid.appendChild(createMoveBtn('↑', 0, 1));
    moveGrid.appendChild(document.createElement('span'));
    moveGrid.appendChild(createMoveBtn('⇑', 0, 5));

    // Row 2: left, empty, right, big right
    moveGrid.appendChild(createMoveBtn('←', -1, 0));
    moveGrid.appendChild(document.createElement('span'));
    moveGrid.appendChild(createMoveBtn('→', 1, 0));
    moveGrid.appendChild(createMoveBtn('⇒', 5, 0));

    // Row 3: empty, down, empty, big down
    moveGrid.appendChild(createMoveBtn('⇐', -5, 0));
    moveGrid.appendChild(createMoveBtn('↓', 0, -1));
    moveGrid.appendChild(document.createElement('span'));
    moveGrid.appendChild(createMoveBtn('⇓', 0, -5));

    moveSection.appendChild(moveGrid);
    this.tileEditorPanel.appendChild(moveSection);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📋 Export Path to Clipboard';
    exportBtn.style.cssText = 'width: 100%; margin-top: 10px; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    exportBtn.onclick = () => this.exportTilePath();
    this.tileEditorPanel.appendChild(exportBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌ Exit Edit Mode';
    closeBtn.style.cssText = 'width: 100%; margin-top: 8px; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    closeBtn.onclick = () => this.toggleTileEditMode();
    this.tileEditorPanel.appendChild(closeBtn);

    document.body.appendChild(this.tileEditorPanel);
  }

  /**
   * Toggle tile edit mode on/off
   */
  public toggleTileEditMode(): void {
    this.tileEditMode = !this.tileEditMode;

    if (!this.tileEditorPanel) {
      this.createTileEditorPanel();
    }

    if (this.tileEditMode) {
      this.tileEditorPanel!.style.display = 'block';
      this.setupTileEditorControls();
      this.highlightAllTiles(true);
      console.log('Tile Edit Mode: ON');

      if (!this.isMapView) {
        this.switchToMapView();
      }
    } else {
      this.tileEditorPanel!.style.display = 'none';
      this.deselectTile();
      this.highlightAllTiles(false);
      console.log('Tile Edit Mode: OFF');
    }
  }

  /**
   * Highlight all tiles to make them easier to see and click
   */
  private highlightAllTiles(highlight: boolean): void {
    this.tiles.forEach((tile) => {
      if (tile.material) {
        if (highlight) {
          tile.material.emissiveColor = new Color3(0.2, 0.2, 0.2);
          tile.material.alpha = 0.9;
        } else {
          tile.material.emissiveColor = new Color3(0, 0, 0);
          tile.material.alpha = 1;
        }
      }
    });
  }

  /**
   * Setup mouse and keyboard controls for tile editing
   */
  private setupTileEditorControls(): void {
    if (!this.dragPlane) {
      this.dragPlane = MeshBuilder.CreateGround('dragPlane', { width: 200, height: 200 }, this.scene);
      this.dragPlane.position.y = 0.5;
      this.dragPlane.isVisible = false;
      this.dragPlane.isPickable = false; // Don't interfere with tile picking
    }

    // Use canvas pointer events for reliable detection
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (evt) => {
      if (!this.tileEditMode) return;

      console.log(`Pointer down at: ${evt.offsetX}, ${evt.offsetY}`);

      // First, let's see what's under the cursor without filtering
      const debugPick = this.scene.pick(evt.offsetX, evt.offsetY);
      if (debugPick?.hit) {
        console.log(`DEBUG: Hit mesh: "${debugPick.pickedMesh?.name}"`);
      } else {
        console.log('DEBUG: No hit at all');
      }

      // Now try to pick tiles specifically
      const pickResult = this.scene.pick(evt.offsetX, evt.offsetY, (mesh) => {
        const isTile = mesh.name.startsWith('tile_') && !mesh.name.includes('glow');
        if (isTile) console.log(`  Checking mesh: ${mesh.name} - is tile: ${isTile}`);
        return isTile;
      });

      if (pickResult?.hit && pickResult.pickedMesh) {
        const meshName = pickResult.pickedMesh.name;
        const tileIndex = parseInt(meshName.split('_')[1]);
        console.log(`Clicked on tile ${tileIndex}`);
        this.selectTile(tileIndex);
        this.isDraggingTile = true;
      } else {
        console.log('No tile found under cursor - tiles may be blocked by other meshes');
      }
    });

    canvas.addEventListener('pointermove', (evt) => {
      if (!this.tileEditMode || !this.isDraggingTile || this.selectedTileIndex < 0) return;

      // Pick against ground plane for smooth dragging
      const pickResult = this.scene.pick(evt.offsetX, evt.offsetY, (mesh) => {
        return mesh.name === 'dragPlane' || mesh.name.startsWith('ground') || mesh.name.includes('Ground');
      });

      // Fallback: use a simple ray to plane intersection
      const ray = this.scene.createPickingRay(evt.offsetX, evt.offsetY, null, this.camera);
      const planeY = 0.5;
      const t = (planeY - ray.origin.y) / ray.direction.y;

      if (t > 0) {
        const hitX = ray.origin.x + ray.direction.x * t;
        const hitZ = ray.origin.z + ray.direction.z * t;

        const tile = this.tiles[this.selectedTileIndex];
        const glow = this.tileGlows[this.selectedTileIndex];

        tile.position.x = hitX;
        tile.position.z = hitZ;

        if (glow) {
          glow.position.x = hitX;
          glow.position.z = hitZ;
        }

        this.updateTileInfo();
      }
    });

    canvas.addEventListener('pointerup', () => {
      this.isDraggingTile = false;
    });

    window.addEventListener('keydown', (e) => this.handleTileEditorKeydown(e));
  }

  private handleTileEditorKeydown(e: KeyboardEvent): void {
    if (!this.tileEditMode || this.selectedTileIndex < 0) return;

    const moveAmount = e.shiftKey ? 1 : 0.5;
    const tile = this.tiles[this.selectedTileIndex];
    const glow = this.tileGlows[this.selectedTileIndex];

    switch (e.key) {
      case 'ArrowUp':
        tile.position.z += moveAmount;
        if (glow) glow.position.z += moveAmount;
        e.preventDefault();
        break;
      case 'ArrowDown':
        tile.position.z -= moveAmount;
        if (glow) glow.position.z -= moveAmount;
        e.preventDefault();
        break;
      case 'ArrowLeft':
        tile.position.x -= moveAmount;
        if (glow) glow.position.x -= moveAmount;
        e.preventDefault();
        break;
      case 'ArrowRight':
        tile.position.x += moveAmount;
        if (glow) glow.position.x += moveAmount;
        e.preventDefault();
        break;
      case 'Escape':
        this.deselectTile();
        break;
    }

    this.updateTileInfo();
  }

  private selectTile(index: number): void {
    if (this.selectedTileIndex >= 0) {
      const prevTile = this.tiles[this.selectedTileIndex];
      if (prevTile?.material) {
        prevTile.material.emissiveColor = new Color3(0.2, 0.2, 0.2);
      }
    }

    this.selectedTileIndex = index;
    const tile = this.tiles[index];

    if (tile?.material) {
      tile.material.emissiveColor = new Color3(0.5, 1, 0.5);
    }

    this.updateTileInfo();
    console.log(`Selected tile ${index}`);
  }

  /**
   * Center camera view on a specific tile
   */
  private centerCameraOnTile(index: number): void {
    if (index < 0 || index >= this.tiles.length) return;
    const tile = this.tiles[index];
    if (tile) {
      // For map view, just log the position - camera is already overhead
      console.log(`Tile ${index} is at position: X=${tile.position.x.toFixed(2)}, Z=${tile.position.z.toFixed(2)}`);
    }
  }

  /**
   * Move the selected tile by delta X and Z
   */
  private moveTile(dx: number, dz: number): void {
    if (this.selectedTileIndex < 0 || this.selectedTileIndex >= this.tiles.length) {
      console.log('No tile selected to move');
      return;
    }

    const tile = this.tiles[this.selectedTileIndex];
    const glow = this.tileGlows[this.selectedTileIndex];

    tile.position.x += dx;
    tile.position.z += dz;

    if (glow) {
      glow.position.x += dx;
      glow.position.z += dz;
    }

    this.updateTileInfo();
    console.log(`Moved tile ${this.selectedTileIndex} to X=${tile.position.x.toFixed(2)}, Z=${tile.position.z.toFixed(2)}`);
  }

  private deselectTile(): void {
    if (this.selectedTileIndex >= 0) {
      const tile = this.tiles[this.selectedTileIndex];
      if (tile?.material) {
        tile.material.emissiveColor = new Color3(0.2, 0.2, 0.2);
      }
    }
    this.selectedTileIndex = -1;
    this.updateTileInfo();
  }

  private updateTileInfo(): void {
    const infoEl = document.getElementById('tile-info');
    if (!infoEl) return;

    if (this.selectedTileIndex < 0) {
      infoEl.textContent = 'No tile selected';
    } else {
      const tile = this.tiles[this.selectedTileIndex];
      infoEl.innerHTML = `
        <strong>Tile ${this.selectedTileIndex}</strong><br>
        X: ${tile.position.x.toFixed(2)}<br>
        Z: ${tile.position.z.toFixed(2)}
      `;
    }
  }

  private exportTilePath(): void {
    const path = this.tiles.map((tile, i) => ({
      index: i,
      x: parseFloat(tile.position.x.toFixed(2)),
      z: parseFloat(tile.position.z.toFixed(2))
    }));

    const json = JSON.stringify(path, null, 2);

    // Also create TypeScript array format for direct code paste
    const tsCode = `// Custom tile path - paste into createTiles()
const customPath: { x: number, z: number }[] = [
${path.map(p => `  { x: ${p.x}, z: ${p.z} },`).join('\n')}
];`;

    navigator.clipboard.writeText(tsCode).then(() => {
      console.log('=== TILE PATH EXPORTED ===');
      console.log('TypeScript format (copied to clipboard):');
      console.log(tsCode);
      console.log('\nJSON format:');
      console.log(json);
      console.log('=== END EXPORT ===');

      const exportBtn = this.tileEditorPanel?.querySelector('button');
      if (exportBtn) {
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '✅ Copied! Check Console';
        exportBtn.style.background = '#2ecc71';
        setTimeout(() => {
          exportBtn.textContent = originalText;
          exportBtn.style.background = '#27ae60';
        }, 3000);
      }
    });
  }

  /**
   * Toggle between map view and follow view
   */
  private toggleMapView(): void {
    if (this.isMapView) {
      this.switchToFollowView();
    } else {
      this.switchToMapView();
    }
  }

  /**
   * Switch camera to map overview (bird's eye view)
   */
  private switchToMapView(): void {
    if (!this.camera || this.isMapView) return;

    this.isMapView = true;
    this.savedCameraTarget = this.camera.lockedTarget;

    // Update button text
    if (this.mapViewButton) {
      this.mapViewButton.textContent = 'عرض اللاعب';
    }

    // Unlock camera from target
    this.camera.lockedTarget = null;

    // Bird's eye view: camera high above the center, looking straight down
    const targetPosition = new Vector3(0, 120, 0); // High above center
    const targetTarget = new Vector3(0, 0, 0); // Looking at center of map

    // Create position animation
    const posAnim = new Animation(
      'camPosAnim',
      'position',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    posAnim.setKeys([
      { frame: 0, value: this.camera.position.clone() },
      { frame: 60, value: targetPosition }
    ]);

    // Apply easing
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    posAnim.setEasingFunction(ease);

    this.camera.animations = [posAnim];
    this.scene.beginAnimation(this.camera, 0, 60, false, 1, () => {
      this.camera.setTarget(targetTarget);
    });
  }

  /**
   * Switch camera back to player follow view
   */
  private switchToFollowView(): void {
    if (!this.camera || !this.isMapView) return;

    this.isMapView = false;

    // Update button text
    if (this.mapViewButton) {
      this.mapViewButton.textContent = 'عرض الخريطة';
    }

    // Restore follow camera settings
    if (this.savedCameraTarget) {
      this.camera.lockedTarget = this.savedCameraTarget;
    }

    // Reset camera properties for follow mode
    this.camera.radius = 10;
    this.camera.heightOffset = 4;
    this.camera.rotationOffset = 180;
  }

  /**
   * Create camera preset buttons for quick navigation
   */
  private createCameraPresetButtons(): void {
    const presets = [
      { label: 'البداية', position: 'start', bottom: 120 },
      { label: 'المنتصف', position: 'middle', bottom: 70 },
      { label: 'النهاية', position: 'end', bottom: 20 }
    ];

    presets.forEach(preset => {
      const button = document.createElement('button');
      button.className = 'camera-preset-btn';
      button.textContent = preset.label;
      button.style.cssText = `
        position: fixed;
        bottom: ${preset.bottom}px;
        right: 20px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        font-family: 'Cairo', Arial, sans-serif;
        min-width: 100px;
      `;

      button.onmouseenter = () => {
        button.style.transform = 'translateX(-5px)';
        button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
      };

      button.onmouseleave = () => {
        button.style.transform = 'translateX(0)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      };

      button.onclick = () => {
        this.jumpToPreset(preset.position as 'start' | 'middle' | 'end');
      };

      document.body.appendChild(button);
      this.presetButtons.push(button);
    });
  }

  /**
   * Jump camera to a preset position
   */
  private jumpToPreset(position: 'start' | 'middle' | 'end'): void {
    if (!this.camera) return;

    let targetTileIndex = 0;
    switch (position) {
      case 'start':
        targetTileIndex = 0;
        break;
      case 'middle':
        targetTileIndex = 25;
        break;
      case 'end':
        targetTileIndex = 49;
        break;
    }

    const targetTile = this.tiles[targetTileIndex];
    if (!targetTile) return;

    // Exit map view if active
    if (this.isMapView) {
      this.isMapView = false;
      if (this.mapViewButton) {
        this.mapViewButton.textContent = 'عرض الخريطة';
      }
    }

    // Smoothly transition camera to preset position
    this.camera.lockedTarget = targetTile;

    // Animate to position
    const targetPosition = targetTile.position.clone().add(new Vector3(0, 4, -10));

    const posAnim = new Animation(
      'presetPosAnim',
      'position',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    posAnim.setKeys([
      { frame: 0, value: this.camera.position.clone() },
      { frame: 40, value: targetPosition }
    ]);

    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    posAnim.setEasingFunction(ease);

    this.camera.animations = [posAnim];
    this.scene.beginAnimation(this.camera, 0, 40, false);
  }

  /**
   * Play cinematic victory animation for the winning player
   */
  playVictoryAnimation(winnerId: number): Promise<void> {
    return new Promise((resolve) => {
      const winnerPawn = this.pawns.get(winnerId);
      if (!winnerPawn || !this.camera) {
        resolve();
        return;
      }

      console.log(`Playing victory animation for player ${winnerId}`);

      // Stage 1: Dramatic zoom to winner (2 seconds)
      const winnerPos = winnerPawn.position.clone();
      const stage1Target = winnerPos.clone().add(new Vector3(0, 3, -5));

      const zoom1Anim = new Animation(
        'victoryZoom1',
        'position',
        60,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      zoom1Anim.setKeys([
        { frame: 0, value: this.camera.position.clone() },
        { frame: 120, value: stage1Target }
      ]);

      const ease1 = new CubicEase();
      ease1.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      zoom1Anim.setEasingFunction(ease1);

      this.camera.lockedTarget = winnerPawn;
      this.camera.animations = [zoom1Anim];

      this.scene.beginAnimation(this.camera, 0, 120, false, 1, () => {
        // Stage 2: Orbit around winner (4 seconds)
        const orbitAnim = new Animation(
          'victoryOrbit',
          'alpha',
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // Calculate orbit path (360 degrees around winner)
        const orbitFrames = 240; // 4 seconds
        const keys = [];
        for (let i = 0; i <= orbitFrames; i += 20) {
          const angle = (i / orbitFrames) * Math.PI * 2;
          const radius = 6;
          const x = winnerPos.x + Math.cos(angle) * radius;
          const z = winnerPos.z + Math.sin(angle) * radius;
          const y = winnerPos.y + 3;

          const camPos = new Vector3(x, y, z);
          keys.push({ frame: i, value: camPos });
        }

        // Create position animation for orbit
        const orbitPosAnim = new Animation(
          'victoryOrbitPos',
          'position',
          60,
          Animation.ANIMATIONTYPE_VECTOR3,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        orbitPosAnim.setKeys(keys.map((k, i) => ({ frame: k.frame, value: k.value })));

        this.camera.animations = [orbitPosAnim];
        this.camera.lockedTarget = winnerPawn;

        this.scene.beginAnimation(this.camera, 0, orbitFrames, false, 1, () => {
          // Stage 3: Celebratory zoom out (2 seconds)
          const boardCenter = this.tiles.length * 2.5 / 2;
          const finalPos = new Vector3(0, 30, boardCenter);

          const zoom2Anim = new Animation(
            'victoryZoom2',
            'position',
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
          );

          zoom2Anim.setKeys([
            { frame: 0, value: this.camera.position.clone() },
            { frame: 120, value: finalPos }
          ]);

          const ease2 = new CubicEase();
          ease2.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
          zoom2Anim.setEasingFunction(ease2);

          this.camera.animations = [zoom2Anim];
          this.camera.lockedTarget = null;

          this.scene.beginAnimation(this.camera, 0, 120, false, 1, () => {
            console.log('Victory animation complete');
            resolve();
          });
        });
      });
    });
  }

  private setupInput(): void {
    // Input handling if needed
  }

  // =====================================================
  // 3D DICE ROLLING SYSTEM
  // =====================================================

  /**
   * Load the 3D dice model
   */
  public loadDice(): void {
    if (this.diceNode) return; // Already loaded

    this.diceNode = new TransformNode('diceNode', this.scene);
    this.diceNode.setEnabled(false); // Hidden by default

    SceneLoader.ImportMesh(
      '',
      '/models/',
      'dice.glb',
      this.scene,
      (meshes) => {
        if (meshes.length === 0) {
          console.warn('Failed to load dice model - no meshes');
          return;
        }

        console.log(`Dice loaded: ${meshes.length} meshes`);
        meshes.forEach((m, i) => console.log(`  [${i}] ${m.name} (parent: ${m.parent?.name || 'none'})`));

        // Parent root to our node
        const rootNode = meshes.find(m => m.name.includes('__root__')) || meshes[0];
        rootNode.parent = this.diceNode;

        // Store meshes, make them visible - preserve original materials
        meshes.forEach((mesh) => {
          if (mesh instanceof Mesh) {
            this.diceMeshes.push(mesh);
            mesh.isVisible = true;
          }

          // Make sure mesh is enabled
          mesh.setEnabled(true);

          // Log material info for debugging
          if (mesh.material) {
            console.log(`  Dice mesh ${mesh.name} has material: ${mesh.material.name}`);
          }
        });

        // Scale dice - the model is very small, use a much larger scale
        this.diceNode!.scaling = new Vector3(15, 15, 15);

        // No glow disc - just the dice
        console.log('3D Dice loaded successfully, meshes:', this.diceMeshes.length);
      },
      (progress) => {
        console.log(`Loading dice: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      },
      (scene, message) => {
        console.error('Error loading dice:', message);
      }
    );
  }

  /**
   * Create a glow disc beneath the dice for visual effect
   */
  private createDiceGlow(): void {
    this.diceGlow = MeshBuilder.CreateDisc('diceGlow', { radius: 0.15, tessellation: 32 }, this.scene);
    this.diceGlow.rotation.x = Math.PI / 2;
    this.diceGlow.parent = this.diceNode;
    this.diceGlow.position.y = -0.1;

    const glowMat = new StandardMaterial('diceGlowMat', this.scene);
    glowMat.diffuseColor = new Color3(0.2, 0.6, 1);
    glowMat.emissiveColor = new Color3(0.1, 0.4, 0.8);
    glowMat.alpha = 0.4;
    glowMat.backFaceCulling = false;
    this.diceGlow.material = glowMat;
  }

  /**
   * Show dice above a specific player and start rolling animation
   * @param playerId - The player ID to show dice above
   * @param result - The final number the dice will land on (1-6)
   * @returns Promise that resolves when dice animation completes
   */
  public async rollDice3D(playerId: number, result: number): Promise<void> {
    if (!this.diceNode) {
      this.loadDice();
      // Wait a frame for loading
      await new Promise(r => setTimeout(r, 100));
    }

    if (!this.diceNode) return;

    const pawn = this.pawns.get(playerId);
    if (!pawn) return;

    this.targetDiceResult = result;

    // Position dice above the player
    const pawnPos = pawn.position.clone();
    this.diceNode.position = new Vector3(pawnPos.x, pawnPos.y + 4, pawnPos.z);
    this.diceNode.rotation = new Vector3(0, 0, 0);
    this.diceNode.setEnabled(true);

    // Start with spin animation
    this.diceSpinning = true;
    this.diceSpinSpeed = 15; // Fast initial spin (radians per second)

    // Animate the dice roll over 5 seconds
    return new Promise<void>((resolve) => {
      this.diceResolve = resolve;
      this.startDiceRollAnimation();
    });
  }

  /**
   * Main dice roll animation loop - spins fast then slows down
   */
  private startDiceRollAnimation(): void {
    const totalDuration = 5000; // 5 seconds
    const startTime = performance.now();
    const initialSpeed = 15;

    // Calculate target rotation based on result
    const targetRotation = this.getRotationForDiceResult(this.targetDiceResult);

    const animate = () => {
      if (!this.diceNode || !this.diceSpinning) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Exponential slowdown: speed decreases as progress increases
      // Using easing function for dramatic slowdown at the end
      const easedProgress = this.easeOutExpo(progress);
      this.diceSpinSpeed = initialSpeed * (1 - easedProgress);

      // Apply rotation - spin on Y axis with decreasing wobble
      const deltaTime = this.engine.getDeltaTime() / 1000;
      const time = performance.now() / 1000;
      this.diceNode.rotation.y += this.diceSpinSpeed * deltaTime;
      // Wobble decreases as dice slows down
      const wobbleStrength = (1 - easedProgress) * 0.3;
      this.diceNode.rotation.x = Math.sin(time * 3) * wobbleStrength;
      this.diceNode.rotation.z = Math.cos(time * 2.5) * wobbleStrength;

      // Floating bob effect
      const bobOffset = Math.sin(elapsed / 200) * 0.1;
      const pawn = this.pawns.get(this.activePlayerId);
      if (pawn) {
        this.diceNode.position.y = pawn.position.y + 3 + bobOffset;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - snap to final rotation
        this.finalizeDiceRoll(targetRotation);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Get target rotation for a dice result (1-6)
   * Calibrated based on testing with the actual dice model
   */
  private getRotationForDiceResult(result: number): Vector3 {
    const piHalf = Math.PI / 2;

    // Tested mappings for this dice model:
    // - Face 3 & 4 are on X-axis (0 and π)
    // - Face 5 & 6 are on X-axis (±π/2)  
    // - Face 1 & 2 are on Y-axis (±π/2)
    switch (result) {
      case 1: return new Vector3(0, -piHalf, 0);        // 1 on top (swapped with 2)
      case 2: return new Vector3(0, piHalf, 0);         // 2 on top (swapped with 1)
      case 3: return new Vector3(0, 0, 0);              // 3 on top ✓ (tested working)
      case 4: return new Vector3(Math.PI, 0, 0);        // 4 on top ✓ (tested working)
      case 5: return new Vector3(-piHalf, 0, 0);        // 5 on top (was showing for case 6)
      case 6: return new Vector3(piHalf, 0, 0);         // 6 on top (was showing for case 1)
      default: return new Vector3(0, 0, 0);
    }
  }

  /**
   * Exponential ease-out function for dramatic slowdown
   */
  private easeOutExpo(x: number): number {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }

  /**
   * Finalize the dice roll with a bounce and snap to final rotation
   */
  private finalizeDiceRoll(targetRotation: Vector3): void {
    if (!this.diceNode) return;

    this.diceSpinning = false;

    console.log(`Finalizing dice: target result ${this.targetDiceResult}, rotation: (${targetRotation.x.toFixed(2)}, ${targetRotation.y.toFixed(2)}, ${targetRotation.z.toFixed(2)})`);

    // Snap directly to the exact target rotation
    const snapAnim = new Animation(
      'diceSnap',
      'rotation',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const currentRot = this.diceNode.rotation.clone();

    snapAnim.setKeys([
      { frame: 0, value: currentRot },
      { frame: 40, value: targetRotation }  // Slightly longer animation for smoothness
    ]);

    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    snapAnim.setEasingFunction(ease);

    // Bounce scale animation
    const bounceAnim = new Animation(
      'diceBounce',
      'scaling',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const baseScale = new Vector3(15, 15, 15);
    const bigScale = new Vector3(17, 17, 17);

    bounceAnim.setKeys([
      { frame: 0, value: baseScale },
      { frame: 20, value: bigScale },
      { frame: 40, value: baseScale }
    ]);

    this.diceNode.animations = [snapAnim, bounceAnim];
    this.scene.beginAnimation(this.diceNode, 0, 40, false, 1, () => {
      // Wait 1 second then hide dice and resolve
      setTimeout(() => {
        this.hideDice();
        if (this.diceResolve) {
          this.diceResolve();
          this.diceResolve = null;
        }
      }, 1000);
    });
  }

  /**
   * Hide the dice
   */
  public hideDice(): void {
    this.diceSpinning = false;
    if (this.diceNode) {
      this.diceNode.setEnabled(false);
    }
  }

  /**
   * Show dice floating and spinning above the current player
   * Call this at the start of each turn to make the dice visible
   */
  public showDiceAbovePlayer(playerId: number): void {
    if (!this.diceNode) {
      this.loadDice();
      // Try again after a short delay for loading
      setTimeout(() => this.showDiceAbovePlayer(playerId), 300);
      return;
    }

    const pawn = this.pawns.get(playerId);
    if (!pawn) {
      console.warn('No pawn found for player', playerId);
      return;
    }

    this.activePlayerId = playerId;

    // Position dice just above the player's head
    const pawnPos = pawn.position.clone();
    this.diceNode.position = new Vector3(pawnPos.x, pawnPos.y + 3, pawnPos.z);
    this.diceNode.rotation = new Vector3(0, 0, 0);
    this.diceNode.setEnabled(true);

    // Start continuous spinning
    if (!this.diceSpinning) {
      this.diceSpinning = true;
      this.diceSpinSpeed = 12;
      this.startContinuousSpin();
    }

    console.log('Dice shown above player', playerId);
  }

  /**
   * Continuous spinning animation loop (runs until hideDice or rollDice3D is called)
   */
  private startContinuousSpin(): void {
    const spinLoop = () => {
      if (!this.diceNode || !this.diceSpinning) return;

      const deltaTime = this.engine.getDeltaTime() / 1000;
      const time = performance.now() / 1000;

      // Spin primarily on Y axis (like a top) with gentle wobble
      this.diceNode.rotation.y += this.diceSpinSpeed * deltaTime;
      // Add subtle wobble on other axes for natural look
      this.diceNode.rotation.x = Math.sin(time * 3) * 0.2;
      this.diceNode.rotation.z = Math.cos(time * 2.5) * 0.15;

      // Floating bob effect
      const bobOffset = Math.sin(time * 2) * 0.2;
      const pawn = this.pawns.get(this.activePlayerId);
      if (pawn && this.diceNode.isEnabled()) {
        this.diceNode.position.x = pawn.position.x;
        this.diceNode.position.y = pawn.position.y + 3 + bobOffset;
        this.diceNode.position.z = pawn.position.z;
      }

      requestAnimationFrame(spinLoop);
    };

    requestAnimationFrame(spinLoop);
  }
}
