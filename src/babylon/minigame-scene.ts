import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MINIGAME_DURATION } from '../core/constants';

/**
 * MinigameScene - simple 3D scene for the minigame
 * The actual game logic is handled by the UI overlay
 * This scene provides a visual backdrop
 */

export class MinigameScene {
  public scene: Scene;
  private engine: Engine;
  private camera: ArcRotateCamera;
  private onComplete: () => void;
  private startTime: number = 0;
  private isActive: boolean = false;

  constructor(engine: Engine, onComplete: () => void) {
    this.engine = engine;
    this.onComplete = onComplete;
    this.scene = new Scene(engine);
    this.setupScene();
  }

  /**
   * Setup a simple 3D scene as backdrop for minigame
   */
  private setupScene(): void {
    // Camera
    this.camera = new ArcRotateCamera(
      'minigame_camera',
      -Math.PI / 2,
      Math.PI / 2.5,
      15,
      Vector3.Zero(),
      this.scene
    );

    // Lighting
    const light = new HemisphericLight('minigame_light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.9;

    // Create some simple geometric shapes as backdrop
    for (let i = 0; i < 10; i++) {
      const sphere = MeshBuilder.CreateSphere(`sphere_${i}`, { segments: 16, diameter: 1 }, this.scene);
      sphere.position = new Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      
      const material = new StandardMaterial(`sphere_mat_${i}`, this.scene);
      material.diffuseColor = new Color3(
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5
      );
      sphere.material = material;
    }
  }

  /**
   * Start the minigame (triggers UI overlay)
   */
  start(): void {
    this.startTime = Date.now();
    this.isActive = true;
    
    // Animate camera for visual interest
    this.animateCamera();
  }

  /**
   * Simple camera animation
   */
  private animateCamera(): void {
    const startAlpha = this.camera.alpha;
    const startBeta = this.camera.beta;
    
    // Rotate camera slowly
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.isActive) {
        this.camera.alpha += 0.005;
        this.camera.beta = startBeta + Math.sin(this.camera.alpha) * 0.3;
      }
    });
  }

  /**
   * Stop the minigame
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Get elapsed time since minigame started
   */
  getElapsedTime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Check if minigame duration has elapsed
   */
  isTimeUp(): boolean {
    return this.getElapsedTime() >= MINIGAME_DURATION;
  }

  /**
   * Complete minigame (trivia handled by UI, this is just a placeholder)
   */
  complete(): void {
    this.stop();
    this.onComplete();
  }
}

