import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { GameScreen } from './GameScreen';
import { ResultsScreen } from './ResultsScreen';
import { 
  ScoringMode, 
  Deck, 
  PlayerSession, 
  InitGameResponse,
  SubmitAnswerResponse,
  QuestionStats,
  PlayerAnswer 
} from '../../shared/types/game';

type GamePhase = 'welcome' | 'playing' | 'results';

export const DebateDueler: React.FC = () => {
  const LOCAL_STORAGE_KEY = 'debateDuelerState';

  const [gamePhase, setGamePhase] = useState<GamePhase>('welcome');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [currentQuestionStats, setCurrentQuestionStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local storage for answers during gameplay
  const [localAnswers, setLocalAnswers] = useState<PlayerAnswer[]>([]);
  const [localScore, setLocalScore] = useState<number>(0);

  useEffect(() => {
    if (gamePhase === 'playing' && playerSession && deck) {
      const stateToSave = {
        gamePhase,
        deckId: deck.id,
        playerSession,
        localAnswers,
        localScore,
        currentQuestionStats
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [gamePhase, playerSession, deck, localAnswers, localScore, currentQuestionStats]);


  // Initialize game data
  useEffect(() => {
    const initGame = async () => {
      try {

        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        let useSavedState = false;
        
        const response = await fetch('/api/init');
        const data = await response.json() as InitGameResponse;
        
        if (data.status === 'error') {
          setError(data.message);
          return;
        }

        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (data.deck.id === parsedState.deckId) {
              useSavedState = true;
              setGamePhase(parsedState.gamePhase);
              setPlayerSession(parsedState.playerSession);
              setLocalAnswers(parsedState.localAnswers);
              setLocalScore(parsedState.localScore);
              setCurrentQuestionStats(parsedState.currentQuestionStats);
            } else {
              // Remove outdated saved state
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          } catch (e) {
            console.error('Error parsing saved state:', e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }

        setDeck(data.deck);
        
        // If player has an existing session, determine phase
        if (!useSavedState && data.playerSession) {
          setPlayerSession(data.playerSession);
          if (data.playerSession.gameState === 'finished') {
            setGamePhase('results');
          } else if (data.playerSession.gameState === 'playing') {
            setGamePhase('playing');
            setLocalAnswers(data.playerSession.answers);
            setLocalScore(data.playerSession.totalScore);
          }
        }
      } catch (err) {
        console.error('Failed to initialize game:', err);
        setError('Failed to load game. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    initGame();
  }, []);

  useEffect(() => {
    if (gamePhase === 'results') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearTimerStorage();
    }
  }, [gamePhase]);

  const clearTimerStorage = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('debateTimer_')) {
        localStorage.removeItem(key);
      }
    }
  };

  const startGame = useCallback(async (scoringMode: ScoringMode) => {
    if (!deck) return;
    
    setLoading(true);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringMode }),
      });
      
      const data = await response.json() as InitGameResponse;
      
      if (data.status === 'error') {
        setError(data.message);
        return;
      }
      
      setPlayerSession(data.playerSession!);
      setLocalAnswers([]);
      setLocalScore(0);
      setGamePhase('playing');
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [deck]);

  // Local answer processing - no Redis calls during gameplay
  const submitAnswer = useCallback(async (answer: string | string[], timeRemaining: number) => {
    if (!playerSession || !deck) return;
    
    const currentQuestion = deck.questions[playerSession.currentQuestionIndex];
    if (!currentQuestion) return;

    try {
      // Create answer record locally
      const answerRecord: PlayerAnswer = {
        questionId: currentQuestion.id,
        answer,
        timeRemaining,
        timestamp: Date.now(),
      };

      // Calculate score locally (simplified - we'll get accurate stats at the end)
      const baseTimeBonus = Math.max(0, timeRemaining * 5);
      let questionScore = 50 + baseTimeBonus; // Base score + time bonus
      
      // For trivia mode, we can calculate exact score locally
      if (playerSession.scoringMode === 'trivia') {
        if (currentQuestion.questionType === 'sequence') {
          const sequence = answer as string[];
          const correctSequence = currentQuestion.cards
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
          questionScore = Math.round(accuracy * 100) + baseTimeBonus;
        } else {
          const cardId = answer as string;
          const card = currentQuestion.cards.find(c => c.id === cardId);
          questionScore = card?.isCorrect ? 100 + baseTimeBonus : 0;
        }
      }

      // Update local state
      const newLocalAnswers = [...localAnswers, answerRecord];
      const newLocalScore = localScore + questionScore;
      
      setLocalAnswers(newLocalAnswers);
      setLocalScore(newLocalScore);

      // Check if game is complete
      const isGameComplete = playerSession.currentQuestionIndex >= deck.questions.length - 1;
      
      if (isGameComplete) {
        // Game complete - send all data to server at once
        await submitFinalResults(newLocalAnswers, newLocalScore);
        setTimeout(() => {
          setGamePhase('results');
        }, 3500);
      } else {
        // Move to next question locally
        setPlayerSession(prev => prev ? {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          answers: newLocalAnswers,
          totalScore: newLocalScore,
        } : null);
        
        // Show temporary results
        setCurrentQuestionStats({
          questionId: currentQuestion.id,
          cardStats: {},
          totalResponses: 0,
        });
        
        // Small delay before next question
        setTimeout(() => {
          setCurrentQuestionStats(null);
        }, 2000);
      }
      
      return {
        status: 'success' as const,
        score: questionScore,
        questionStats: {
          questionId: currentQuestion.id,
          cardStats: {},
          totalResponses: 0,
        },
        isGameComplete,
        ...(!isGameComplete && { nextQuestionIndex: playerSession.currentQuestionIndex + 1 })
      };
    } catch (err) {
      console.error('Failed to process answer:', err);
      setError('Failed to process answer. Please try again.');
    }
  }, [playerSession, deck, localAnswers, localScore]);

  // Submit all results at once when game is complete
  const submitFinalResults = useCallback(async (answers: PlayerAnswer[], totalScore: number) => {
    if (!playerSession) return;

    try {
      clearTimerStorage();
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const response = await fetch('/api/complete-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          totalScore,
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Update session to finished state
        setPlayerSession(prev => prev ? {
          ...prev,
          answers,
          totalScore,
          gameState: 'finished' as const,
          finishedAt: Date.now(),
        } : null);
      } else {
        console.error('Failed to submit final results:', data.message);
      }
    } catch (err) {
      console.error('Failed to submit final results:', err);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearTimerStorage();
    }
  }, [playerSession]);

  const restartGame = useCallback(() => {
    clearTimerStorage();
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setPlayerSession(null);
    setCurrentQuestionStats(null);
    setLocalAnswers([]);
    setLocalScore(0);
    setGamePhase('welcome');
    setError(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Debate Dueler...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">Oops!</h2>
          <p className="text-white/90 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-lg">No game data available.</p>
      </div>
    );
  }

  // Create a session with local data for display purposes
  const displaySession = playerSession ? {
    ...playerSession,
    answers: localAnswers,
    totalScore: localScore,
  } : null;

  switch (gamePhase) {
    case 'welcome':
      return (
        <WelcomeScreen
          deck={deck}
          onStartGame={startGame}
          existingSession={playerSession}
        />
      );
    
    case 'playing':
      return (
        <GameScreen
          deck={deck}
          playerSession={displaySession!}
          onSubmitAnswer={submitAnswer}
          currentQuestionStats={currentQuestionStats}
        />
      );
    
    case 'results':
      return (
        <ResultsScreen
          deck={deck}
          playerSession={displaySession!}
          onRestartGame={restartGame}
        />
      );
    
    default:
      return null;
  }
};