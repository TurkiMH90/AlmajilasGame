/**
 * Deterministic random number generator using a seed
 * Ensures reproducible game results
 */

export class RNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Get the current seed (for reproducibility)
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Set a new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Generate a random number between 0 and 1
   * Uses a simple linear congruential generator
   */
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: readonly T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm (mutates the array)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

