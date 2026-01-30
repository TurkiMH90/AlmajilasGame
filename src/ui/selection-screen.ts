import { Player } from '../core/game-state';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3, Color4, Color3 } from '@babylonjs/core/Maths/math';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import '@babylonjs/loaders/glTF';

export interface GameConfig {
  players: Player[];
}

const AVAILABLE_CHARACTERS = [
  { name: 'Amy Rose', file: 'amy_rose.glb', color: '#FF69B4', rotX: -Math.PI / 2, rotY: -Math.PI / 2, portrait: '/portraits/amy_portrait_1768325081799.png' },
  { name: 'Bunny', file: 'free_fire_new_bunny_bundle_3d_model.glb', color: '#8B4513', rotX: -Math.PI / 2, portrait: '/portraits/bunny_portrait_1768325186683.png' },
  { name: 'Devil', file: 'red_humonoid_devil_3d_model.glb', color: '#FF0000', rotX: 0, portrait: '/portraits/devil_portrait_1768325152677.png' },
  { name: 'Robot', file: 'sci-fi_o.b._robot_unit_th-icc02_animated.glb', color: '#888888', rotX: -Math.PI / 2, portrait: '/portraits/robot_portrait_1768325123268.png' },
  { name: 'Sonic', file: 'sonic.glb', color: '#0066FF', rotX: -Math.PI / 2, portrait: '/portraits/sonic_portrait_1768324977204.png' },
  { name: 'Werehog', file: 'sonic_unleashed_-_werehog_sonic.glb', color: '#4B0082', rotX: -Math.PI / 2, portrait: '/portraits/werehog_portrait_1768325203286.png' },
  { name: 'Knuckles', file: 'srb2-knuckles.glb', color: '#FF4500', rotX: -Math.PI / 2, portrait: '/portraits/knuckles_portrait_1768325066601.png' },
  { name: 'Metal Sonic', file: 'srb2-metal_sonic.glb', color: '#C0C0C0', rotX: -Math.PI / 2, portrait: '/portraits/metal_sonic_portrait_1768325217744.png' },
  { name: 'Soldier', file: 'stylized_sci-_fi_soldier_animated.glb', color: '#006400', rotX: -Math.PI / 2, portrait: '/portraits/soldier_portrait_1768325138593.png' },
  { name: 'Tree Man', file: 'tree_man.glb', color: '#228B22', rotX: 0, portrait: '/portraits/tree_man_portrait_1768325231500.png' },
  { name: 'Amy W', file: 'werehog_amy_rose.glb', color: '#9932CC', rotX: 0, portrait: '/portraits/amy_w_portrait_1768325265082.png' },
];

const PLAYER_COLORS = ['#FF3333', '#33CC33', '#3399FF', '#FFCC00'];

export class SelectionScreen {
  private container: HTMLElement;
  private onStart: (config: GameConfig) => void;
  private players: Player[] = [];
  private playerCount: number = 2;
  private currentPlayerSelecting: number = 0;
  private selectedCharacters: number[] = [];

  // Single shared preview engine
  private previewEngine: Engine | null = null;
  private previewScene: Scene | null = null;
  private previewCamera: ArcRotateCamera | null = null;
  private loadedModels: Map<number, TransformNode> = new Map();
  private currentPreviewIndex: number = -1;
  private hoveredIndex: number = -1;

  constructor(container: HTMLElement, onStart: (config: GameConfig) => void) {
    this.container = container;
    this.onStart = onStart;
    this.renderModeSelection();
  }

  private clear(): void {
    if (this.previewEngine) {
      this.previewEngine.dispose();
      this.previewEngine = null;
      this.previewScene = null;
      this.previewCamera = null;
      this.loadedModels.clear();
    }
    this.container.innerHTML = '';
  }

