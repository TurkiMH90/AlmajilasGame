// Character configuration with per-model rotation adjustments
// All characters need -Math.PI/2 rotation on X axis to stand upright
export const CHARACTER_CONFIG: Record<string, { rotX: number }> = {
    'amy_rose.glb': { rotX: -Math.PI / 2 },
    'free_fire_new_bunny_bundle_3d_model.glb': { rotX: -Math.PI / 2 },
    'red_humonoid_devil_3d_model.glb': { rotX: 0 },
    'sci-fi_o.b._robot_unit_th-icc02_animated.glb': { rotX: -Math.PI / 2 },
    'sonic.glb': { rotX: -Math.PI / 2 },
    'sonic_unleashed_-_werehog_sonic.glb': { rotX: -Math.PI / 2 },
    'srb2-knuckles.glb': { rotX: -Math.PI / 2 },
    'srb2-metal_sonic.glb': { rotX: -Math.PI / 2 },
    'stylized_sci-_fi_soldier_animated.glb': { rotX: -Math.PI / 2 },
    'tree_man.glb': { rotX: 0 },
    'werehog_amy_rose.glb': { rotX: 0 },
};

export function getCharacterRotation(filename: string): number {
    const config = CHARACTER_CONFIG[filename];
    return config ? config.rotX : -Math.PI / 2; // Default to -90 degrees
}
