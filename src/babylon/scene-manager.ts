import { Scene } from '@babylonjs/core/scene';
import { getEngine } from './engine';
import { BoardScene } from './board-scene';
import { MinigameScene } from './minigame-scene';

/**
 * SceneManager - manages switching between BoardScene and MinigameScene
 * Only one scene is active at a time
 */

export enum SceneType {
  BOARD = 'board',
  MINIGAME = 'minigame'
}

export class SceneManager {
  private currentScene: Scene | null = null;
  private currentSceneType: SceneType | null = null;
  private boardScene: BoardScene | null = null;
  private minigameScene: MinigameScene | null = null;

  constructor() {
    // Scenes will be created on demand
  }

  /**
   * Initialize the board scene
   */
  initBoardScene(onDiceRoll: () => void, onPawnMoveComplete: () => void): void {
    const engine = getEngine();
    
    // Dispose old board scene if exists
    if (this.boardScene) {
      this.boardScene.scene.dispose();
    }

    this.boardScene = new BoardScene(engine, onDiceRoll, onPawnMoveComplete);
    
    // Always switch to board scene when initializing (will start render loop if needed)
    this.switchToScene(SceneType.BOARD);
  }

  /**
   * Initialize the minigame scene (not used for trivia, but kept for compatibility)
   */
  initMinigameScene(onComplete: () => void): void {
    const engine = getEngine();
    
    // Dispose old minigame scene if exists
    if (this.minigameScene) {
      this.minigameScene.scene.dispose();
    }

    // Minigame scene is not used for trivia (UI-based), but create empty scene for compatibility
    this.minigameScene = new MinigameScene(engine, () => {});
  }

  /**
   * Switch to a different scene
   * IMPORTANT: Do NOT dispose scenes when switching - keep both alive
   */
  switchToScene(sceneType: SceneType): void {
    const engine = getEngine();
    let newScene: Scene | null = null;

    switch (sceneType) {
      case SceneType.BOARD:
        if (!this.boardScene) {
          throw new Error('Board scene not initialized');
        }
        newScene = this.boardScene.scene;
        // Reactivate board scene to ensure camera and scene state are correct
        this.boardScene.reactivate();
        break;

      case SceneType.MINIGAME:
        if (!this.minigameScene) {
          throw new Error('Minigame scene not initialized');
        }
        newScene = this.minigameScene.scene;
        break;
    }

    // DO NOT dispose scenes - just switch which one is being rendered
    // This ensures the board scene remains intact when we switch back

    this.currentScene = newScene;
    this.currentSceneType = sceneType;
    
    // Ensure the new scene has an active camera and is ready to render
    if (newScene) {
      if (!newScene.activeCamera) {
        console.error('Scene has no active camera!', sceneType);
      }
      
      // Ensure scene clear color is set (especially important for board scene)
      if (sceneType === SceneType.BOARD && !newScene.clearColor) {
        // Import Color4 for this check, but for now just ensure rendering works
        console.warn('Board scene clearColor not set');
      }
    }
    
    // Start/replace render loop
    // This will replace any existing render loop, which is fine since we only want one active scene
    engine.runRenderLoop(() => {
      if (this.currentScene) {
        try {
          // Always try to render - scene.isReady() might prevent rendering on first frames
          // The scene will render when ready, but we should start the loop immediately
          this.currentScene.render();
        } catch (error) {
          console.error('Error rendering scene:', error);
          // Don't stop rendering on errors - just log them
        }
      }
    });
    
    console.log(`Switched to ${sceneType} scene. Active camera:`, newScene?.activeCamera ? 'Yes' : 'No');
  }

  /**
   * Get the board scene instance
   */
  getBoardScene(): BoardScene | null {
    return this.boardScene;
  }

  /**
   * Get the minigame scene instance
   */
  getMinigameScene(): MinigameScene | null {
    return this.minigameScene;
  }

  /**
   * Update pawn position on board
   */
  updatePawnPosition(position: number, steps: number): Promise<void> {
    if (!this.boardScene) {
      return Promise.resolve();
    }
    return this.boardScene.movePawn(position, steps);
  }

  /**
   * Start minigame
   */
  startMinigame(): void {
    if (!this.minigameScene) {
      throw new Error('Minigame scene not initialized');
    }
    this.switchToScene(SceneType.MINIGAME);
    this.minigameScene.start();
  }

  /**
   * Get current scene type
   */
  getCurrentSceneType(): SceneType | null {
    return this.currentSceneType;
  }

  /**
   * Dispose all scenes
   */
  dispose(): void {
    if (this.boardScene) {
      this.boardScene.scene.dispose();
      this.boardScene = null;
    }
    if (this.minigameScene) {
      this.minigameScene.scene.dispose();
      this.minigameScene = null;
    }
    this.currentScene = null;
    this.currentSceneType = null;
  }
}

