/**
 * Minigames Module - Public Exports
 */

// Core types
export * from './core/types';

// Services
export { supabase, isSupabaseConfigured } from './core/supabase-client';
export { questionService, QuestionService } from './core/question-service';
export { minigameRegistry } from './core/minigame-registry';

// Games
export { TriviaMinigame, createTriviaMinigame } from './games/trivia-minigame';
