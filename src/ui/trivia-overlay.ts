/**
 * Trivia UI Overlay
 * Displays trivia questions with timer, options, and media support
 */

import type { TriviaQuestion, Difficulty, MinigameResult } from '../minigames';
import { TriviaMinigame } from '../minigames';
import { TIME_LIMITS } from '../minigames';

export class TriviaUIOverlay {
    private container: HTMLElement | null = null;
    private minigame: TriviaMinigame;
    private onComplete: (result: MinigameResult) => void;

    constructor(onComplete: (result: MinigameResult) => void) {
        this.minigame = new TriviaMinigame();
        this.onComplete = onComplete;

        // Set up minigame callbacks
        this.minigame.onComplete = (result) => {
            this.showResult(result);
        };

        this.minigame.onTimeUpdate = (remaining) => {
            this.updateTimer(remaining);
        };

        this.minigame.onQuestionLoaded = (question) => {
            this.renderQuestion(question);
        };
    }

    /**
     * Show the trivia overlay
     */
    async show(userId: string, gameSeed: string, difficulty: Difficulty): Promise<void> {
        // Create overlay container
        this.container = document.createElement('div');
        this.container.id = 'trivia-overlay';
        this.container.className = 'trivia-overlay';
        this.container.innerHTML = this.getLoadingHTML();
        document.body.appendChild(this.container);

        // Add styles
        this.addStyles();

        // Initialize and start
        await this.minigame.initialize(userId, gameSeed, difficulty);
        this.minigame.start();
    }

