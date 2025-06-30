export type ScoringMode = 'contrarian' | 'conformist' | 'trivia';
export type QuestionType = 'multiple-choice' | 'sequence';

export type GameCard = {
  id: string;
  text: string;
  isCorrect?: boolean; // For trivia mode
  sequenceOrder?: number; // For sequence questions
};

export type Question = {
  id: string;
  prompt: string;
  cards: GameCard[];
  timeLimit: number;
  authorUsername?: string;
  questionType?: QuestionType; // NEW: Type of question
};

export type Deck = {
  id: string;
  title: string;
  description: string;
  theme: string;
  flairText?: string;  
  flairCSS?: string;
  questions: Question[];
  
  createdBy: string;
  createdAt: number;
};

export type GameState = 'waiting' | 'playing' | 'finished';

export type PlayerAnswer = {
  questionId: string;
  answer: string | string[]; // CHANGED: Can be single ID or sequence
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


export type WebviewToBlockMessage = 
{ type: "INIT" ; 
}|{ 
  type: "CREATE_NEW_POST"; 
  payload: { 
    postData: Deck;
  }
}|{
  type: "GET_LEADERBOARD_DATA" 
}|{
  type : 'COMPLETE_GAME';
  payload : {answers: PlayerAnswer[], totalScore: number , sessionData : PlayerSession }
}|{
  type : "ADD_QUESTION";
  payload: {
    question: Question;
  }
}

export type BlocksToWebviewMessage = {
  type: "INIT_RESPONSE";
  payload: {
    postId: string;
    deck : Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    allQuestionStats?: QuestionStats[] | null;
    // authorId: string;
    // userId : string;
    // authorName: string;
    // posterName: string;
  };
  } |
  // {
  //   type: "GIVE_PLAYER_DATA";
  //   payload: { 
  //     userName : string;
  //     userAvatar : string;
  //     playerData : GameUserData 
  //   };
  // } |
  {
    type : "CONFIRM_SAVE_PLAYER_DATA"
    payload : { isSaved : boolean}
  } | {
    type : "GIVE_LEADERBOARD_DATA";
    payload : {
      leaderboard: LeaderboardEntry[];
      playerRank: number | null;
      playerScore: number | null;
    }
  }
 ;

export type DevvitMessage = {
  type: "devvit-message";
  data: { message: BlocksToWebviewMessage };
};


