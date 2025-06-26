import express from 'express';
import { createServer, getContext, getServerPort } from '@devvit/server';
import { getRedis } from '@devvit/redis';
import { reddit } from '@devvit/reddit';

import {
  InitGameResponse,
  SubmitAnswerResponse,
  LeaderboardResponse,
  CreateQuestionResponse,
  CreateDeckResponse,
  ScoringMode,
  PlayerAnswer,
  Question,
  Deck,
} from '../shared/types/game';
import {
  initPlayerSession,
  getPlayerSession,
  updatePlayerSession,
  recordAnswer,
  getQuestionStats,
  calculateScore,
  updateLeaderboard,
  getLeaderboard,
  getPlayerRank,
  saveDeck,
  getDeck,
} from './core/game';
import { getDefaultDeck, validateDeck } from './core/decks';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Initialize game - get deck and player session
router.get('/api/init', async (_req, res): Promise<void> => {
  const { postId, userId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'Post ID is required' });
    return;
  }

  try {
    // Get or create deck for this post
    let deck = await getDeck({ redis, postId });
    if (!deck) {
      deck = getDefaultDeck();
      await saveDeck({ redis, postId, deck });
    }

    // Get existing player session if user is logged in
    let playerSession = null;
    if (userId) {
      playerSession = await getPlayerSession({ redis, postId, userId });
    }

    res.json({
      status: 'success',
      deck,
      playerSession,
    } as InitGameResponse);
  } catch (error) {
    console.error('Init game error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize game',
    });
  }
});

// Start new game session
router.post<{}, InitGameResponse, { scoringMode: ScoringMode }>('/api/start', async (req, res): Promise<void> => {
  const { scoringMode } = req.body;
  const { postId, userId } = getContext();
  const username = await getContext().reddit.getCurrentUsername();
  const redis = getRedis();
  if (!postId || !userId || !username) {
    res.status(400).json({
      status: 'error',
      message: 'Must be logged in to play',
    });
    return;
  }

  if (!scoringMode || !['contrarian', 'conformist', 'trivia'].includes(scoringMode)) {
    res.status(400).json({
      status: 'error',
      message: 'Valid scoring mode is required',
    });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({
        status: 'error',
        message: 'Game deck not found',
      });
      return;
    }

    const playerSession = await initPlayerSession({
      redis,
      postId,
      userId,
      username,
      scoringMode,
      deck,
    });

    res.json({
      status: 'success',
      deck,
      playerSession,
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start game',
    });
  }
});

// NEW: Complete game endpoint - processes all answers at once
router.post<{}, any, { answers: PlayerAnswer[]; totalScore: number }>(
  '/api/complete-game', 
  async (req, res): Promise<void> => {
    const { answers, totalScore } = req.body;
    const { postId, userId } = getContext();
    const redis = getRedis();

    if (!postId || !userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in to complete game' });
      return;
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ status: 'error', message: 'Valid answers required' });
      return;
    }

    try {
      const session = await getPlayerSession({ redis, postId, userId });
      if (!session || session.gameState !== 'playing') {
        res.status(400).json({ status: 'error', message: 'No active game session found' });
        return;
      }

      const deck = await getDeck({ redis, postId });
      if (!deck) {
        res.status(404).json({ status: 'error', message: 'Game deck not found' });
        return;
      }

      // Process all answers and calculate accurate scores
      let finalScore = 0;
      
      for (const answer of answers) {
        const question = deck.questions.find(q => q.id === answer.questionId);
        if (!question) continue;

        // Record answer in stats for community voting
        await recordAnswer({ 
          redis, 
          postId, 
          questionId: question.id, 
          answer: answer.answer 
        });

        // Get updated stats for accurate scoring
        const questionStats = await getQuestionStats({
          redis,
          postId,
          questionId: question.id,
          cardIds: question.cards.map(card => card.id),
        });

        // Calculate accurate score with real community data
        const questionScore = calculateScore({
          scoringMode: session.scoringMode,
          question,
          answer: answer.answer,
          questionStats,
          timeRemaining: answer.timeRemaining,
        });

        finalScore += questionScore;
      }

      // Update session to finished state
      const finishedSession = {
        ...session,
        answers,
        totalScore: finalScore,
        gameState: 'finished' as const,
        finishedAt: Date.now(),
      };

      await updatePlayerSession({ redis, postId, session: finishedSession });

      // Update leaderboard
      await updateLeaderboard({
        redis,
        postId,
        entry: {
          userId: session.userId,
          username: session.username,
          score: finalScore,
          scoringMode: session.scoringMode,
          completedAt: finishedSession.finishedAt,
        },
      });

      res.json({
        status: 'success',
        finalScore,
        session: finishedSession,
      });
    } catch (error) {
      console.error('Complete game error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to complete game',
      });
    }
  }
);

// Get leaderboard
router.get('/api/leaderboard', async (_req, res): Promise<void> => {
  const { postId, userId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({
      status: 'error',
      message: 'Post ID is required',
    });
    return;
  }

  try {
    const leaderboard = await getLeaderboard({ redis, postId, limit: 10 });
    
    let playerRank = null;
    let playerScore = null;
    
    if (userId) {
      playerRank = await getPlayerRank({ redis, postId, userId });
      const session = await getPlayerSession({ redis, postId, userId });
      if (session) {
        playerScore = session.totalScore;
      }
    }

    res.json({
      status: 'success',
      leaderboard,
      playerRank,
      playerScore,
    } as LeaderboardResponse);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get leaderboard',
    });
  }
});

// Add question to existing deck
router.post<{}, CreateQuestionResponse, { question: Question }>('/api/add-question', async (req, res): Promise<void> => {
  const { question } = req.body;
  const { postId, userId} = getContext();
  const username = await getContext().reddit.getCurrentUsername()
  const redis = getRedis();

  if (!postId || !userId || !username) {
    res.status(400).json({
      status: 'error',
      message: 'Must be logged in to add questions',
    });
    return;
  }

  if (!question || !question.prompt || !question.cards || question.cards.length < 2) {
    res.status(400).json({
      status: 'error',
      message: 'Valid question with at least 2 cards is required',
    });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({
        status: 'error',
        message: 'Game deck not found',
      });
      return;
    }

    // Add author attribution and generate ID
    const newQuestion: Question = {
      ...question,
      id: `user_${Date.now()}_${userId}`,
      authorUsername: username,
      timeLimit: question.timeLimit || 20,
    };

    deck.questions.push(newQuestion);
    await saveDeck({ redis, postId, deck });

    res.json({
      status: 'success',
      questionId: newQuestion.id,
    });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add question',
    });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`Server error: ${err.stack}`));
server.listen(port, () => console.log(`Debate Dueler server running on http://localhost:${port}`));