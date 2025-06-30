import { RedisClient } from '@devvit/redis';
import { 
  PlayerSession, 
  PlayerAnswer, 
  ScoringMode, 
  QuestionStats, 
  Question,
  LeaderboardEntry,
  Deck 
} from '../../shared/types/redditTypes';

// Redis key generators
export const getPlayerSessionKey = (postId: string, userId: string) => `game:${postId}:player:${userId}`;
export const getQuestionStatsKey = (postId: string, questionId: string) => `stats:${postId}:${questionId}`;
export const getLeaderboardKey = (postId: string) => `leaderboard:${postId}`;
export const getDeckKey = (postId: string) => `deck:${postId}`;

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
  answer,
}: {
  redis: RedisClient;
  postId: string;
  questionId: string;
  answer: string | string[];
}): Promise<void> => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  
  // Increment total responses
  await redis.incrby(`${statsKey}:total`, 1);
  
  if (typeof answer === 'string') {
    // Single card answer
    await redis.hincrby(statsKey, answer, 1);
  } else {
    // Sequence answer - increment each card
    for (const cardId of answer) {
      await redis.hincrby(statsKey, cardId, 1);
    }
  }
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
  
  // Get all card stats at once
  const cardStatsRaw = await redis.hgetall(statsKey);
  const cardStats: Record<string, number> = {};
  
  // Convert string values to numbers
  for (const [cardId, count] of Object.entries(cardStatsRaw)) {
    cardStats[cardId] = parseInt(count) || 0;
  }
  
  // Get total responses
  const totalResponses = await redis.get(`${statsKey}:total`);
  
  return {
    questionId,
    cardStats,
    totalResponses: totalResponses ? parseInt(totalResponses) : 0,
  };
};

function calculateSequenceSimilarity(seqA: string[], seqB: string[]): number {
  let matches = 0;
  for (let i = 0; i < Math.min(seqA.length, seqB.length); i++) {
    if (seqA[i] === seqB[i]) matches++;
  }
  return matches / Math.max(seqA.length, seqB.length);
}

export const calculateScore = ({
  scoringMode,
  question,
  answer,
  questionStats,
  timeRemaining,
}: {
  scoringMode: ScoringMode;
  question: Question;
  answer: string | string[];
  questionStats: QuestionStats;
  timeRemaining: number;
}): number => {
  const baseTimeBonus = Math.max(0, timeRemaining * 5); // 5 points per second remaining
  
  // Helper function to get card percentage
  const getCardPercentage = (cardId: string): number => {
    if (!questionStats || questionStats.totalResponses === 0) return 0;
    const count = questionStats.cardStats[cardId] || 0;
    return Math.round((count / questionStats.totalResponses) * 100);
  };

  // Handle sequence questions
  if (question.questionType === 'sequence') {
    const sequence = answer as string[];
    
    if (scoringMode === 'trivia') {
      // For trivia, compare to correct sequence
      const correctSequence = question.cards
        .filter(c => c.sequenceOrder !== undefined)
        .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
        .map(c => c.id);
      
      let correctPositions = 0;
      sequence.forEach((cardId, index) => {
        if (index < correctSequence.length && correctSequence[index] === cardId) {
          correctPositions++;
        }
      });
      
      const accuracy = correctPositions / correctSequence.length;
      return Math.round(accuracy * 100) + baseTimeBonus;
    } else {
      // For conformist/contrarian, calculate popularity score
      let totalPct = 0;
      sequence.forEach(cardId => {
        totalPct += getCardPercentage(cardId);
      });
      
      const averagePct = totalPct / sequence.length;
      
      if (scoringMode === 'conformist') {
        return Math.round(averagePct) + baseTimeBonus;
      } else {
        return Math.round(100 - averagePct) + baseTimeBonus;
      }
    }
  } else {
    // Handle multiple choice questions
    const cardId = answer as string;
    
    if (scoringMode === 'trivia') {
      const card = question.cards.find(c => c.id === cardId);
      return card?.isCorrect ? 100 + baseTimeBonus : 0;
    }
    
    const popularity = getCardPercentage(cardId) / 100;
    
    if (scoringMode === 'contrarian') {
      return Math.round((1 - popularity) * 100) + baseTimeBonus;
    } else {
      return Math.round(popularity * 100) + baseTimeBonus;
    }
  }
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
  
  // NEW: Check if user already has an entry
  const entryKey = `${leaderboardKey}:${entry.userId}`;
  const existingEntry = await redis.exists(entryKey);
  
  if (existingEntry) {
    console.log(`User ${entry.userId} already has a leaderboard entry. Skipping update.`);
    return;
  }

  console.log(`Updating leaderboard for post ${postId}:`, {
    userId: entry.userId,
    score: entry.score,
    username: entry.username
  });
  
  // Add entry to sorted set
  const zaddResult = await redis.zadd(leaderboardKey, { score: entry.score, member: entry.userId });
  console.log(`zadd result: ${zaddResult}`);
  
  // Store full entry data
  const setResult = await redis.set(entryKey, JSON.stringify(entry));
  console.log(`set result: ${setResult}`);
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
  
  console.log(`Fetching leaderboard for post ${postId}`);
  
  // Get all entries with scores
  const allEntries = await redis.zrange(leaderboardKey, 0, -1);
  console.log(`All entries in leaderboard:`, allEntries);
  
  // If no entries, return empty array
  if (allEntries.length === 0) {
    console.log('No leaderboard entries found');
    return [];
  }
  
  // Sort entries by score descending
  const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);
  
  // Get top entries
  const topEntries = sortedEntries.slice(0, limit);
  console.log(`Top entries:`, topEntries);
  
  const entries: LeaderboardEntry[] = [];
  
  // Fetch full entry data for each top entry
  for (const entry of topEntries) {
    const entryKey = `${leaderboardKey}:${entry.member}`;
    console.log(`Fetching entry for ${entry.member} from key ${entryKey}`);
    
    const entryData = await redis.get(entryKey);
    
    if (entryData) {
      try {
        const fullEntry = JSON.parse(entryData);
        console.log(`Found entry for ${entry.member}:`, fullEntry);
        entries.push(fullEntry);
      } catch (error) {
        console.error(`Error parsing leaderboard entry for ${entry.member}:`, error);
      }
    } else {
      console.warn(`No entry data found for ${entry.member}`);
    }
  }
  
  console.log(`Returning ${entries.length} leaderboard entries`);
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
  
  console.log(`Getting rank for user ${userId} in post ${postId}`);
  
  // Get all entries with scores
  const allEntries = await redis.zrange(leaderboardKey, 0, -1);
  
  if (allEntries.length === 0) return null;
  
  // Sort entries by score descending
  const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);
  
  // Find the index of the user in the sorted list
  const rankIndex = sortedEntries.findIndex(entry => entry.member === userId);
  
  if (rankIndex === -1) {
    console.log(`User ${userId} not found in leaderboard`);
    return null;
  }
  
  const rank = rankIndex + 1; // Convert to 1-based rank
  console.log(`Descending rank: ${rank}`);
  
  return rank;
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