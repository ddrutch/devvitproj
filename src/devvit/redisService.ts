import { Devvit, TriggerContext } from "@devvit/public-api";
import { LeaderboardEntry } from "../shared/types/redditTypes.js";
import { PlayerSession } from "../shared/types/redditTypes.js";
import { Deck } from "../shared/types/redditTypes.js";
import { Question } from "../shared/types/redditTypes.js";
import { PlayerAnswer } from "../shared/types/redditTypes.js";

import { ScoringMode ,  QuestionStats} from "../shared/types/redditTypes.js";

export const getPlayerSessionKey = (postId: string, userId: string) => `game:${postId}:player:${userId}`;
export const getQuestionStatsKey = (postId: string, questionId: string) => `stats:${postId}:${questionId}`;
export const getLeaderboardKey = (postId: string) => `leaderboard:${postId}`;
export const getDeckKey = (postId: string) => `deck:${postId}`;

Devvit.configure({
    redis: true,
    realtime: true,
    redditAPI: true,

});


export type RedisService = {
    // Leaderboard
    getLeaderboard: (postId : string) => Promise<LeaderboardEntry[]>;
    updateLeaderboard: (postId : string, entry : LeaderboardEntry) => Promise<void>;

    //player Data
    saveUserGameData: (postId: string, userId: string, answers: PlayerAnswer[], totalScore: number, sessionData : PlayerSession) => Promise<void>;
    getPlayerRank: (postId: string, userId: string) => Promise<number | null>;
    getPlayerSession: (postId: string, userId: string) => Promise<PlayerSession | null>;
    getQuestionStats: (postId: string, deck : Deck) => Promise<QuestionStats[] | null>;

    //post
    getDeck: (postId: string) => Promise<Deck | null>;
    saveDeck: (postId: string, deck: Deck) => Promise<void>;

    //utils
    addQuestionToDeck: (postId: string, question: Question) => Promise<void>;
}


