/**
 * Question Service
 * Handles fetching questions with business logic for trial/paid users
 */

import { supabase, TABLES, BUCKETS, isSupabaseConfigured } from './supabase-client';
import type { TriviaQuestion, Category, Difficulty, IQuestionService } from './types';

export class QuestionService implements IQuestionService {

    /**
     * Get a random question the user hasn't seen
     * - Free users: only trial questions
     * - Paid users: full pool, excluding seen questions
     */
    async getRandomQuestion(userId: string, difficulty?: Difficulty): Promise<TriviaQuestion | null> {
        if (!isSupabaseConfigured()) {
            console.warn('[QuestionService] Supabase not configured, using mock data');
            return this.getMockQuestion(difficulty);
        }

        try {
            // Get user's seen question IDs
            const seenIds = await this.getSeenQuestionIds(userId);

            // Check if user is paid
            const isPaid = await this.isPaidUser(userId);

            // Build query
            let query = supabase
                .from(TABLES.QUESTIONS)
                .select('*');

            // Filter by difficulty if specified
            if (difficulty) {
                query = query.eq('difficulty', difficulty);
            }

            // Exclude seen questions
            if (seenIds.length > 0) {
                query = query.not('id', 'in', `(${seenIds.join(',')})`);
            }

            // Free users: only trial questions
            if (!isPaid) {
                query = query.eq('is_trial', true);
            }

            // Get random question
            const { data, error } = await query
                .order('id', { ascending: false }) // Will use random() in RLS
                .limit(1)
                .single();

            if (error || !data) {
                console.error('[QuestionService] Error fetching question:', error);
                return null;
            }

            return this.mapToQuestion(data);
        } catch (err) {
            console.error('[QuestionService] Exception:', err);
            return null;
        }
    }

    /**
     * Get a random question by specific type (text, audio, video)
     * For testing different media types
     */
    async getRandomQuestionByType(questionType: 'text' | 'audio' | 'video'): Promise<TriviaQuestion | null> {
        if (!isSupabaseConfigured()) {
            console.warn('[QuestionService] Supabase not configured');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.QUESTIONS)
                .select('*')
                .eq('type', questionType)
                .eq('is_trial', true)
                .limit(1)
                .single();

            if (error || !data) {
                console.error(`[QuestionService] No ${questionType} question found:`, error);
                return null;
            }

            return this.mapToQuestion(data);
        } catch (err) {
            console.error('[QuestionService] Exception:', err);
            return null;
        }
    }

    /**
     * Get all categories
     */
    async getCategories(): Promise<Category[]> {
        if (!isSupabaseConfigured()) {
            return this.getMockCategories();
        }

        const { data, error } = await supabase
            .from(TABLES.CATEGORIES)
            .select('*')
            .order('order', { ascending: true });

        if (error) {
            console.error('[QuestionService] Error fetching categories:', error);
            return [];
        }

        return data.map(c => ({
            id: c.id,
            nameAr: c.name_ar,
            nameEn: c.name_en,
            icon: c.icon,
            order: c.order
        }));
    }

    /**
     * Record that a user answered a question
     */
    async recordAnswer(
        userId: string,
        questionId: string,
        correct: boolean,
        gameSeed: string
    ): Promise<void> {
        if (!isSupabaseConfigured()) {
            console.log('[QuestionService] Mock: Recording answer', { userId, questionId, correct });
            return;
        }

        const { error } = await supabase
            .from(TABLES.USER_QUESTION_HISTORY)
            .insert({
                user_id: userId,
                question_id: questionId,
                answered_correctly: correct,
                game_seed: gameSeed,
                seen_at: new Date().toISOString()
            });

        if (error) {
            console.error('[QuestionService] Error recording answer:', error);
        }
    }

    /**
     * Get IDs of questions user has already seen
     */
    async getSeenQuestionIds(userId: string): Promise<string[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        const { data, error } = await supabase
            .from(TABLES.USER_QUESTION_HISTORY)
            .select('question_id')
            .eq('user_id', userId);

        if (error) {
            console.error('[QuestionService] Error fetching seen questions:', error);
            return [];
        }

        return data.map(h => h.question_id);
    }

    /**
     * Check if user has paid for full access
     */
    private async isPaidUser(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from(TABLES.USERS)
            .select('is_paid')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return false;
        }

        return data.is_paid === true;
    }

    /**
     * Get media URL from storage
     */
    getMediaUrl(mediaPath: string): string {
        if (!mediaPath) return '';

        const { data } = supabase.storage
            .from(BUCKETS.TRIVIA_MEDIA)
            .getPublicUrl(mediaPath);

        return data.publicUrl;
    }

    /**
     * Map database row to TriviaQuestion
     */
    private mapToQuestion(data: any): TriviaQuestion {
        return {
            id: data.id,
            categoryId: data.category_id,
            type: data.type,
            difficulty: data.difficulty,
            questionAr: data.question_ar,
            mediaUrl: data.media_path ? this.getMediaUrl(data.media_path) : undefined,
            options: data.options,
            correctAnswer: data.correct_answer,
            points: data.points,
            isTrial: data.is_trial
        };
    }

    // ============ MOCK DATA FOR DEVELOPMENT ============

    private getMockQuestion(difficulty?: Difficulty): TriviaQuestion {
        const mockQuestions: TriviaQuestion[] = [
            {
                id: 'mock-1',
                categoryId: 'science',
                type: 'text',
                difficulty: 'easy',
                questionAr: 'ما هو الرمز الكيميائي للذهب؟',
                options: ['Go', 'Au', 'Gd', 'Ag'],
                correctAnswer: 1,
                points: 10,
                isTrial: true
            },
            {
                id: 'mock-2',
                categoryId: 'geography',
                type: 'text',
                difficulty: 'medium',
                questionAr: 'ما هي عاصمة المملكة العربية السعودية؟',
                options: ['جدة', 'الرياض', 'مكة', 'الدمام'],
                correctAnswer: 1,
                points: 20,
                isTrial: true
            },
            {
                id: 'mock-3',
                categoryId: 'history',
                type: 'text',
                difficulty: 'hard',
                questionAr: 'في أي عام تأسست المملكة العربية السعودية؟',
                options: ['1930', '1932', '1935', '1940'],
                correctAnswer: 1,
                points: 30,
                isTrial: true
            }
        ];

        if (difficulty) {
            const filtered = mockQuestions.filter(q => q.difficulty === difficulty);
            return filtered[Math.floor(Math.random() * filtered.length)] || mockQuestions[0];
        }

        return mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
    }

    private getMockCategories(): Category[] {
        return [
            { id: 'science', nameAr: 'العلوم', nameEn: 'Science', icon: '🔬', order: 1 },
            { id: 'geography', nameAr: 'الجغرافيا', nameEn: 'Geography', icon: '🌍', order: 2 },
            { id: 'history', nameAr: 'التاريخ', nameEn: 'History', icon: '📜', order: 3 },
            { id: 'sports', nameAr: 'الرياضة', nameEn: 'Sports', icon: '⚽', order: 4 },
            { id: 'entertainment', nameAr: 'الترفيه', nameEn: 'Entertainment', icon: '🎬', order: 5 }
        ];
    }
}

// Export singleton instance
export const questionService = new QuestionService();
