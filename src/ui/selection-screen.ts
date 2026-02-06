import { Player } from '../core/game-state';
import { CharacterPreviewScene } from '../babylon/character-preview-scene';

export interface GameConfig {
  players: Player[];
}

const AVAILABLE_CHARACTERS = [
  { name: 'Amy Rose', file: 'amy_rose.glb', color: '#FF69B4', portrait: '/portraits/amy_portrait_1768325081799.png' },
  { name: 'Bunny', file: 'free_fire_new_bunny_bundle_3d_model.glb', color: '#8B4513', portrait: '/portraits/bunny_portrait_1768325186683.png' },
  { name: 'Devil', file: 'red_humonoid_devil_3d_model.glb', color: '#FF0000', portrait: '/portraits/devil_portrait_1768325152677.png' },
  { name: 'Robot', file: 'sci-fi_o.b._robot_unit_th-icc02_animated.glb', color: '#888888', portrait: '/portraits/robot_portrait_1768325123268.png' },
  { name: 'Sonic', file: 'sonic.glb', color: '#0066FF', portrait: '/portraits/sonic_portrait_1768324977204.png' },
  { name: 'Werehog', file: 'sonic_unleashed_-_werehog_sonic.glb', color: '#4B0082', portrait: '/portraits/werehog_portrait_1768325203286.png' },
  { name: 'Knuckles', file: 'srb2-knuckles.glb', color: '#FF4500', portrait: '/portraits/knuckles_portrait_1768325066601.png' },
  { name: 'Metal Sonic', file: 'srb2-metal_sonic.glb', color: '#C0C0C0', portrait: '/portraits/metal_sonic_portrait_1768325217744.png' },
  { name: 'Soldier', file: 'stylized_sci-_fi_soldier_animated.glb', color: '#006400', portrait: '/portraits/soldier_portrait_1768325138593.png' },
  { name: 'Tree Man', file: 'tree_man.glb', color: '#228B22', portrait: '/portraits/tree_man_portrait_1768325231500.png' },
  { name: 'Dark Knight', file: 'dark_knight__spiked_black_armored_warrior.glb', color: '#1a1a2e', portrait: '/portraits/dark_knight_portrait.png' },
];

const PLAYER_COLORS = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'];

export class SelectionScreen {
  private container: HTMLElement;
  private onStart: (config: GameConfig) => void;
  private players: Player[] = [];
  private playerCount: number = 2;
  private characterIndices: number[] = []; // Current character index per player
  private readyStates: boolean[] = []; // Ready status per player
  private previewScenes: CharacterPreviewScene[] = []; // 3D preview scenes per player

  constructor(container: HTMLElement, onStart: (config: GameConfig) => void) {
    this.container = container;
    this.onStart = onStart;
    this.renderModeSelection();
  }

  private clear(): void {
    // Dispose all preview scenes before clearing
    this.disposePreviewScenes();
    this.container.innerHTML = '';
  }

  private disposePreviewScenes(): void {
    this.previewScenes.forEach(scene => scene.dispose());
    this.previewScenes = [];
  }

