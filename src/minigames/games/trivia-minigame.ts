/**
 * Trivia Minigame
 * Implements IMinigame for trivia questions (text, audio, video)
 */

import type {
    IMinigame,
    MinigameResult,
    TriviaQuestion,
    Difficulty
} from '../core/types';
import { TIME_LIMITS, POINTS } from '../core/types';
import { questionService } from '../core/question-service';

export class TriviaMinigame implements IMinigame {
    id = 'trivia';
    nameAr = 'أسئلة تافهة';
    nameEn = 'Trivia';
    type: 'trivia' = 'trivia';

    // Current state
    private currentQuestion: TriviaQuestion | null = null;
    private startTime: number = 0;
    private timeRemaining: number = 0;
    private timerInterval: number | null = null;
    private isPaused: boolean = false;
    private selectedAnswer: number | null = null;
    private userId: string = '';
    private gameSeed: string = '';
    private difficulty: Difficulty = 'easy';

    // Callbacks
    onComplete: (result: MinigameResult) => void = () => { };
    onTimeUpdate: (remaining: number) => void = () => { };
    onQuestionLoaded: (question: TriviaQuestion) => void = () => { };

    /**
     * Initialize with user context
     */
    async initialize(userId?: string, gameSeed?: string, difficulty?: Difficulty): Promise<void> {
        this.userId = userId || 'anonymous';
        this.gameSeed = gameSeed || Date.now().toString();
        this.difficulty = difficulty || 'easy';
        this.timeRemaining = TIME_LIMITS[this.difficulty];

        // Load a question
        this.currentQuestion = await questionService.getRandomQuestion(this.userId, this.difficulty);

        if (this.currentQuestion) {
            this.onQuestionLoaded(this.currentQuestion);
        }
    }

    /**
     * Start the timer
     */
    start(): void {
        this.startTime = Date.now();
        this.isPaused = false;

        // Start countdown timer
        this.timerInterval = window.setInterval(() => {
            if (!this.isPaused) {
                this.timeRemaining--;
                this.onTimeUpdate(this.timeRemaining);

                // Time's up!
                if (this.timeRemaining <= 0) {
                    this.handleTimeout();
                }
            }
        }, 1000);
    }

    /**
     * Pause the timer
     */
    pause(): void {
        this.isPaused = true;
    }

    /**
     * Resume the timer
     */
    resume(): void {
        this.isPaused = false;
    }

    /**
     * Submit an answer
     */
    async submitAnswer(answerIndex: number): Promise<MinigameResult> {
        this.selectedAnswer = answerIndex;
        this.stopTimer();

        const correct = this.currentQuestion
            ? answerIndex === this.currentQuestion.correctAnswer
            : false;

        const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);

        // Record in history
        if (this.currentQuestion) {
            await questionService.recordAnswer(
                this.userId,
                this.currentQuestion.id,
                correct,
                this.gameSeed
            );
        }

        const result: MinigameResult = {
            success: correct,
            pointsEarned: correct ? (this.currentQuestion?.points || 0) : 0,
            timeTaken,
            questionId: this.currentQuestion?.id || '',
            answeredCorrectly: correct
        };

        this.onComplete(result);
        return result;
    }

    /**
     * End without answering (for external cleanup)
     */
    end(): MinigameResult {
        this.stopTimer();

        return {
            success: false,
            pointsEarned: 0,
            timeTaken: Math.floor((Date.now() - this.startTime) / 1000),
            questionId: this.currentQuestion?.id || '',
            answeredCorrectly: false
        };
    }

    /**
     * Handle time running out
     */
    private handleTimeout(): void {
        this.stopTimer();

        // Record as incorrect
        if (this.currentQuestion) {
            questionService.recordAnswer(
                this.userId,
                this.currentQuestion.id,
                false,
                this.gameSeed
            );
        }

        const result: MinigameResult = {
            success: false,
            pointsEarned: 0,
            timeTaken: TIME_LIMITS[this.difficulty],
            questionId: this.currentQuestion?.id || '',
            answeredCorrectly: false
        };

        this.onComplete(result);
    }

    /**
     * Stop the timer
     */
    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // ============ GETTERS ============

    getQuestion(): TriviaQuestion | null {
        return this.currentQuestion;
    }

    getTimeRemaining(): number {
        return this.timeRemaining;
    }

    getDifficulty(): Difficulty {
        return this.difficulty;
    }

    getTimeLimit(): number {
        return TIME_LIMITS[this.difficulty];
    }

    /**
     * Set question externally (for testing specific question types)
     */
    setQuestion(question: TriviaQuestion): void {
        this.currentQuestion = question;
        this.difficulty = question.difficulty;
        this.timeRemaining = TIME_LIMITS[this.difficulty];
        this.onQuestionLoaded(question);
    }
}

// Factory function
export function createTriviaMinigame(): TriviaMinigame {
    return new TriviaMinigame();
}
