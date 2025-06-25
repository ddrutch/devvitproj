import { RedisClient } from '@devvit/redis';
import { 
  PlayerSession, 
  PlayerAnswer, 
  ScoringMode, 
  QuestionStats, 
  LeaderboardEntry,
  Deck 
} from '../../shared/types/game';

// Redis key generators
const getPlayerSessionKey = (postId: string, userId: string) => `game:${postId}:player:${userId}`;
const getQuestionStatsKey = (postId: string, questionId: string) => `stats:${postId}:${questionId}`;
const getLeaderboardKey = (postId: string) => `leaderboard:${postId}`;
const getDeckKey = (postId: string) => `deck:${postId}`;

export const initPlayerSession = async ({
  redis,
  postId,
  userId,
  username,
  scoringMode,
  deck,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
  username: string;
  scoringMode: ScoringMode;
  deck: Deck;
}): Promise<PlayerSession> => {
  const session: PlayerSession = {
    userId,
    username,
    scoringMode,
    answers: [],
    totalScore: 0,
    currentQuestionIndex: 0,
    gameState: 'playing',
    startedAt: Date.now(),
  };

  await redis.set(getPlayerSessionKey(postId, userId), JSON.stringify(session));
  return session;
};

export const getPlayerSession = async ({
  redis,
  postId,
  userId,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
}): Promise<PlayerSession | null> => {
  const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
  return sessionData ? JSON.parse(sessionData) : null;
};

export const updatePlayerSession = async ({
  redis,
  postId,
  session,
}: {
  redis: RedisClient;
  postId: string;
  session: PlayerSession;
}): Promise<void> => {
  await redis.set(getPlayerSessionKey(postId, session.userId), JSON.stringify(session));
};

export const recordAnswer = async ({
  redis,
  postId,
  questionId,
  cardId,
}: {
  redis: RedisClient;
  postId: string;
  questionId: string;
  cardId: string;
}): Promise<void> => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  const cardKey = `${statsKey}:${cardId}`;
  
  // Increment card count and total responses
  await redis.incr(cardKey);
  await redis.incr(`${statsKey}:total`);
};

export const getQuestionStats = async ({
  redis,
  postId,
  questionId,
  cardIds,
}: {
  redis: RedisClient;
  postId: string;
  questionId: string;
  cardIds: string[];
}): Promise<QuestionStats> => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  const cardStats: Record<string, number> = {};
  
  // Get counts for each card
  for (const cardId of cardIds) {
    const count = await redis.get(`${statsKey}:${cardId}`);
    cardStats[cardId] = count ? parseInt(count) : 0;
  }
  
  const totalResponses = await redis.get(`${statsKey}:total`);
  
  return {
    questionId,
    cardStats,
    totalResponses: totalResponses ? parseInt(totalResponses) : 0,
  };
};

export const calculateScore = ({
  scoringMode,
  cardId,
  questionStats,
  timeRemaining,
  isCorrect,
}: {
  scoringMode: ScoringMode;
  cardId: string;
  questionStats: QuestionStats;
  timeRemaining: number;
  isCorrect?: boolean;
}): number => {
  const baseTimeBonus = Math.max(0, timeRemaining * 5); // 5 points per second remaining
  
  if (scoringMode === 'trivia') {
    return isCorrect ? 100 + baseTimeBonus : 0;
  }
  
  const cardCount = questionStats.cardStats[cardId] || 0;
  const totalResponses = Math.max(1, questionStats.totalResponses);
  const popularity = cardCount / totalResponses;
  
  if (scoringMode === 'contrarian') {
    // Score higher for less popular choices
    const contrarianScore = Math.round((1 - popularity) * 100);
    return contrarianScore + baseTimeBonus;
  }
  
  if (scoringMode === 'conformist') {
    // Score higher for more popular choices
    const conformistScore = Math.round(popularity * 100);
    return conformistScore + baseTimeBonus;
  }
  
  return 0;
};

export const updateLeaderboard = async ({
  redis,
  postId,
  entry,
}: {
  redis: RedisClient;
  postId: string;
  entry: LeaderboardEntry;
}): Promise<void> => {
  const leaderboardKey = getLeaderboardKey(postId);
  await redis.zadd(leaderboardKey, { [entry.userId]: entry.score });
  
  // Store full entry data
  const entryKey = `${leaderboardKey}:${entry.userId}`;
  await redis.set(entryKey, JSON.stringify(entry));
};

export const getLeaderboard = async ({
  redis,
  postId,
  limit = 10,
}: {
  redis: RedisClient;
  postId: string;
  limit?: number;
}): Promise<LeaderboardEntry[]> => {
  const leaderboardKey = getLeaderboardKey(postId);
  const topUserIds = await redis.zrevrange(leaderboardKey, 0, limit - 1);
  
  const entries: LeaderboardEntry[] = [];
  for (const userId of topUserIds) {
    const entryData = await redis.get(`${leaderboardKey}:${userId}`);
    if (entryData) {
      entries.push(JSON.parse(entryData));
    }
  }
  
  return entries;
};

export const getPlayerRank = async ({
  redis,
  postId,
  userId,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
}): Promise<number | null> => {
  const leaderboardKey = getLeaderboardKey(postId);
  const rank = await redis.zrevrank(leaderboardKey, userId);
  return rank !== null ? rank + 1 : null; // Convert to 1-based ranking
};

export const saveDeck = async ({
  redis,
  postId,
  deck,
}: {
  redis: RedisClient;
  postId: string;
  deck: Deck;
}): Promise<void> => {
  await redis.set(getDeckKey(postId), JSON.stringify(deck));
};

export const getDeck = async ({
  redis,
  postId,
}: {
  redis: RedisClient;
  postId: string;
}): Promise<Deck | null> => {
  const deckData = await redis.get(getDeckKey(postId));
  return deckData ? JSON.parse(deckData) : null;
};