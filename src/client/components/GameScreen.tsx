import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Deck, 
  PlayerSession, 
  QuestionStats, 
  SubmitAnswerResponse 
} from '../../shared/types/game';

interface GameScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onSubmitAnswer: (answer: string | string[], timeRemaining: number) => Promise<SubmitAnswerResponse | undefined>;
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
  const [currentDisplayQuestion, setCurrentDisplayQuestion] = useState(playerSession.currentQuestionIndex);
  
  const currentQuestion = deck.questions[playerSession.currentQuestionIndex];
  const displayQuestion = deck.questions[currentDisplayQuestion];
  const isLastQuestion = playerSession.currentQuestionIndex >= deck.questions.length - 1;
  const ANSWER_DISPLAY_MS = 5000;
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (showResults || !currentQuestion) return;
    setTimeRemaining(currentQuestion.timeLimit);
    setCurrentDisplayQuestion(playerSession.currentQuestionIndex);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentQuestion?.questionType === 'sequence') {
            if (selectedSequence.length > 0 && !isSubmitting) {
              handleSubmitAnswer(selectedSequence, 0);
            }
          } else if (!selectedCardId && !isSubmitting) {
            const firstCardId = currentQuestion?.cards[0]?.id;
            if (firstCardId) handleCardSelect(firstCardId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, showResults, selectedCardId, isSubmitting, selectedSequence]);

  // Sequence selection handler
  const handleSequenceSelect = (cardId: string) => {
    if (showResults || isSubmitting) return;
    
    if (selectedSequence.includes(cardId)) {
      setSelectedSequence(prev => prev.filter(id => id !== cardId));
    } else {
      setSelectedSequence(prev => [...prev, cardId]);
    }
  };

  // Submit handler
  const handleSubmitAnswer = useCallback(async (answer: string | string[], timeLeft: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const result = await onSubmitAnswer(answer, timeLeft);
    
    if (result?.status === "success") {
      setLastScore(result.score);
      setShowResults(true);
      
      // Reset sequence for next question
      if (currentQuestion?.questionType === 'sequence') {
        setSelectedSequence([]);
      }
      
      setTimeout(() => {
        if (!result.isGameComplete) {
          setShowResults(false);
          setSelectedCardId(null);
          setIsSubmitting(false);
        }
      }, ANSWER_DISPLAY_MS);
    } else {
      setIsSubmitting(false);
    }
  }, [onSubmitAnswer, isSubmitting, currentQuestion]);

  // Handle card select based on question type
  const handleCardSelect = (cardId: string) => {
    if (showResults || isSubmitting || !currentQuestion) return;
    
    // Default to 'multiple-choice' if undefined
    if (currentQuestion.questionType === 'sequence') {
      handleSequenceSelect(cardId);
    } else {
      setSelectedCardId(cardId);
      handleSubmitAnswer(cardId, timeRemaining);
    }
  };

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
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-[clamp(.5rem,2vw,1rem)] py-[clamp(.25rem,1vw,.75rem)]">
        <div className="text-white">
          <div className="flex items-center space-x-[clamp(.25rem,1vw,.5rem)]">
            <span className="text-[clamp(1rem,3vw,1.5rem)]">{getScoringModeIcon()}</span>
            <span className="font-semibold capitalize text-[clamp(.75rem,2vw,1rem)]">
              {playerSession.scoringMode}
            </span>
          </div>
          <div className="text-[clamp(.5rem,1.5vw,.75rem)] opacity-75 mt-[clamp(.25rem,1vw,.5rem)]">
            Q{playerSession.currentQuestionIndex + 1}/{deck.questions.length}
          </div>
        </div>
        <div className="text-white text-right">
          <div className="font-bold text-[clamp(1.25rem,4vw,2rem)]">{playerSession.totalScore}</div>
          <div className="text-[clamp(.5rem,1.5vw,.75rem)] opacity-75">Total Score</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 h-[clamp(.25rem,.5vw,.5rem)] mb-[clamp(.5rem,1vw,1rem)]">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-300"
          style={{ width: `${((playerSession.currentQuestionIndex + 1) / deck.questions.length) * 100}%` }}
        />
      </div>

      {/* Timer */}
      {!showResults && (
        <div className="flex justify-center mb-[clamp(.5rem,1vw,1rem)]">
          <div
            className="flex items-center justify-center"
            style={{
              width: 'clamp(2rem,8vw,4rem)',
              height: 'clamp(2rem,8vw,4rem)'
            }}
          >
            <span
              className="font-bold text-[clamp(1rem,4vw,2rem)]"
              style={{ color: timeRemaining <= 5 ? '#f87171' : '#fff' }}
            >
              {timeRemaining}
            </span>
          </div>
        </div>
      )}

      {/* Question Area */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-[clamp(.5rem,2vw,1rem)] mx-[clamp(.5rem,2vw,1rem)] mb-[clamp(.5rem,1vw,1rem)]">
        <h2 className="text-white font-bold text-center text-[clamp(1rem,4vw,2rem)] leading-tight">
          {displayQuestion?.prompt}
        </h2>
        {displayQuestion?.authorUsername && (
          <p className="text-blue-200 text-[clamp(.5rem,1.5vw,.75rem)] text-center mt-[clamp(.25rem,1vw,.5rem)]">
            by u/{displayQuestion?.authorUsername}
          </p>
        )}
      </div>

      {/* Results Display */}
      {showResults && (
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg
                        p-[clamp(.5rem,2vw,1rem)] mx-[clamp(.5rem,2vw,1rem)] mb-[clamp(.5rem,1vw,1rem)]">
          <div className="text-center">
            <div className="font-bold text-[clamp(1.5rem,5vw,3rem)] text-white mb-[clamp(.25rem,1vw,.5rem)]">
              +{lastScore}
            </div>
            <div className="text-[clamp(.75rem,2vw,1.25rem)] text-green-200">
              {isLastQuestion ? 'Final Question Complete!' : 'Next question...'}
            </div>
          </div>
        </div>
      )}

      {/* Answer Cards */}
      <div
        className="
          flex-grow overflow-y-auto pb-[clamp(.5rem,1vw,1rem)]
          px-[clamp(.5rem,2vw,1rem)]
        "
      >
        {displayQuestion?.questionType === 'sequence' ? (
          // Sequence question UI
          <div className="flex flex-col gap-4">
            {/* Selected sequence */}
            <div className="min-h-[60px] bg-white/10 border border-white/20 rounded-lg p-3">
              <h3 className="text-blue-200 text-center mb-2">Your Sequence:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedSequence.map((cardId, index) => {
                  const card = displayQuestion?.cards.find(c => c.id === cardId);
                  return card ? (
                    <div 
                      key={index}
                      className="flex items-center bg-purple-600/50 border border-purple-400 rounded-full px-3 py-1"
                    >
                      <span className="text-white mr-2 font-bold">{index + 1}.</span>
                      <span className="text-white">{card.text}</span>
                      <button 
                        onClick={() => handleSequenceSelect(cardId)}
                        className="ml-2 text-red-300 hover:text-red-100"
                      >
                        ×
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Available cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(.25rem,1vw,.5rem)]">
              {displayQuestion.cards
                .filter(card => !selectedSequence.includes(card.id))
                .map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleSequenceSelect(card.id)}
                    disabled={showResults || isSubmitting}
                    className="
                      relative flex items-center justify-between w-full
                      min-h-[clamp(3rem,10vw,5rem)]
                      p-[clamp(.5rem,1.5vw,1rem)]
                      rounded-xl border-2 overflow-hidden transition-all
                      border-white/50 bg-white/10 hover:bg-white/20 active:scale-[0.98]
                      disabled:opacity-50
                    "
                  >
                    <span
                      className="relative flex-1 font-semibold text-left
                                 text-[clamp(1rem,2.5vw,1.25rem)] text-white"
                    >
                      {card.text}
                    </span>
                  </button>
                ))}
            </div>
            
            {/* Submit button for sequence */}
            {selectedSequence.length > 0 && !showResults && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => handleSubmitAnswer(selectedSequence, timeRemaining)}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  Submit Sequence
                </button>
              </div>
            )}
          </div>
        ) : (
          // Multiple choice UI
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(.25rem,1vw,.5rem)]">
            {displayQuestion?.cards.map((card) => {
              const isSelected = selectedCardId === card.id;
              const pct = showResults ? getCardPercentage(card.id) : 0;

              return (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card.id)}
                  disabled={showResults || isSubmitting}
                  className={`
                    relative flex items-center justify-between w-full
                    min-h-[clamp(3rem,10vw,5rem)]
                    p-[clamp(.5rem,1.5vw,1rem)]
                    rounded-xl border-2 overflow-hidden transition-all
                    ${isSelected && showResults
                      ? 'border-yellow-400 bg-yellow-500/20'
                      : isSelected
                        ? 'border-white bg-white/20'
                        : showResults
                          ? 'border-white/30 bg-white/10'
                          : 'border-white/50 bg-white/10 hover:bg-white/20 active:scale-[0.98]'}
                  `}
                >
                  {showResults && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <span
                    className="relative flex-1 font-semibold text-left
                               text-[clamp(1rem,2.5vw,1.25rem)] text-white"
                  >
                    {card.text}
                  </span>

                  {showResults && (
                    <div className="relative flex items-center space-x-[clamp(.25rem,1vw,.5rem)]">
                      <span className="font-bold text-[clamp(1rem,3vw,1.5rem)] text-white">
                        {pct}%
                      </span>
                      {isSelected && (
                        <span className="text-[clamp(1.5rem,4vw,2rem)] text-yellow-400">✓</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="text-center p-[clamp(.25rem,1vw,.5rem)] bg-white/5">
        <p className="text-[clamp(.5rem,1.5vw,.75rem)] text-blue-200">
          {showResults
            ? `${currentQuestionStats?.totalResponses || 0} players have answered`
            : 'Choose your answer quickly!'}
        </p>
      </div>
    </div>
  );
};