  private renderModeSelection(): void {
    this.clear();
    this.container.innerHTML = `
      <div class="mario-select-screen" dir="rtl">
        <div class="mario-title">
          <h1>🎮 لعبة المجلس 🎮</h1>
          <p>اختر عدد اللاعبين</p>
        </div>
        <div class="player-count-row">
          <button class="player-count-btn" data-count="2">لاعبان</button>
          <button class="player-count-btn" data-count="3">٣ لاعبين</button>
          <button class="player-count-btn" data-count="4">٤ لاعبين</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.player-count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.playerCount = parseInt((e.target as HTMLElement).dataset.count || '2');
        this.initializePlayers();
        this.renderCharacterSelection();
      });
    });
  }

  private initializePlayers(): void {
    this.players = [];
    this.selectedCharacters = [];
    this.currentPlayerSelecting = 0;

    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        id: i,
        name: `اللاعب ${i + 1}`,
        isTeam: false,
        characterModel: '',
        characterName: '',
        portrait: '',
        color: PLAYER_COLORS[i],
        pawnPosition: 0,
        points: 0
      });
      this.selectedCharacters.push(-1);
    }
  }

  private renderCharacterSelection(): void {
    this.clear();

    // Build character grid with colored boxes
    let charGridHtml = '';
    AVAILABLE_CHARACTERS.forEach((char, idx) => {
      const isUsed = this.selectedCharacters.includes(idx);
      charGridHtml += `
        <div class="char-select-item ${isUsed ? 'used' : ''}" data-idx="${idx}" 
             style="--char-color: ${char.color}">
          <div class="char-select-name">${char.name}</div>
        </div>
      `;
    });

    // Build selected players display
    let selectedHtml = '';
    for (let i = 0; i < this.playerCount; i++) {
      const isActive = i === this.currentPlayerSelecting;
      const charIdx = this.selectedCharacters[i];
      const char = charIdx >= 0 ? AVAILABLE_CHARACTERS[charIdx] : null;
      selectedHtml += `
        <div class="selected-player ${isActive ? 'active' : ''}" style="border-color: ${PLAYER_COLORS[i]}">
          <span class="sp-label" style="background: ${PLAYER_COLORS[i]}">ل${i + 1}</span>
          <span class="sp-name">${char ? char.name : '---'}</span>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="mario-select-screen" dir="rtl">
        <div class="select-layout">
          <div class="char-grid-panel">
            <h2>اختر شخصيتك</h2>
            <div class="char-grid-wrap">
              ${charGridHtml}
            </div>
          </div>
          <div class="preview-panel">
            <canvas id="char-preview-canvas"></canvas>
            <div id="preview-name" class="preview-name">مرر للمعاينة</div>
          </div>
        </div>
        <div class="selected-players-row">
          ${selectedHtml}
        </div>
        <div class="start-game-row">
          <button class="back-btn-small" id="back-btn">رجوع ←</button>
          <button id="start-game-btn" class="start-btn" ${this.allPlayersSelected() ? '' : 'disabled'}>
            ابدأ اللعبة!
          </button>
        </div>
      </div>
    `;

    // Initialize 3D preview
    this.initPreviewEngine();

    // Event listeners
    this.container.querySelectorAll('.char-select-item:not(.used)').forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx || '0');
        this.showPreview(idx);
      });

      item.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx || '0');
        this.selectCharacter(idx);
      });
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.renderModeSelection();
    });

    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      if (this.allPlayersSelected()) {
        this.startGame();
      }
    });

    // Show first available character
    const firstAvailable = AVAILABLE_CHARACTERS.findIndex((_, idx) => !this.selectedCharacters.includes(idx));
    if (firstAvailable >= 0) {
      this.showPreview(firstAvailable);
    }
  }

  private initPreviewEngine(): void {
    const canvas = document.getElementById('char-preview-canvas') as unknown as HTMLCanvasElement;
    if (!canvas) return;

    canvas.width = 300;
    canvas.height = 350;

    this.previewEngine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.previewScene = new Scene(this.previewEngine);
    this.previewScene.clearColor = new Color4(0.08, 0.1, 0.15, 1);

    this.previewCamera = new ArcRotateCamera('cam', Math.PI / 4, Math.PI / 2.5, 4, new Vector3(0, 0.8, 0), this.previewScene);

    const light = new HemisphericLight('light', new Vector3(0.3, 1, 0.3), this.previewScene);
    light.intensity = 1.5;

    // Pre-load all character models (hidden initially)
    AVAILABLE_CHARACTERS.forEach((char, idx) => {
      this.loadCharacterModel(idx, char.file);
    });

    this.previewEngine.runRenderLoop(() => {
      if (this.previewScene) {
        // Rotate visible model
        this.loadedModels.forEach((node, idx) => {
          if (idx === this.currentPreviewIndex) {
            node.rotation.y += 0.015;
          }
        });
        this.previewScene.render();
      }
    });
  }

  private loadCharacterModel(index: number, filename: string): void {
    if (!this.previewScene) return;

    const parent = new TransformNode(`char_${index}`, this.previewScene);
    parent.setEnabled(false); // Hidden initially
    this.loadedModels.set(index, parent);

    SceneLoader.ImportMesh('', '/character/', filename, this.previewScene, (meshes) => {
      if (meshes.length === 0) {
        // Create fallback
        const fallback = MeshBuilder.CreateBox(`fallback_${index}`, { size: 1 }, this.previewScene!);
        fallback.parent = parent;
        const mat = new StandardMaterial(`mat_${index}`, this.previewScene!);
        mat.diffuseColor = Color3.FromHexString(AVAILABLE_CHARACTERS[index].color);
        fallback.material = mat;
        return;
      }

      // SPECIAL CASE: Some models have complex hierarchies - only parent the root node
      // to preserve the internal mesh relationships
      const isAmyRose = filename === 'amy_rose.glb';
      const isAmyW = filename === 'werehog_amy_rose.glb';
      const needsSpecialHandling = isAmyRose || isAmyW;

      if (needsSpecialHandling && meshes.length > 0) {
        // Create an intermediate node to handle rotations
        const rotationNode = new TransformNode(`rotation_node_${index}`, this.previewScene!);
        rotationNode.parent = parent;
        rotationNode.rotation.y = Math.PI; // 180 degrees to face camera
        // Amy W needs to be flipped right-side up
        if (isAmyW) {
          rotationNode.rotation.x = Math.PI; // Flip upside down
        }

        // Find the root node and parent it to our rotation node
        const rootNode = meshes.find(m => m.name.includes('__root__')) || meshes[0];
        rootNode.parent = rotationNode;

        // Fix materials on all meshes
        meshes.forEach(mesh => {
          if (mesh.material) {
            mesh.material.alpha = 1.0;
            if ('transparencyMode' in mesh.material) {
              (mesh.material as any).transparencyMode = 0;
            }
            mesh.material.backFaceCulling = false;
          }
        });
      } else {
        // Normal handling: Parent all meshes directly
        meshes.forEach(mesh => {
          mesh.parent = parent;
          if (mesh.material) {
            mesh.material.alpha = 1.0;
            if ('transparencyMode' in mesh.material) {
              (mesh.material as any).transparencyMode = 0;
            }
            mesh.material.backFaceCulling = false;
          }
        });
      }

      // STEP 2: Apply per-character rotation (skip for models with special handling - done above)
      const charConfig = AVAILABLE_CHARACTERS[index];
      if (!needsSpecialHandling) {
        parent.rotation.x = charConfig.rotX;
        parent.rotation.y = (charConfig as any).rotY || 0;
      }

      // STEP 3: Force world matrix update
      parent.computeWorldMatrix(true);
      meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();
      });

      // STEP 4: Calculate world-space bounds for scaling
      let minY = Infinity, maxY = -Infinity;
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      meshes.forEach(mesh => {
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
      // Amy W model is very large, use smaller target size
      const targetSize = isAmyW ? 0.1 : 2;
      const scale = targetSize / Math.max(maxDim, 0.01);
      parent.scaling = new Vector3(scale, scale, scale);

      // STEP 6: Update matrices after scaling
      parent.computeWorldMatrix(true);
      meshes.forEach(mesh => {
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();
      });

      // STEP 7: Recalculate minY after scaling and position so feet are visible
      let minY_final = Infinity;
      meshes.forEach(mesh => {
        const bb = mesh.getBoundingInfo().boundingBox;
        minY_final = Math.min(minY_final, bb.minimumWorld.y);
      });

      parent.position.y = -minY_final + 0.3;
    });

  }

  private showPreview(index: number): void {
    if (this.currentPreviewIndex === index) return;

    // Hide current
    if (this.currentPreviewIndex >= 0) {
      const current = this.loadedModels.get(this.currentPreviewIndex);
      if (current) current.setEnabled(false);
    }

    // Show new
    const next = this.loadedModels.get(index);
    if (next) {
      next.setEnabled(true);
      next.rotation.y = 0;
    }

    this.currentPreviewIndex = index;

    // Update name
    const nameEl = document.getElementById('preview-name');
    if (nameEl) {
      nameEl.textContent = AVAILABLE_CHARACTERS[index].name;
    }
  }

  private selectCharacter(charIndex: number): void {
    if (this.selectedCharacters.includes(charIndex)) return;

    this.selectedCharacters[this.currentPlayerSelecting] = charIndex;
    const selectedChar = AVAILABLE_CHARACTERS[charIndex];
    this.players[this.currentPlayerSelecting].characterModel = selectedChar.file;
    this.players[this.currentPlayerSelecting].characterName = selectedChar.name;
    this.players[this.currentPlayerSelecting].portrait = selectedChar.portrait;

    this.currentPlayerSelecting++;
    if (this.currentPlayerSelecting >= this.playerCount) {
      this.currentPlayerSelecting = 0;
    }

    this.renderCharacterSelection();
  }

  private allPlayersSelected(): boolean {
    return this.selectedCharacters.every(idx => idx >= 0);
  }

  private startGame(): void {
    this.clear();
    this.onStart({ players: this.players });
  }
}