    /**
     * Hide the overlay
     */
    hide(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    /**
     * Render the question
     */
    private renderQuestion(question: TriviaQuestion): void {
        if (!this.container) return;

        const timeLimit = TIME_LIMITS[question.difficulty];

        this.container.innerHTML = `
      <div class="trivia-modal">
        <div class="trivia-header">
          <div class="trivia-category">${this.getCategoryIcon(question.categoryId)}</div>
          <div class="trivia-timer">
            <span class="timer-value">${this.formatTime(timeLimit)}</span>
            <div class="timer-bar">
              <div class="timer-progress" style="width: 100%"></div>
            </div>
          </div>
          <div class="trivia-difficulty ${question.difficulty}">${this.getDifficultyLabel(question.difficulty)}</div>
        </div>
        
        ${this.getMediaHTML(question)}
        
        <div class="trivia-question">${question.questionAr}</div>
        
        <div class="trivia-options">
          ${question.options.map((opt, i) => `
            <button class="trivia-option" data-index="${i}">
              <span class="option-letter">${String.fromCharCode(1571 + i)}</span>
              <span class="option-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        
        <div class="trivia-points">+${question.points} نقطة</div>
      </div>
    `;

        // Add click handlers
        this.container.querySelectorAll('.trivia-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index') || '0');
                this.handleAnswer(index);
            });
        });
    }

    /**
     * Handle answer selection
     */
    private async handleAnswer(index: number): Promise<void> {
        // Disable all buttons
        this.container?.querySelectorAll('.trivia-option').forEach(btn => {
            (btn as HTMLButtonElement).disabled = true;
        });

        // Highlight selected
        const selectedBtn = this.container?.querySelector(`[data-index="${index}"]`);
        selectedBtn?.classList.add('selected');

        // Submit answer
        await this.minigame.submitAnswer(index);
    }

    /**
     * Show result
     */
    private showResult(result: MinigameResult): void {
        if (!this.container) return;

        const question = this.minigame.getQuestion();
        const correctIndex = question?.correctAnswer || 0;

        // Show correct/incorrect
        this.container.querySelectorAll('.trivia-option').forEach((btn, i) => {
            if (i === correctIndex) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected') && i !== correctIndex) {
                btn.classList.add('incorrect');
            }
        });

        // Show result message
        const resultDiv = document.createElement('div');
        resultDiv.className = `trivia-result ${result.success ? 'success' : 'failure'}`;
        resultDiv.innerHTML = `
      <div class="result-icon">${result.success ? '✓' : '✗'}</div>
      <div class="result-text">${result.success ? 'إجابة صحيحة!' : 'إجابة خاطئة'}</div>
      ${result.success ? `<div class="result-points">+${result.pointsEarned} نقطة</div>` : ''}
    `;

        this.container.querySelector('.trivia-modal')?.appendChild(resultDiv);

        // Auto-close after 2 seconds
        setTimeout(() => {
            this.hide();
            this.onComplete(result);
        }, 2000);
    }

    /**
     * Update timer display
     */
    private updateTimer(remaining: number): void {
        const timerValue = this.container?.querySelector('.timer-value');
        const timerProgress = this.container?.querySelector('.timer-progress') as HTMLElement;

        if (timerValue) {
            timerValue.textContent = this.formatTime(remaining);

            // Add warning class when low
            if (remaining <= 10) {
                timerValue.classList.add('warning');
            }
        }

        if (timerProgress) {
            const timeLimit = this.minigame.getTimeLimit();
            const percent = (remaining / timeLimit) * 100;
            timerProgress.style.width = `${percent}%`;

            if (remaining <= 10) {
                timerProgress.classList.add('warning');
            }
        }
    }

    /**
     * Get media HTML based on question type
     */
    private getMediaHTML(question: TriviaQuestion): string {
        if (question.type === 'audio' && question.mediaUrl) {
            return `
        <div class="trivia-media audio">
          <audio controls src="${question.mediaUrl}"></audio>
          <div class="media-hint">🎵 استمع للإجابة</div>
        </div>
      `;
        }

        if (question.type === 'video' && question.mediaUrl) {
            return `
        <div class="trivia-media video">
          <video controls src="${question.mediaUrl}" autoplay muted></video>
          <div class="media-hint">🎬 شاهد المقطع</div>
        </div>
      `;
        }

        return '';
    }

    /**
     * Format time as MM:SS
     */
    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get difficulty label in Arabic
     */
    private getDifficultyLabel(difficulty: Difficulty): string {
        const labels: Record<Difficulty, string> = {
            easy: 'سهل',
            medium: 'متوسط',
            hard: 'صعب'
        };
        return labels[difficulty];
    }

    /**
     * Get category icon
     */
    private getCategoryIcon(categoryId: string): string {
        const icons: Record<string, string> = {
            science: '🔬',
            geography: '🌍',
            history: '📜',
            sports: '⚽',
            entertainment: '🎬'
        };
        return icons[categoryId] || '❓';
    }

    /**
     * Get loading HTML
     */
    private getLoadingHTML(): string {
        return `
      <div class="trivia-modal loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">جاري تحميل السؤال...</div>
      </div>
    `;
    }

    /**
     * Add CSS styles
     */
    private addStyles(): void {
        if (document.getElementById('trivia-styles')) return;

        const style = document.createElement('style');
        style.id = 'trivia-styles';
        style.textContent = `
      .trivia-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        direction: rtl;
        font-family: 'Cairo', Arial, sans-serif;
      }
      
      .trivia-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 2px solid #e94560;
      }
      
      .trivia-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .trivia-category {
        font-size: 2rem;
      }
      
      .trivia-timer {
        text-align: center;
        flex: 1;
        margin: 0 20px;
      }
      
      .timer-value {
        font-size: 2rem;
        font-weight: bold;
        color: #fff;
      }
      
