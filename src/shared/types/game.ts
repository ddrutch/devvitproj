export type ScoringMode = 'contrarian' | 'conformist' | 'trivia';

export type GameCard = {
  id: string;
  text: string;
  isCorrect?: boolean; // For trivia mode
};

export type Question = {
  id: string;
  prompt: string;
  cards: GameCard[];
  timeLimit: number; // in seconds
  authorUsername?: string; // For user-contributed questions
};

export type Deck = {
  id: string;
  title: string;
  description: string;
  theme: string;
  questions: Question[];
  createdBy: string;
  createdAt: number;
};

export type GameState = 'waiting' | 'playing' | 'finished';

export type PlayerAnswer = {
  questionId: string;
  cardId: string;
  timeRemaining: number;
  timestamp: number;
};

export type PlayerSession = {
  userId: string;
  username: string;
  scoringMode: ScoringMode;
  answers: PlayerAnswer[];
  totalScore: number;
  currentQuestionIndex: number;
  gameState: GameState;
  startedAt: number;
  finishedAt?: number;
};

export type QuestionStats = {
  questionId: string;
  cardStats: Record<string, number>; // cardId -> count
  totalResponses: number;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  scoringMode: ScoringMode;
  completedAt: number;
};

// API Response Types
type Response<T> = { status: 'error'; message: string } | ({ status: 'success' } & T);

export type InitGameResponse = Response<{
  deck: Deck;
  playerSession?: PlayerSession;
}>;

export type SubmitAnswerResponse = Response<{
  score: number;
  questionStats: QuestionStats;
  isGameComplete: boolean;
  nextQuestionIndex?: number;
}>;

export type LeaderboardResponse = Response<{
  leaderboard: LeaderboardEntry[];
  playerRank?: number;
  playerScore?: number;
}>;

export type CreateQuestionResponse = Response<{
  questionId: string;
}>;

export type CreateDeckResponse = Response<{
  deckId: string;
  postId: string;
}>;