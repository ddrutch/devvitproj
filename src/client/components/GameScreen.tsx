import React, { useState, useEffect, useCallback } from 'react';
import { 
  Deck, 
  PlayerSession, 
  QuestionStats, 
  SubmitAnswerResponse 
} from '../../shared/types/game';

interface GameScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onSubmitAnswer: (cardId: string, timeRemaining: number) => Promise<SubmitAnswerResponse | undefined>;
  currentQuestionStats: QuestionStats | null;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  deck,
  playerSession,
  onSubmitAnswer,
  currentQuestionStats,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastScore, setLastScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = deck.questions[playerSession.currentQuestionIndex];
  const isLastQuestion = playerSession.currentQuestionIndex >= deck.questions.length - 1;

  // Timer effect
  useEffect(() => {
    if (showResults || !currentQuestion) return;

    setTimeRemaining(currentQuestion.timeLimit);
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          if (!selectedCardId && !isSubmitting) {
            // Select first card as default if no selection made
            const firstCardId = currentQuestion.cards[0]?.id;
            if (firstCardId) {
              handleSubmitAnswer(firstCardId, 0);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, showResults, selectedCardId, isSubmitting]);

  const handleSubmitAnswer = useCallback(async (cardId: string, timeLeft: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const result = await onSubmitAnswer(cardId, timeLeft);
    
    if (result) {
      setLastScore(result.score);
      setShowResults(true);
      
      // Auto-advance to next question or end game
      setTimeout(() => {
        if (!result.isGameComplete) {
          setShowResults(false);
          setSelectedCardId(null);
          setIsSubmitting(false);
        }
        // If game is complete, parent component will handle transition
      }, 3000);
    } else {
      setIsSubmitting(false);
    }
  }, [onSubmitAnswer, isSubmitting]);

  const handleCardSelect = (cardId: string) => {
    if (showResults || isSubmitting) return;
    
    setSelectedCardId(cardId);
    handleSubmitAnswer(cardId, timeRemaining);
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <p className="text-white text-lg">Loading question...</p>
      </div>
    );
  }

  const getCardPercentage = (cardId: string): number => {
    if (!currentQuestionStats || currentQuestionStats.totalResponses === 0) return 0;
    const count = currentQuestionStats.cardStats[cardId] || 0;
    return Math.round((count / currentQuestionStats.totalResponses) * 100);
  };

  const getScoringModeIcon = () => {
    switch (playerSession.scoringMode) {
      case 'contrarian': return '🎭';
      case 'conformist': return '👥';
      case 'trivia': return '🧠';
      default: return '🎯';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div className="text-white">
            <span className="text-sm opacity-75">Question {playerSession.currentQuestionIndex + 1} of {deck.questions.length}</span>
            <div className="flex items-center space-x-2 mt-1">
              <span>{getScoringModeIcon()}</span>
              <span className="font-semibold capitalize">{playerSession.scoringMode}</span>
            </div>
          </div>
          <div className="text-right text-white">
            <div className="text-2xl font-bold">{playerSession.totalScore}</div>
            <div className="text-sm opacity-75">Total Score</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-6">
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((playerSession.currentQuestionIndex + 1) / deck.questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 ${
            timeRemaining <= 5 ? 'border-red-400 bg-red-500/20' : 'border-white/50 bg-white/10'
          } transition-colors`}>
            <span className={`text-2xl font-bold ${
              timeRemaining <= 5 ? 'text-red-200' : 'text-white'
            }`}>
              {timeRemaining}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <h2 className="text-white text-xl font-bold text-center leading-tight">
            {currentQuestion.prompt}
          </h2>
          {currentQuestion.authorUsername && (
            <p className="text-blue-200 text-sm text-center mt-2">
              by u/{currentQuestion.authorUsername}
            </p>
          )}
        </div>

        {/* Answer Cards */}
        <div className="space-y-3 mb-6">
          {currentQuestion.cards.map((card) => {
            const isSelected = selectedCardId === card.id;
            const percentage = showResults ? getCardPercentage(card.id) : 0;
            
            return (
              <button
                key={card.id}
                onClick={() => handleCardSelect(card.id)}
                disabled={showResults || isSubmitting}
                className={`w-full p-4 rounded-lg border-2 transition-all relative overflow-hidden ${
                  isSelected && showResults
                    ? 'border-yellow-400 bg-yellow-500/20'
                    : isSelected
                    ? 'border-white bg-white/20'
                    : showResults
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/50 bg-white/10 hover:bg-white/20 active:scale-95'
                }`}
              >
                {/* Percentage bar background (only shown in results) */}
                {showResults && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                  ></div>
                )}
                
                <div className="relative flex items-center justify-between">
                  <span className="text-white font-semibold text-left flex-1">
                    {card.text}
                  </span>
                  
                  {showResults && (
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold">{percentage}%</span>
                      {isSelected && <span className="text-yellow-400">✓</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Results Display */}
        {showResults && (
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">+{lastScore}</div>
              <div className="text-green-200 text-sm">
                {isLastQuestion ? 'Final Question Complete!' : 'Next question in 3 seconds...'}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Status */}
        <div className="text-center">
          <p className="text-blue-200 text-sm">
            {showResults 
              ? `${currentQuestionStats?.totalResponses || 0} players have answered`
              : 'Choose your answer quickly!'
            }
          </p>
        </div>
      </div>
    </div>
  );
};