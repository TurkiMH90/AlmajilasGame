import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3, Color4, Color3 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/loaders/glTF';
import { getCharacterRotation } from '../core/character-config';

/**
 * CharacterPreviewScene - A mini 3D scene for rendering character previews
 * in the selection screen. Each player card gets its own instance.
 */
export class CharacterPreviewScene {
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private characterNode: TransformNode | null = null;
    private currentModelFile: string | null = null;
    private canvas: HTMLCanvasElement;
    private isDisposed: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        // Create engine for this canvas
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            alpha: true // Transparent background
        });

        // Create scene
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0); // Transparent

        // Setup camera - orbit around character
        this.camera = new ArcRotateCamera(
            'previewCamera',
            Math.PI / 2, // Alpha (horizontal rotation)
            Math.PI / 2.5, // Beta (vertical angle)
            3, // Radius (distance from target)
            Vector3.Zero(),
            this.scene
        );
        this.camera.attachControl(canvas, false); // Disable user control
        this.camera.lowerRadiusLimit = 2;
        this.camera.upperRadiusLimit = 5;
        this.scene.activeCamera = this.camera;

        // Lighting - Enhanced for better character volume and detail
        const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
        hemiLight.intensity = 0.8; // Soft ambient fill
        hemiLight.diffuse = new Color3(0.9, 0.9, 1); // Cool white
        hemiLight.groundColor = new Color3(0.2, 0.2, 0.2); // Dark ground bounce

        // Key light (Directional) for shadows and definition
        const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
        dirLight.position = new Vector3(5, 10, 5);
        dirLight.intensity = 1.2;
        dirLight.diffuse = new Color3(1, 0.95, 0.9); // Warm highlight

        // Start render loop
        this.engine.runRenderLoop(() => {
            if (!this.isDisposed && this.scene) {
                this.scene.render();
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.engine?.resize();
        });

        // Start camera auto-rotation
        this.startCameraRotation();
    }

    /**
     * Rotate camera slowly around the character
     */
    private startCameraRotation(): void {
        let alpha = Math.PI / 2;
        const rotationSpeed = 0.005;

        this.scene.registerBeforeRender(() => {
            if (this.camera && !this.isDisposed) {
                alpha += rotationSpeed;
                this.camera.alpha = alpha;
            }
        });
    }

    /**
     * Load a character model for preview
     */
    loadCharacter(modelFile: string): void {
        // Don't reload the same model
        if (this.currentModelFile === modelFile) return;
        this.currentModelFile = modelFile;

        // Clear previous character
        if (this.characterNode) {
            this.characterNode.dispose();
            this.characterNode = null;
        }

        // Create new transform node
        this.characterNode = new TransformNode('character', this.scene);

        const filename = modelFile.split('/').pop() || modelFile;
        const isAmyRose = filename === 'amy_rose.glb';
        const isAmyW = filename === 'werehog_amy_rose.glb';
        const needsSpecialHandling = isAmyRose || isAmyW;

        SceneLoader.ImportMesh(
            '',
            '/character/',
            filename,
            this.scene,
            (meshes) => {
                if (meshes.length === 0 || !this.characterNode) return;

                if (needsSpecialHandling) {
                    // Create intermediate rotation node for special characters
                    const rotationNode = new TransformNode('rotation_node', this.scene);
                    rotationNode.parent = this.characterNode;

                    const rootNode = meshes.find(m => m.name.includes('__root__')) || meshes[0];
                    rootNode.parent = rotationNode;

                    meshes.forEach((mesh) => {
                        if (mesh.material) {
                            mesh.material.alpha = 1.0;
                            if ('transparencyMode' in mesh.material) {
                                (mesh.material as any).transparencyMode = 0;
                            }
                            mesh.material.backFaceCulling = false;
                        }
                    });
                } else {
                    meshes.forEach((mesh) => {
                        mesh.parent = this.characterNode;
                        if (mesh.material) {
                            mesh.material.alpha = 1.0;
                            if ('transparencyMode' in mesh.material) {
                                (mesh.material as any).transparencyMode = 0;
                            }
                            mesh.material.backFaceCulling = false;
                        }
                    });

                    // Apply per-character rotation
                    this.characterNode.rotation.x = getCharacterRotation(filename);
                }

                // Calculate bounds and scale
                this.characterNode.computeWorldMatrix(true);
                meshes.forEach((mesh) => {
                    mesh.computeWorldMatrix(true);
                    mesh.refreshBoundingInfo();
                });

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

                // Scale to fit preview
                const height = maxY - minY;
                const width = Math.max(maxX - minX, maxZ - minZ);
                const maxDim = Math.max(height, width);
                const targetSize = 2.0;
                const scale = targetSize / Math.max(maxDim, 0.001);
                this.characterNode.scaling = new Vector3(scale, scale, scale);

                // Recalculate and center
                this.characterNode.computeWorldMatrix(true);
                meshes.forEach((mesh) => {
                    mesh.computeWorldMatrix(true);
                    mesh.refreshBoundingInfo();
                });

                let minY_final = Infinity;
                let maxY_final = -Infinity;
                meshes.forEach((mesh) => {
                    const bb = mesh.getBoundingInfo().boundingBox;
                    minY_final = Math.min(minY_final, bb.minimumWorld.y);
                    maxY_final = Math.max(maxY_final, bb.maximumWorld.y);
                });

                // Center vertically
                const centerY = (minY_final + maxY_final) / 2;
                this.characterNode.position.y = -centerY;

                // Adjust camera target to center of character
                this.camera.target = new Vector3(0, 0, 0);
            },
            null,
            (scene, message) => {
                console.warn(`Failed to load character preview: ${filename}`);
            }
        );
    }

    /**
     * Dispose the preview scene
     */
    dispose(): void {
        this.isDisposed = true;
        if (this.characterNode) {
            this.characterNode.dispose();
        }
        this.scene?.dispose();
        this.engine?.dispose();
    }
}
