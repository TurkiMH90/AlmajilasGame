-- ============================================
-- Supabase Migration: Trivia Minigame Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'video')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_ar TEXT NOT NULL,
    media_path TEXT,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
    points INTEGER NOT NULL DEFAULT 10,
    is_trial BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER QUESTION HISTORY TABLE
-- ============================================
CREATE TABLE user_question_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_correctly BOOLEAN NOT NULL DEFAULT false,
    game_seed TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_is_trial ON questions(is_trial);
CREATE INDEX idx_history_user ON user_question_history(user_id);
CREATE INDEX idx_history_question ON user_question_history(question_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;

-- Categories: Public read
CREATE POLICY "Categories are viewable by everyone" 
ON categories FOR SELECT 
USING (true);

-- Questions: Public read
CREATE POLICY "Questions are viewable by everyone" 
ON questions FOR SELECT 
USING (true);

-- Users: Own row only
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- History: Own records only
CREATE POLICY "Users can view own history" 
ON user_question_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" 
ON user_question_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample categories
INSERT INTO categories (name_ar, name_en, icon, "order") VALUES
('العلوم', 'Science', '🔬', 1),
('الجغرافيا', 'Geography', '🌍', 2),
('التاريخ', 'History', '📜', 3),
('الرياضة', 'Sports', '⚽', 4),
('الترفيه', 'Entertainment', '🎬', 5);

-- Insert sample trial questions
INSERT INTO questions (category_id, type, difficulty, question_ar, options, correct_answer, points, is_trial) 
SELECT 
    c.id,
    'text',
    'easy',
    'ما هو الرمز الكيميائي للذهب؟',
    '["Go", "Au", "Gd", "Ag"]'::jsonb,
    1,
    10,
    true
FROM categories c WHERE c.name_en = 'Science';

INSERT INTO questions (category_id, type, difficulty, question_ar, options, correct_answer, points, is_trial) 
SELECT 
    c.id,
    'text',
    'medium',
    'ما هي عاصمة المملكة العربية السعودية؟',
    '["جدة", "الرياض", "مكة", "الدمام"]'::jsonb,
    1,
    20,
    true
FROM categories c WHERE c.name_en = 'Geography';

INSERT INTO questions (category_id, type, difficulty, question_ar, options, correct_answer, points, is_trial) 
SELECT 
    c.id,
    'text',
    'hard',
    'في أي عام تأسست المملكة العربية السعودية؟',
    '["1930", "1932", "1935", "1940"]'::jsonb,
    1,
    30,
    true
FROM categories c WHERE c.name_en = 'History';
