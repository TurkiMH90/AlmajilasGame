/**
 * Minigame Registry
 * Factory pattern for managing minigame types
 */

import type { IMinigame } from './types';
import { createTriviaMinigame } from '../games/trivia-minigame';

type MinigameFactory = () => IMinigame;

class MinigameRegistry {
    private factories: Map<string, MinigameFactory> = new Map();

    constructor() {
        // Register default minigames
        this.register('trivia', createTriviaMinigame);
    }

    /**
     * Register a minigame factory
     */
    register(id: string, factory: MinigameFactory): void {
        this.factories.set(id, factory);
    }

    /**
     * Get a minigame instance by ID
     */
    get(id: string): IMinigame | null {
        const factory = this.factories.get(id);
        if (!factory) {
            console.error(`[MinigameRegistry] Unknown minigame: ${id}`);
            return null;
        }
        return factory();
    }

    /**
     * Get a random minigame
     */
    getRandom(): IMinigame | null {
        const ids = Array.from(this.factories.keys());
        if (ids.length === 0) return null;

        const randomId = ids[Math.floor(Math.random() * ids.length)];
        return this.get(randomId);
    }

    /**
     * Get all minigames of a specific type
     */
    getByType(type: 'trivia' | 'interactive'): IMinigame[] {
        const games: IMinigame[] = [];

        this.factories.forEach((factory) => {
            const game = factory();
            if (game.type === type) {
                games.push(game);
            }
        });

        return games;
    }

    /**
     * Get all registered minigame IDs
     */
    getRegisteredIds(): string[] {
        return Array.from(this.factories.keys());
    }
}

// Export singleton instance
export const minigameRegistry = new MinigameRegistry();