      .timer-value.warning {
        color: #e94560;
        animation: pulse 0.5s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .timer-bar {
        background: #333;
        height: 8px;
        border-radius: 4px;
        margin-top: 5px;
        overflow: hidden;
      }
      
      .timer-progress {
        background: linear-gradient(90deg, #4ade80, #22c55e);
        height: 100%;
        transition: width 1s linear;
      }
      
      .timer-progress.warning {
        background: linear-gradient(90deg, #e94560, #ff6b6b);
      }
      
      .trivia-difficulty {
        padding: 5px 15px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.9rem;
      }
      
      .trivia-difficulty.easy { background: #4ade80; color: #000; }
      .trivia-difficulty.medium { background: #fbbf24; color: #000; }
      .trivia-difficulty.hard { background: #e94560; color: #fff; }
      
      .trivia-media {
        margin: 20px 0;
        text-align: center;
      }
      
      .trivia-media audio,
      .trivia-media video {
        max-width: 100%;
        border-radius: 10px;
      }
      
      .media-hint {
        color: #aaa;
        margin-top: 10px;
      }
      
      .trivia-question {
        font-size: 1.5rem;
        color: #fff;
        text-align: center;
        margin: 25px 0;
        line-height: 1.6;
      }
      
      .trivia-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      .trivia-option {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 15px;
        color: #fff;
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .trivia-option:hover {
        background: rgba(233, 69, 96, 0.3);
        border-color: #e94560;
        transform: scale(1.02);
      }
      
      .trivia-option:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .trivia-option.selected {
        background: rgba(233, 69, 96, 0.5);
        border-color: #e94560;
      }
      
      .trivia-option.correct {
        background: rgba(74, 222, 128, 0.5);
        border-color: #4ade80;
      }
      
      .trivia-option.incorrect {
        background: rgba(239, 68, 68, 0.5);
        border-color: #ef4444;
      }
      
      .option-letter {
        background: rgba(255, 255, 255, 0.2);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .trivia-points {
        text-align: center;
        color: #fbbf24;
        font-size: 1.2rem;
        margin-top: 20px;
      }
      
      .trivia-result {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        padding: 40px;
        border-radius: 20px;
        background: rgba(0, 0, 0, 0.9);
      }
      
      .trivia-result.success .result-icon {
        color: #4ade80;
        font-size: 4rem;
      }
      
      .trivia-result.failure .result-icon {
        color: #ef4444;
        font-size: 4rem;
      }
      
      .result-text {
        color: #fff;
        font-size: 1.5rem;
        margin-top: 10px;
      }
      
      .result-points {
        color: #fbbf24;
        font-size: 1.2rem;
        margin-top: 10px;
      }
      
      .loading {
        text-align: center;
        color: #fff;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #333;
        border-top-color: #e94560;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @media (max-width: 600px) {
        .trivia-options {
          grid-template-columns: 1fr;
        }
        
        .trivia-question {
          font-size: 1.2rem;
        }
      }
    `;
        document.head.appendChild(style);
    }
}

// Factory function
export function showTriviaOverlay(
    userId: string,
    gameSeed: string,
    difficulty: Difficulty,
    onComplete: (result: MinigameResult) => void
): TriviaUIOverlay {
    const overlay = new TriviaUIOverlay(onComplete);
    overlay.show(userId, gameSeed, difficulty);
    return overlay;
}

// Import for direct type testing
import { questionService } from '../minigames/core/question-service';
// Note: TIME_LIMITS already imported from minigames at line 8

/**
 * Show trivia by specific question type (for testing audio/video)
 */
export async function showTriviaByType(
    questionType: 'text' | 'audio' | 'video',
    onComplete: (result: MinigameResult) => void
): Promise<void> {
    console.log(`[TriviaOverlay] Fetching ${questionType} question from Supabase...`);

    // Fetch question directly by type
    const question = await questionService.getRandomQuestionByType(questionType);

    if (!question) {
        console.error(`[TriviaOverlay] No ${questionType} question found in database!`);
        alert(`لا يوجد سؤال من نوع ${questionType} في قاعدة البيانات`);
        return;
    }

    console.log(`[TriviaOverlay] Found question:`, question);

    // Create overlay directly with the fetched question
    const overlay = new TriviaUIOverlayDirect(question, onComplete);
    overlay.show();
}

/**
 * Direct overlay that shows a pre-loaded question (bypasses service for testing)
 */
class TriviaUIOverlayDirect {
    private container: HTMLElement | null = null;
    private question: TriviaQuestion;
    private onComplete: (result: MinigameResult) => void;
    private startTime: number = 0;
    private timeRemaining: number = 0;
    private timerInterval: number | null = null;

    constructor(question: TriviaQuestion, onComplete: (result: MinigameResult) => void) {
        this.question = question;
        this.onComplete = onComplete;
        this.timeRemaining = TIME_LIMITS[question.difficulty];
    }

    show(): void {
        // Create overlay
        this.container = document.createElement('div');
        this.container.id = 'trivia-overlay';
        this.container.className = 'trivia-overlay';
        document.body.appendChild(this.container);

        // Add styles (reuse existing)
        if (!document.getElementById('trivia-styles')) {
            this.addStyles();
        }

        // Render question
        this.renderQuestion();

        // Start timer
        this.startTimer();
    }

    private startTimer(): void {
        this.startTime = Date.now();

        this.timerInterval = window.setInterval(() => {
            this.timeRemaining--;
            this.updateTimer();

            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    private renderQuestion(): void {
        if (!this.container) return;

        const q = this.question;

        this.container.innerHTML = `
            <div class="trivia-modal">
                <div class="trivia-header">
                    <div class="trivia-category">${this.getCategoryIcon(q.categoryId)}</div>
                    <div class="trivia-timer">
                        <span class="timer-value">${this.formatTime(this.timeRemaining)}</span>
                        <div class="timer-bar">
                            <div class="timer-progress" style="width: 100%"></div>
                        </div>
                    </div>
                    <div class="trivia-difficulty ${q.difficulty}">${this.getDifficultyLabel(q.difficulty)}</div>
                </div>
                
                ${this.getMediaHTML()}
                
                <div class="trivia-question">${q.questionAr}</div>
                
                <div class="trivia-options">
                    ${q.options.map((opt, i) => `
                        <button class="trivia-option" data-index="${i}">
                            <span class="option-letter">${String.fromCharCode(1571 + i)}</span>
                            <span class="option-text">${opt}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="trivia-points">+${q.points} نقطة</div>
            </div>
        `;

        // Add click handlers
        this.container.querySelectorAll('.trivia-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index') || '0');
                this.handleAnswer(index);
            });
        });
    }

    private getMediaHTML(): string {
        const q = this.question;

        if (q.type === 'audio' && q.mediaUrl) {
            return `
                <div class="trivia-media audio" style="position: relative; z-index: 10001;">
                    <audio controls autoplay src="${q.mediaUrl}" style="width: 100%; pointer-events: auto;"></audio>
                    <div class="media-hint">🎵 استمع للإجابة</div>
                </div>
            `;
        }

        if (q.type === 'video' && q.mediaUrl) {
            return `
                <div class="trivia-media video" style="position: relative; z-index: 10001;">
                    <video controls autoplay src="${q.mediaUrl}" style="width: 100%; max-height: 200px; pointer-events: auto;"></video>
                    <div class="media-hint">🎬 شاهد المقطع</div>
                </div>
            `;
        }


        return '';
    }

    private handleAnswer(index: number): void {
        this.stopTimer();

        // Disable all buttons
        this.container?.querySelectorAll('.trivia-option').forEach(btn => {
            (btn as HTMLButtonElement).disabled = true;
        });

        // Highlight selected
        const selectedBtn = this.container?.querySelector(`[data-index="${index}"]`);
        selectedBtn?.classList.add('selected');

        const correct = index === this.question.correctAnswer;

        // Show correct/incorrect
        this.container?.querySelectorAll('.trivia-option').forEach((btn, i) => {
            if (i === this.question.correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected') && !correct) {
                btn.classList.add('incorrect');
            }
        });

        // Show result
        setTimeout(() => {
            this.showResult(correct);
        }, 1000);
    }

    private handleTimeout(): void {
        this.stopTimer();
        this.showResult(false);
    }

    private showResult(correct: boolean): void {
        const result: MinigameResult = {
            success: correct,
            pointsEarned: correct ? this.question.points : 0,
            timeTaken: Math.floor((Date.now() - this.startTime) / 1000),
            questionId: this.question.id,
            answeredCorrectly: correct
        };

        // Show result message
        const resultDiv = document.createElement('div');
        resultDiv.className = `trivia-result ${result.success ? 'success' : 'failure'}`;
        resultDiv.innerHTML = `
            <div class="result-icon">${result.success ? '✓' : '✗'}</div>
            <div class="result-text">${result.success ? 'إجابة صحيحة!' : 'إجابة خاطئة'}</div>
            ${result.success ? `<div class="result-points">+${result.pointsEarned} نقطة</div>` : ''}
        `;

        this.container?.querySelector('.trivia-modal')?.appendChild(resultDiv);

        // Auto-close after 2 seconds
        setTimeout(() => {
            this.hide();
            this.onComplete(result);
        }, 2000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private hide(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    private updateTimer(): void {
        const timerValue = this.container?.querySelector('.timer-value');
        const timerProgress = this.container?.querySelector('.timer-progress') as HTMLElement;

        if (timerValue) {
            timerValue.textContent = this.formatTime(this.timeRemaining);
            if (this.timeRemaining <= 10) {
                timerValue.classList.add('warning');
            }
        }

        if (timerProgress) {
            const timeLimit = TIME_LIMITS[this.question.difficulty];
            const percent = (this.timeRemaining / timeLimit) * 100;
            timerProgress.style.width = `${percent}%`;
            if (this.timeRemaining <= 10) {
                timerProgress.classList.add('warning');
            }
        }
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private getDifficultyLabel(difficulty: Difficulty): string {
        const labels: Record<Difficulty, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
        return labels[difficulty];
    }

    private getCategoryIcon(categoryId: string): string {
        const icons: Record<string, string> = {
            science: '🔬', geography: '🌍', history: '📜', sports: '⚽', entertainment: '🎬'
        };
        return icons[categoryId] || '❓';
    }

    private addStyles(): void {
        // Check if styles already exist
        if (document.getElementById('trivia-styles')) return;

        const style = document.createElement('style');
        style.id = 'trivia-styles';
        style.textContent = `
            .trivia-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                direction: rtl;
                font-family: 'Cairo', Arial, sans-serif;
            }
            
            .trivia-modal {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 2px solid #e94560;
                position: relative;
            }
            
            .trivia-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .trivia-category { font-size: 2rem; }
            .trivia-timer { text-align: center; flex: 1; margin: 0 20px; }
            .timer-value { font-size: 2rem; font-weight: bold; color: #fff; }
            .timer-value.warning { color: #e94560; animation: pulse 0.5s infinite; }
            
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            
            .timer-bar { background: #333; height: 8px; border-radius: 4px; margin-top: 5px; overflow: hidden; }
            .timer-progress { background: linear-gradient(90deg, #4ade80, #22c55e); height: 100%; transition: width 1s linear; }
            .timer-progress.warning { background: linear-gradient(90deg, #e94560, #ff6b6b); }
            
            .trivia-difficulty { padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; }
            .trivia-difficulty.easy { background: #4ade80; color: #000; }
            .trivia-difficulty.medium { background: #fbbf24; color: #000; }
            .trivia-difficulty.hard { background: #e94560; color: #fff; }
            
            .trivia-media { margin: 20px 0; text-align: center; }
            .trivia-media audio, .trivia-media video { max-width: 100%; border-radius: 10px; }
            .media-hint { color: #aaa; margin-top: 10px; }
            
            .trivia-question { font-size: 1.5rem; color: #fff; text-align: center; margin: 25px 0; line-height: 1.6; }
            
            .trivia-options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            
            .trivia-option {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 15px;
                color: #fff;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .trivia-option:hover { background: rgba(233, 69, 96, 0.3); border-color: #e94560; transform: scale(1.02); }
            .trivia-option:disabled { cursor: not-allowed; opacity: 0.7; }
            .trivia-option.selected { background: rgba(233, 69, 96, 0.5); border-color: #e94560; }
            .trivia-option.correct { background: rgba(74, 222, 128, 0.5); border-color: #4ade80; }
            .trivia-option.incorrect { background: rgba(239, 68, 68, 0.5); border-color: #ef4444; }
            
            .option-letter { background: rgba(255, 255, 255, 0.2); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            
            .trivia-points { text-align: center; color: #fbbf24; font-size: 1.2rem; margin-top: 20px; }
            
            .trivia-result {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                padding: 40px;
                border-radius: 20px;
                background: rgba(0, 0, 0, 0.9);
            }
            
            .trivia-result.success .result-icon { color: #4ade80; font-size: 4rem; }
            .trivia-result.failure .result-icon { color: #ef4444; font-size: 4rem; }
            .result-text { color: #fff; font-size: 1.5rem; margin-top: 10px; }
            .result-points { color: #fbbf24; font-size: 1.2rem; margin-top: 10px; }
        `;
        document.head.appendChild(style);
    }
}
