import { RNG } from './rng';

/**
 * Trivia questions and answers
 * Various categories: science, history, geography, entertainment, sports, technology
 */

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer (0-3)
  category: string;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Science
  { question: 'What is the chemical symbol for gold?', options: ['Go', 'Au', 'Gd', 'Ag'], correctAnswer: 1, category: 'Science' },
  { question: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], correctAnswer: 1, category: 'Science' },
  { question: 'What is the hardest natural substance on Earth?', options: ['Iron', 'Diamond', 'Platinum', 'Titanium'], correctAnswer: 1, category: 'Science' },
  { question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctAnswer: 2, category: 'Science' },
  { question: 'What is the speed of light in vacuum (approximately)?', options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'], correctAnswer: 0, category: 'Science' },
  
  // Geography
  { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctAnswer: 3, category: 'Geography' },
  { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correctAnswer: 2, category: 'Geography' },
  { question: 'What is the tallest mountain in the world?', options: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'], correctAnswer: 1, category: 'Geography' },
  { question: 'Which continent is the largest by land area?', options: ['Africa', 'North America', 'Asia', 'South America'], correctAnswer: 2, category: 'Geography' },
  { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctAnswer: 1, category: 'Geography' },
  
  // History
  { question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: 2, category: 'History' },
  { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Michelangelo'], correctAnswer: 2, category: 'History' },
  { question: 'Which ancient civilization built the pyramids?', options: ['Greeks', 'Romans', 'Egyptians', 'Mayans'], correctAnswer: 2, category: 'History' },
  { question: 'What year did the Berlin Wall fall?', options: ['1987', '1989', '1991', '1993'], correctAnswer: 1, category: 'History' },
  { question: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Michael Collins', 'Yuri Gagarin'], correctAnswer: 1, category: 'History' },
  
  // Entertainment
  { question: 'Which movie won the Academy Award for Best Picture in 2020?', options: ['1917', 'Parasite', 'Joker', 'Once Upon a Time...'], correctAnswer: 1, category: 'Entertainment' },
  { question: 'What is the highest-grossing film of all time?', options: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars'], correctAnswer: 0, category: 'Entertainment' },
  { question: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'], correctAnswer: 1, category: 'Entertainment' },
  { question: 'Which band performed "Bohemian Rhapsody"?', options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'], correctAnswer: 2, category: 'Entertainment' },
  { question: 'What is the name of the wizard school in Harry Potter?', options: ['Hogwarts', 'Beauxbatons', 'Durmstrang', 'Ilvermorny'], correctAnswer: 0, category: 'Entertainment' },
  
  // Technology
  { question: 'What does CPU stand for?', options: ['Computer Processing Unit', 'Central Processing Unit', 'Central Program Unit', 'Computer Program Unit'], correctAnswer: 1, category: 'Technology' },
  { question: 'Which company created the iPhone?', options: ['Samsung', 'Google', 'Apple', 'Microsoft'], correctAnswer: 2, category: 'Technology' },
  { question: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Markup Language'], correctAnswer: 0, category: 'Technology' },
  { question: 'What year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correctAnswer: 2, category: 'Technology' },
  { question: 'What does URL stand for?', options: ['Uniform Resource Locator', 'Universal Resource Link', 'Uniform Resource Link', 'Universal Resource Locator'], correctAnswer: 0, category: 'Technology' },
  
  // Sports
  { question: 'How many players are on a basketball team on the court?', options: ['4', '5', '6', '7'], correctAnswer: 1, category: 'Sports' },
  { question: 'Which country won the FIFA World Cup in 2018?', options: ['Brazil', 'Germany', 'France', 'Argentina'], correctAnswer: 2, category: 'Sports' },
  { question: 'In which sport would you perform a slam dunk?', options: ['Volleyball', 'Tennis', 'Basketball', 'Soccer'], correctAnswer: 2, category: 'Sports' },
  { question: 'How many rings are in the Olympic flag?', options: ['4', '5', '6', '7'], correctAnswer: 1, category: 'Sports' },
  { question: 'What is the national sport of Japan?', options: ['Baseball', 'Sumo Wrestling', 'Karate', 'Judo'], correctAnswer: 1, category: 'Sports' },
  
  // General Knowledge
  { question: 'What is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], correctAnswer: 1, category: 'General' },
  { question: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], correctAnswer: 2, category: 'General' },
  { question: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], correctAnswer: 2, category: 'General' },
  { question: 'Which animal is known as the "King of the Jungle"?', options: ['Tiger', 'Lion', 'Leopard', 'Cheetah'], correctAnswer: 1, category: 'General' },
  { question: 'What is the main ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Pepper', 'Onion'], correctAnswer: 1, category: 'General' },
  
  // Math
  { question: 'What is 15 × 15?', options: ['200', '225', '250', '275'], correctAnswer: 1, category: 'Math' },
  { question: 'What is the square root of 64?', options: ['6', '7', '8', '9'], correctAnswer: 2, category: 'Math' },
  { question: 'How many degrees are in a right angle?', options: ['45', '90', '180', '360'], correctAnswer: 1, category: 'Math' },
  { question: 'What is 2 to the power of 5?', options: ['16', '24', '32', '40'], correctAnswer: 2, category: 'Math' },
  { question: 'What is π (pi) approximately equal to?', options: ['3.14', '3.41', '2.71', '4.14'], correctAnswer: 0, category: 'Math' },
  
  // Food & Culture
  { question: 'Which country is sushi from?', options: ['China', 'Korea', 'Japan', 'Thailand'], correctAnswer: 2, category: 'Food' },
  { question: 'What is the main ingredient in traditional pizza dough?', options: ['Corn', 'Rice', 'Wheat Flour', 'Potato'], correctAnswer: 2, category: 'Food' },
  { question: 'Which vegetable is Popeye known for eating?', options: ['Broccoli', 'Carrots', 'Spinach', 'Cabbage'], correctAnswer: 2, category: 'Food' },
  { question: 'What is the national dish of Italy?', options: ['Pizza', 'Pasta', 'Risotto', 'Lasagna'], correctAnswer: 1, category: 'Food' },
  { question: 'Which fruit is typically associated with the color orange?', options: ['Apple', 'Orange', 'Banana', 'Grape'], correctAnswer: 1, category: 'Food' }
];

/**
 * Get a random trivia question
 */
export function getRandomTriviaQuestion(rng: RNG): TriviaQuestion {
  return rng.pick(TRIVIA_QUESTIONS);
}

/**
 * Shuffle array options (but keep track of correct answer index)
 */
export function shuffleTriviaOptions(question: TriviaQuestion, rng: RNG): TriviaQuestion {
  const shuffled = [...question.options];
  const correctAnswer = shuffled[question.correctAnswer];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Find new index of correct answer
  const newCorrectIndex = shuffled.indexOf(correctAnswer);
  
  return {
    question: question.question,
    options: shuffled,
    correctAnswer: newCorrectIndex,
    category: question.category
  };
}

