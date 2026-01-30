import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

let engine: Engine | null = null;

/**
 * Initialize Babylon.js engine
 */
export function initEngine(canvasId: string = 'renderCanvas'): Engine {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas element with id "${canvasId}" not found`);
  }

  engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
    alpha: false
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    engine?.resize();
  });

  // Handle pointer events for mobile support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
  }, { passive: false });

  return engine;
}

/**
 * Get the current engine instance
 */
export function getEngine(): Engine {
  if (!engine) {
    throw new Error('Engine not initialized. Call initEngine() first.');
  }
  return engine;
}

/**
 * Dispose of the engine
 */
export function disposeEngine(): void {
  if (engine) {
    engine.dispose();
    engine = null;
  }
}

