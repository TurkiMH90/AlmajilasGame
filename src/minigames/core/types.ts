/**
 * Minigame Core Types and Interfaces
 * Designed for loose coupling and app portability
 */

// ============ ENUMS ============

export type QuestionType = 'text' | 'audio' | 'video';
export type Difficulty = 'easy' | 'medium' | 'hard';

// ============ TIME LIMITS (in seconds) ============

export const TIME_LIMITS: Record<Difficulty, number> = {
    easy: 60,    // 1 minute
    medium: 120, // 2 minutes
    hard: 180    // 3 minutes
};

// ============ POINTS ============

export const POINTS: Record<Difficulty, number> = {
    easy: 10,
    medium: 20,
    hard: 30
};

// ============ INTERFACES ============

export interface TriviaQuestion {
    id: string;
    categoryId: string;
    type: QuestionType;
    difficulty: Difficulty;
    questionAr: string;
    mediaUrl?: string;
    options: string[];
    correctAnswer: number;
    points: number;
    isTrial: boolean;
}

export interface Category {
    id: string;
    nameAr: string;
    nameEn: string;
    icon?: string;
    order: number;
}

export interface UserProfile {
    id: string;
    isPaid: boolean;
    createdAt: Date;
}

export interface QuestionHistory {
    id: string;
    userId: string;
    questionId: string;
    seenAt: Date;
    answeredCorrectly: boolean;
    gameSeed: string;
}

export interface MinigameResult {
    success: boolean;
    pointsEarned: number;
    timeTaken: number;
    questionId: string;
    answeredCorrectly: boolean;
}

// ============ MINIGAME INTERFACE ============

export interface IMinigame {
    id: string;
    nameAr: string;
    nameEn: string;
    type: 'trivia' | 'interactive';

    // Lifecycle
    initialize(): Promise<void>;
    start(): void;
    pause(): void;
    resume(): void;
    end(): MinigameResult;

    // Events
    onComplete: (result: MinigameResult) => void;
    onTimeUpdate: (remaining: number) => void;
}

// ============ SERVICE INTERFACES ============

export interface IQuestionService {
    getRandomQuestion(userId: string, difficulty?: Difficulty): Promise<TriviaQuestion | null>;
    getCategories(): Promise<Category[]>;
    recordAnswer(userId: string, questionId: string, correct: boolean, gameSeed: string): Promise<void>;
    getSeenQuestionIds(userId: string): Promise<string[]>;
}

export interface IUserService {
    getUser(userId: string): Promise<UserProfile | null>;
    isPaidUser(userId: string): Promise<boolean>;
}

export interface IMediaService {
    getMediaUrl(mediaPath: string): string;
    preloadMedia(url: string): Promise<void>;
}
