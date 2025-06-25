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
  QuestionStats 
} from '../../shared/types/game';

type GamePhase = 'welcome' | 'playing' | 'results';

export const DebateDueler: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('welcome');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [currentQuestionStats, setCurrentQuestionStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize game data
  useEffect(() => {
    const initGame = async () => {
      try {
        const response = await fetch('/api/init');
        const data = await response.json() as InitGameResponse;
        
        if (data.status === 'error') {
          setError(data.message);
          return;
        }
        
        setDeck(data.deck);
        
        // If player has an existing session, determine phase
        if (data.playerSession) {
          setPlayerSession(data.playerSession);
          if (data.playerSession.gameState === 'finished') {
            setGamePhase('results');
          } else if (data.playerSession.gameState === 'playing') {
            setGamePhase('playing');
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

  const startGame = useCallback(async (scoringMode: ScoringMode) => {
    if (!deck) return;
    
    setLoading(true);
    try {
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
      setGamePhase('playing');
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [deck]);

  const submitAnswer = useCallback(async (cardId: string, timeRemaining: number) => {
    if (!playerSession || !deck) return;
    
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, timeRemaining }),
      });
      
      const data = await response.json() as SubmitAnswerResponse;
      
      if (data.status === 'error') {
        setError(data.message);
        return;
      }
      
      // Update question stats for display
      setCurrentQuestionStats(data.questionStats);
      
      // Update player session
      const updatedSession = {
        ...playerSession,
        totalScore: playerSession.totalScore + data.score,
        currentQuestionIndex: data.nextQuestionIndex ?? playerSession.currentQuestionIndex,
        gameState: data.isGameComplete ? 'finished' as const : 'playing' as const,
        finishedAt: data.isGameComplete ? Date.now() : undefined,
      };
      
      setPlayerSession(updatedSession);
      
      if (data.isGameComplete) {
        // Small delay to show final question results before transitioning
        setTimeout(() => {
          setGamePhase('results');
        }, 3000);
      }
      
      return data;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
    }
  }, [playerSession, deck]);

  const restartGame = useCallback(() => {
    setPlayerSession(null);
    setCurrentQuestionStats(null);
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
          playerSession={playerSession!}
          onSubmitAnswer={submitAnswer}
          currentQuestionStats={currentQuestionStats}
        />
      );
    
    case 'results':
      return (
        <ResultsScreen
          deck={deck}
          playerSession={playerSession!}
          onRestartGame={restartGame}
        />
      );
    
    default:
      return null;
  }
};