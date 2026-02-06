import { TRIVIA_TIME_PER_QUESTION } from '../core/constants';
import { TriviaQuestion, getRandomTriviaQuestion, shuffleTriviaOptions } from '../core/trivia';
import { RNG } from '../core/rng';

/**
 * MinigameUI - Overlay UI for trivia minigame
 * Shows a trivia question with 4 multiple choice options
 * Player has 15 seconds to answer
 * Correct answer = 10 points, wrong answer = 0 points
 */

export class MinigameUI {
  private container: HTMLElement;
  private onComplete: (correct: boolean) => void;
  private timerInterval: number | null = null;
  private timerDisplay: HTMLElement;
  private questionDisplay: HTMLElement;
  private categoryDisplay: HTMLElement;
  private optionsContainer: HTMLElement;
  private selectedAnswer: number | null = null;
  private currentQuestion: TriviaQuestion | null = null;
  private startTime: number = 0;
  private isActive: boolean = false;
  private rng: RNG;

  constructor(container: HTMLElement, onComplete: (correct: boolean) => void, rng: RNG) {
    this.container = container;
    this.onComplete = onComplete;
    this.rng = rng;
    this.setupUI();
  }

  /**
   * Setup the minigame UI overlay
   */
  private setupUI(): void {
    this.container.className = 'minigame-overlay';
    this.container.style.display = 'none';

    // Category display
    this.categoryDisplay = document.createElement('div');
    this.categoryDisplay.className = 'minigame-category';
    this.container.appendChild(this.categoryDisplay);

    // Question display
    this.questionDisplay = document.createElement('div');
    this.questionDisplay.className = 'minigame-question';
    this.container.appendChild(this.questionDisplay);

    // Timer display
    this.timerDisplay = document.createElement('div');
    this.timerDisplay.className = 'minigame-timer';
    this.timerDisplay.textContent = '15';
    this.container.appendChild(this.timerDisplay);

    // Options container
    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'minigame-options';
    this.container.appendChild(this.optionsContainer);
  }

  /**
   * Create option buttons
   */
  private createOptions(question: TriviaQuestion): void {
    // Clear existing options
    this.optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'minigame-option';
      button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
      button.addEventListener('click', () => this.selectAnswer(index));
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.selectAnswer(index);
      }, { passive: false });
      this.optionsContainer.appendChild(button);
    });
  }

  /**
   * Handle answer selection
   */
  private selectAnswer(index: number): void {
    if (!this.isActive || this.selectedAnswer !== null) return;

    this.selectedAnswer = index;

    // Highlight selected answer
    const buttons = this.optionsContainer.querySelectorAll('.minigame-option');
    buttons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    // Check if correct and end game
    const correct = index === this.currentQuestion!.correctAnswer;

    // Show result
    buttons.forEach((btn, i) => {
      if (i === this.currentQuestion!.correctAnswer) {
        btn.classList.add('correct');
      } else if (i === index && !correct) {
        btn.classList.add('incorrect');
      }
    });

    // End after brief delay to show result
    setTimeout(() => {
      this.end(correct);
    }, 1500);
  }

  /**
   * Start the minigame with a random trivia question
   */
  start(): void {
    // Clear any stale timer from previous game
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.container.style.display = 'flex';
    this.selectedAnswer = null;
    this.startTime = Date.now();
    this.isActive = true;

    // Get random trivia question
    const question = getRandomTriviaQuestion(this.rng);
    // Shuffle options for variety
    this.currentQuestion = shuffleTriviaOptions(question, this.rng);

    // Display question
    this.categoryDisplay.textContent = `Category: ${this.currentQuestion.category}`;
    this.questionDisplay.textContent = this.currentQuestion.question;
    this.createOptions(this.currentQuestion);

    // Update timer
    let timeRemaining = TRIVIA_TIME_PER_QUESTION;
    this.timerDisplay.textContent = Math.ceil(timeRemaining / 1000).toString();

    // Start countdown timer
    this.timerInterval = window.setInterval(() => {
      if (this.selectedAnswer !== null) {
        // Answer already selected, stop timer
        if (this.timerInterval !== null) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        return;
      }

      timeRemaining = TRIVIA_TIME_PER_QUESTION - (Date.now() - this.startTime);

      if (timeRemaining <= 0) {
        // Time's up - wrong answer
        this.end(false);
      } else {
        this.timerDisplay.textContent = Math.ceil(timeRemaining / 1000).toString();
      }
    }, 100); // Update every 100ms

    // Safety timeout
    setTimeout(() => {
      if (this.isActive && this.selectedAnswer === null) {
        this.end(false);
      }
    }, TRIVIA_TIME_PER_QUESTION + 100);
  }

  /**
   * End the minigame
   */
  private end(correct: boolean): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Show result
    const resultText = correct ? 'Correct! +10 points!' : 'Wrong answer! +0 points';
    this.questionDisplay.textContent = resultText;
    this.timerDisplay.textContent = '0';

    // Complete after brief delay
    setTimeout(() => {
      this.hide();
      this.onComplete(correct);
    }, 2000);
  }

  /**
   * Hide the minigame UI
   */
  hide(): void {
    this.container.style.display = 'none';
    this.selectedAnswer = null;
    this.currentQuestion = null;
    this.optionsContainer.innerHTML = '';
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }
}