  private renderModeSelection(): void {
    this.clear();
    this.container.innerHTML = `
      <div class="selection-screen" dir="rtl">
        <!-- Top Navigation Bar -->
        <nav class="selection-nav">
          <div class="nav-right">
            <div class="brand-logo">
              <span class="brand-icon dice-logo">🎲</span>
              <span class="brand-name">خطاوينا</span>
            </div>
          </div>
          <div class="nav-center">
            <!-- Optional Center Content -->
          </div>
          <div class="nav-left">
            <button class="nav-btn">
              <span class="nav-icon">❓</span>
              كيفية اللعب
            </button>
            <button class="nav-btn">
              <span class="nav-icon">⚙️</span>
              الإعدادات
            </button>
          </div>
        </nav>

        <div class="selection-content">
          <div class="selection-header">
            <h1> مرحباً بك في خطاوينا</h1>
            <p>اختر عدد اللاعبين للبدء</p>
          </div>
          <div class="player-count-options">
            <button class="count-btn" data-count="2">
              <span class="count-num">2</span>
              <span class="count-label">لاعبان</span>
            </button>
            <button class="count-btn" data-count="3">
              <span class="count-num">3</span>
              <span class="count-label">لاعبين</span>
            </button>
            <button class="count-btn" data-count="4">
              <span class="count-num">4</span>
              <span class="count-label">لاعبين</span>
            </button>
          </div>
        </div>
        
        <!-- Empty footer for visual balance -->
        <footer class="selection-footer-bar" style="visibility: hidden;"></footer>
      </div>
    `;

    this.container.querySelectorAll('.count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.playerCount = parseInt((e.currentTarget as HTMLElement).dataset.count || '2');
        this.initializePlayers();
        this.renderCharacterSelection();
      });
    });
  }

  private initializePlayers(): void {
    this.players = [];
    this.characterIndices = [];
    this.readyStates = [];

    for (let i = 0; i < this.playerCount; i++) {
      // Give each player a different starting character
      const startChar = i % AVAILABLE_CHARACTERS.length;
      this.characterIndices.push(startChar);
      this.readyStates.push(false);

      const char = AVAILABLE_CHARACTERS[startChar];
      this.players.push({
        id: i,
        name: `اللاعب ${i + 1}`,
        isTeam: false,
        characterModel: char.file,
        characterName: char.name,
        portrait: char.portrait,
        color: PLAYER_COLORS[i],
        pawnPosition: 0,
        points: 0
      });
    }
  }

  private renderCharacterSelection(): void {
    // Dispose previous scenes but don't clear yet
    this.disposePreviewScenes();
    this.container.innerHTML = '';

    // Build player cards with 3D canvas
    let cardsHtml = '';
    for (let i = 0; i < this.playerCount; i++) {
      const charIdx = this.characterIndices[i];
      const char = AVAILABLE_CHARACTERS[charIdx];
      const isReady = this.readyStates[i];
      const playerColor = PLAYER_COLORS[i];

      cardsHtml += `
        <div class="player-card glass-card" style="--player-color: ${playerColor}">
          <div class="card-header">
            <span class="player-label">اللاعب ${i + 1}</span>
          </div>
          
          <div class="card-content">
            <button class="nav-arrow nav-prev" data-player="${i}" data-dir="-1">❮</button>
            
            <div class="character-display">
                <div class="portrait-frame portrait-frame-3d" style="border-color: ${playerColor}">
                  <canvas id="preview-canvas-${i}" class="character-preview-canvas" width="280" height="320"></canvas>
                </div>
                <div class="card-name">${char.name}</div>
            </div>

            <button class="nav-arrow nav-next" data-player="${i}" data-dir="1">❯</button>
          </div>

          <button class="ready-btn ${isReady ? 'is-ready' : ''}" data-player="${i}">
            ${isReady ? '✓ جاهز' : 'غير جاهز'}
          </button>
        </div>
      `;
    }

    const allReady = this.readyStates.every(r => r);
    const readyCount = this.readyStates.filter(r => r).length;

    // Generate player status circles for footer
    let playerCirclesHtml = '';
    for (let i = this.playerCount - 1; i >= 0; i--) {
      const isReady = this.readyStates[i];
      const playerColor = PLAYER_COLORS[i];
      playerCirclesHtml += `
        <div class="player-circle ${isReady ? 'is-ready' : ''}" style="--player-color: ${playerColor}">
          <span>P${i + 1}</span>
          ${isReady ? '<span class="ready-dot"></span>' : ''}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="selection-screen" dir="rtl">
        <!-- Top Navigation Bar -->
        <nav class="selection-nav">
          <div class="nav-right">
            <div class="brand-logo">
              <span class="brand-icon dice-logo">🎲</span>
              <span class="brand-name">لعبة المجلس</span>
            </div>
          </div>
          <div class="nav-center">
            <div class="room-code">
              <span class="room-label">رمز الغرفة</span>
              <span class="room-id">MJ-${Math.random().toString(36).substring(2, 5).toUpperCase()}</span>
            </div>
          </div>
          <div class="nav-left">
            <button class="nav-btn leave-btn" id="back-btn">مغادرة</button>
            <button class="nav-btn">
              <span class="nav-icon">❓</span>
              كيفية اللعب
            </button>
            <button class="nav-btn">
              <span class="nav-icon">⚙️</span>
              الإعدادات
            </button>
          </div>
        </nav>

        <!-- Main Content -->

        <div class="selection-content">
          <div class="selection-header">
            <h1>اختر بطلك</h1>
            <p>بانتظار جميع اللاعبين لتأكيد اختيار شخصياتهم</p>
          </div>
          <div class="player-cards-row">
            ${cardsHtml}
          </div>
        </div>

        <!-- Bottom Footer Bar -->
        <footer class="selection-footer-bar">
          <div class="footer-left">
            <button class="start-btn ${allReady ? '' : 'disabled'}" id="start-btn" ${allReady ? '' : 'disabled'}>
              ▶ ابدأ اللعبة
            </button>
          </div>
          <div class="footer-center">
            <div class="ready-status">
              <span class="status-label">حالة الاستعداد</span>
              <span class="status-count">${readyCount} / ${this.playerCount} جاهزون للبدء</span>
            </div>
          </div>
          <div class="footer-right">
            <div class="player-circles">
              ${playerCirclesHtml}
            </div>
          </div>
        </footer>
      </div>
    `;

    // Initialize 3D preview scenes for each player
    this.initializePreviewScenes();

    // Event listeners
    this.container.querySelectorAll('.nav-arrow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const playerIdx = parseInt(el.dataset.player || '0');
        const dir = parseInt(el.dataset.dir || '1');
        this.cycleCharacter(playerIdx, dir);
      });
    });

    this.container.querySelectorAll('.ready-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const playerIdx = parseInt((e.currentTarget as HTMLElement).dataset.player || '0');
        this.toggleReady(playerIdx);
      });
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.renderModeSelection();
    });

    document.getElementById('start-btn')?.addEventListener('click', () => {
      // Check current ready state, not the captured one
      const currentlyAllReady = this.readyStates.every(r => r);
      if (currentlyAllReady) {
        this.startGame();
      }
    });
  }

  private initializePreviewScenes(): void {
    for (let i = 0; i < this.playerCount; i++) {
      const canvas = document.getElementById(`preview-canvas-${i}`) as HTMLCanvasElement | null;
      if (canvas) {
        const previewScene = new CharacterPreviewScene(canvas);
        const char = AVAILABLE_CHARACTERS[this.characterIndices[i]];
        previewScene.loadCharacter(char.file);
        this.previewScenes.push(previewScene);
      }
    }
  }

  private updatePreviewScene(playerIdx: number): void {
    const previewScene = this.previewScenes[playerIdx];
    if (previewScene) {
      const char = AVAILABLE_CHARACTERS[this.characterIndices[playerIdx]];
      previewScene.loadCharacter(char.file);
    }
  }

  private cycleCharacter(playerIdx: number, direction: number): void {
    // Don't allow changing if ready
    if (this.readyStates[playerIdx]) return;

    const currentIdx = this.characterIndices[playerIdx];
    let newIdx = currentIdx + direction;

    // Wrap around
    if (newIdx < 0) newIdx = AVAILABLE_CHARACTERS.length - 1;
    if (newIdx >= AVAILABLE_CHARACTERS.length) newIdx = 0;

    // Check if character is already taken by another player
    const takenByOther = this.characterIndices.some((idx, pIdx) =>
      pIdx !== playerIdx && idx === newIdx && this.readyStates[pIdx]
    );

    if (takenByOther) {
      // Update index and skip to next available
      this.characterIndices[playerIdx] = newIdx;
      this.cycleCharacter(playerIdx, direction);
      return;
    }

    this.characterIndices[playerIdx] = newIdx;
    const char = AVAILABLE_CHARACTERS[newIdx];
    this.players[playerIdx].characterModel = char.file;
    this.players[playerIdx].characterName = char.name;
    this.players[playerIdx].portrait = char.portrait;

    // Update only the 3D preview and name, not the whole screen
    this.updatePreviewScene(playerIdx);

    // Update the name display
    const card = this.container.querySelectorAll('.player-card')[playerIdx];
    if (card) {
      const cardName = card.querySelector('.card-name');
      if (cardName) {
        cardName.textContent = char.name;
      }
    }
  }

  private toggleReady(playerIdx: number): void {
    // Check for duplicate character when trying to ready
    if (!this.readyStates[playerIdx]) {
      const myChar = this.characterIndices[playerIdx];
      const duplicate = this.characterIndices.some((idx, pIdx) =>
        pIdx !== playerIdx && idx === myChar && this.readyStates[pIdx]
      );
      if (duplicate) {
        // Can't ready with same character as another ready player
        alert('هذه الشخصية مختارة من لاعب آخر!');
        return;
      }
    }

    this.readyStates[playerIdx] = !this.readyStates[playerIdx];

    // Update the ready button and counter without full re-render
    const readyBtn = this.container.querySelectorAll('.ready-btn')[playerIdx];
    if (readyBtn) {
      const isReady = this.readyStates[playerIdx];
      readyBtn.className = `ready-btn ${isReady ? 'is-ready' : ''}`;
      readyBtn.textContent = isReady ? '✓ جاهز' : 'غير جاهز';
    }

    // Update player circle in footer
    const playerCircles = this.container.querySelectorAll('.player-circle');
    // Circles are rendered in reverse order (P4, P3, P2, P1)
    const circleIdx = this.playerCount - 1 - playerIdx;
    const circle = playerCircles[circleIdx];
    if (circle) {
      const isReady = this.readyStates[playerIdx];
      circle.className = `player-circle ${isReady ? 'is-ready' : ''}`;
      // Update ready dot
      const existingDot = circle.querySelector('.ready-dot');
      if (isReady && !existingDot) {
        const dot = document.createElement('span');
        dot.className = 'ready-dot';
        circle.appendChild(dot);
      } else if (!isReady && existingDot) {
        existingDot.remove();
      }
    }

    // Update ready counter (new footer structure)
    const readyCount = this.readyStates.filter(r => r).length;
    const statusCount = this.container.querySelector('.status-count');
    if (statusCount) {
      statusCount.textContent = `${readyCount} / ${this.playerCount} جاهزون للبدء`;
    }

    // Update start button
    const allReady = this.readyStates.every(r => r);
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.className = `start-btn ${allReady ? '' : 'disabled'}`;
      (startBtn as HTMLButtonElement).disabled = !allReady;
    }
  }

  private startGame(): void {
    this.clear();
    this.onStart({ players: this.players });
  }
}