export function createRedisService(context: Devvit.Context|TriggerContext): RedisService {
    const { redis, realtime } = context;

    function calculateScoreForQuestion({
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
    }): number {
        const baseTimeBonus = Math.max(0, timeRemaining * 5);
        
        const getCardPercentage = (cardId: string): number => {
            if (!questionStats || questionStats.totalResponses === 0) return 0;
            const count = questionStats.cardStats[cardId] || 0;
            return Math.round((count / questionStats.totalResponses) * 100);
        };

        if (question.questionType === 'sequence') {
            const sequence = answer as string[];
            
            if (scoringMode === 'trivia') {
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
    }

    return {

        getPlayerSession: async (postId: string, userId: string): Promise<PlayerSession | null> => {
            const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
            console.log(`Retrieved player session for post ${postId} and user ${userId}`, sessionData);
            return sessionData ? JSON.parse(sessionData) as PlayerSession : null;
        },

        getLeaderboard: async (postId) => {
            const leaderboardKey = `leaderboard:${postId}`;
            // Get all entries with scores
            const allEntries = await redis.zRange(leaderboardKey, 0, -1);
            
            if (allEntries.length === 0) return [];
            
            // Sort entries by score descending
            const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);

            // Get top entries
            const topEntries = sortedEntries.slice(0, 10);
            
            const entries: LeaderboardEntry[] = [];
            
            // Fetch full entry data for each top entry
            for (const entry of topEntries) {
                const entryKey = `${leaderboardKey}:${entry.member}`;
                const entryData = await redis.get(entryKey);
                
                if (entryData) {
                    try {
                        entries.push(JSON.parse(entryData));
                    } catch (error) {
                        console.error(`Error parsing leaderboard entry: ${error}`);
                    }
                }
            }
            
            return entries;
        },

        saveUserGameData: async (postId: string, userId: string, answers: PlayerAnswer[], totalScore: number, session : PlayerSession) => {
            try {
                // 1. Get player session
                // const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
                // if (!sessionData) {
                //     console.error(`No session found for user ${userId} on post ${postId}`);
                //     return;
                // }
                // const session: PlayerSession = JSON.parse(sessionData);

                // 2. Get deck
                const deckData = await redis.get(getDeckKey(postId));
                if (!deckData) {
                    console.error(`No deck found for post ${postId}`);
                    return;
                }
                const deck: Deck = JSON.parse(deckData);

                // 3. Process all answers and calculate accurate scores
                let finalScore = 0;
                
                for (const answer of answers) {
                    const question = deck.questions.find(q => q.id === answer.questionId);
                    if (!question) continue;

                    // Record answer in stats
                    const statsKey = getQuestionStatsKey(postId, question.id);
                    
                    // Increment total responses
                    await redis.incrBy(`${statsKey}:total`, 1);
                    
                    // Record answer
                    if (typeof answer.answer === 'string') {
                        await redis.hIncrBy(statsKey, answer.answer, 1);
                    } else {
                        for (const cardId of answer.answer) {
                            await redis.hIncrBy(statsKey, cardId, 1);
                        }
                    }

                    // Get updated stats for scoring
                    const totalResponses = parseInt(await redis.get(`${statsKey}:total`) || "0");
                    const cardStatsRaw = await redis.hGetAll(statsKey);
                    const cardStats: Record<string, number> = {};
                    for (const [cardId, count] of Object.entries(cardStatsRaw)) {
                        cardStats[cardId] = parseInt(count as string) || 0;
                    }
                    
                    const questionStats: QuestionStats = {
                        questionId: question.id,
                        cardStats,
                        totalResponses,
                    };

                    // Calculate score with real community data
                    const questionScore = calculateScoreForQuestion({
                        scoringMode: session.scoringMode,
                        question,
                        answer: answer.answer,
                        questionStats,
                        timeRemaining: answer.timeRemaining,
                    });

                    finalScore += questionScore;
                }

                // 4. Update session to finished state
                const finishedSession: PlayerSession = {
                    ...session,
                    answers,
                    totalScore: finalScore,
                    gameState: 'finished',
                    finishedAt: Date.now(),
                };

                await redis.set(
                    getPlayerSessionKey(postId, userId), 
                    JSON.stringify(finishedSession)
                );

                // 5. Update leaderboard
                const leaderboardKey = getLeaderboardKey(postId);
                const entryKey = `${leaderboardKey}:${userId}`;
                
                // Only add if not already exists
                if (!(await redis.exists(entryKey))) {
                    await redis.zAdd(leaderboardKey, {
                        score: finalScore,
                        member: userId
                    });
                    
                    await redis.set(entryKey, JSON.stringify({
                        userId,
                        username: finishedSession.username,
                        score: finalScore,
                        scoringMode: session.scoringMode,
                        completedAt: finishedSession.finishedAt,
                    }));
                }

                console.log(`Saved game data for user ${userId} on post ${postId} with score ${finalScore}`);
            } catch (error) {
                console.error(`Error saving game data: ${error}`);
            }
        },
 

        updateLeaderboard: async (postId , entry) => {
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
              const zaddResult = await redis.zAdd(leaderboardKey, { score: entry.score, member: entry.userId });
              console.log(`zadd result: ${zaddResult}`);
              
              // Store full entry data
              const setResult = await redis.set(entryKey, JSON.stringify(entry));
              console.log(`set result: ${setResult}`);

        },


       addQuestionToDeck: async (postId: string, question: Question) => {
            try {
                // 1. Get current deck
                const deckKey = getDeckKey(postId);
                const deckData = await redis.get(deckKey);
                let deck: Deck = deckData ? JSON.parse(deckData) : null;
                
                // If no deck exists, create a default one
                if (!deck) {
                    deck = {
                        id: `deck_${Date.now()}`,
                        title: "Community Questions",
                        description: "Questions added by players",
                        theme: "custom",
                        questions: [],
                        createdBy: "Community",
                        createdAt: Date.now(),
                    };
                }
                
                // 2. Get username
                let username = "Anonymous";
                try {
                    username = await context.reddit.getCurrentUsername() || "Anonymous";
                } catch (error) {
                    console.error("Error getting username:", error);
                }
                
                // 3. Create new question with proper metadata
                const newQuestion: Question = {
                    ...question,
                    id: `user_${Date.now()}_${context.userId || 'anonymous'}`,
                    authorUsername: username,
                    timeLimit: question.timeLimit || 20,
                };
                
                // 4. Add to deck
                deck.questions.push(newQuestion);
                
                // 5. Save updated deck
                await redis.set(deckKey, JSON.stringify(deck));
                
                // 6. Initialize stats for the new question
                const statsKey = getQuestionStatsKey(postId, newQuestion.id);
                
                // Create an object with all card fields set to '0'
                const fieldValues: Record<string, string> = {};
                newQuestion.cards.forEach(card => {
                    fieldValues[card.id] = '0';
                });
                
                // Set all fields at once
                await redis.hset(statsKey, fieldValues);
                await redis.set(`${statsKey}:total`, '0');
                
                console.log(`Added question ${newQuestion.id} to deck for post ${postId}`);
            } catch (error) {
                console.error(`Error adding question to deck: ${error}`);
            }
        },

        getPlayerRank: async (postId: string, userId: string): Promise<number | null> => {
            const leaderboardKey = `leaderboard:${postId}`;
            console.log(`Getting rank for user ${userId} in post ${postId}`);
            
            // Get all entries with scores
            const allEntries = await redis.zRange(leaderboardKey, 0, -1);
            
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

        },

        saveDeck: async (postId: string, deck: Deck) => {
            await redis.set(getDeckKey(postId), JSON.stringify(deck));
            console.log(`Saved deck for post ${postId}`);
        },


        getDeck: async (postId: string): Promise<Deck | null> => {
            const deckData = await redis.get(getDeckKey(postId));
            return deckData ? JSON.parse(deckData) as Deck : null;
        },

        getQuestionStats: async (postId: string, deck: Deck): Promise<QuestionStats[]> => {
            const statsPromises = deck.questions.map(async (question) => {
                const statsKey = getQuestionStatsKey(postId, question.id);
                const totalResponses = await redis.get(`${statsKey}:total`);
                const cardStatsRaw = await redis.hGetAll(statsKey);
                
                if (!totalResponses || Object.keys(cardStatsRaw).length === 0) {
                    return null; // Skip if no stats available
                }
                
                const cardStats: Record<string, number> = {};
                for (const [cardId, count] of Object.entries(cardStatsRaw)) {
                    cardStats[cardId] = parseInt(count) || 0;
                }
                
                return {
                    questionId: question.id,
                    cardStats,
                    totalResponses: parseInt(totalResponses),
                };
            });

            const statsArray = await Promise.all(statsPromises);
            return statsArray.filter((stats): stats is QuestionStats => stats !== null);
        },

        
    }

};
