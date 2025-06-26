import React, { useState, useEffect } from 'react';
import { Deck, PlayerSession, LeaderboardResponse, LeaderboardEntry } from '../../shared/types/game';

interface ResultsScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onRestartGame: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  deck,
  playerSession,
  onRestartGame,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'sequence'>('multiple-choice');
  const [newQuestion, setNewQuestion] = useState({
    prompt: '',
    cards: ['', '', '', ''],
    correctIndex: 0,
  });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const data = (await response.json()) as LeaderboardResponse;

        if (data.status === 'success') {
          setLeaderboard(data.leaderboard);
          setPlayerRank(data.playerRank ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleAddQuestion = async () => {
    let cards;
    if (questionType === 'multiple-choice') {
      cards = newQuestion.cards
        .filter(text => text.trim())
        .map((text, index) => ({
          id: `card_${index}`,
          text: text.trim(),
          isCorrect: index === newQuestion.correctIndex,
        }));
    } else {
      cards = newQuestion.cards
        .filter(text => text.trim())
        .map((text, index) => ({
          id: `step_${index}`,
          text: text.trim(),
          sequenceOrder: index + 1,
        }));
    }

    if (cards.length < 2 || !newQuestion.prompt.trim()) {
      alert('Please provide a question and at least 2 answer options.');
      return;
    }

    try {
      const response = await fetch('/api/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: {
            prompt: newQuestion.prompt.trim(),
            cards,
            timeLimit: 20,
            questionType,
          },
        }),
      });
      const data = await response.json();

      if (data.status === 'success') {
        alert('Question added successfully! It will appear in future games.');
        setIsAddQuestionModalOpen(false);
        setNewQuestion({ prompt: '', cards: ['', '', '', ''], correctIndex: 0 });
      } else {
        alert(`Failed to add question: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to add question:', error);
      alert('Failed to add question. Please try again.');
    }
  };

  const getScoringModeIcon = () => {
    switch (playerSession.scoringMode) {
      case 'contrarian':
        return '🎭';
      case 'conformist':
        return '👥';
      case 'trivia':
        return '🧠';
      default:
        return '🎯';
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex flex-col">
      <div className="flex-grow flex flex-col md:flex-row gap-6">
        {/* Player Score */}
        <div className="md:flex-[2] lg:flex-[1.5] xl:flex-[1] flex flex-col">
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              🎉 Game Complete!
            </h1>
          </div>
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-4 flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-2xl md:text-3xl">{getScoringModeIcon()}</span>
                <span className="text-white font-semibold capitalize text-base md:text-lg">
                  {playerSession.scoringMode}
                </span>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {playerSession.totalScore}
              </div>
              <div className="text-yellow-200 text-md md:text-lg font-medium">
                {playerRank ? `Rank #${playerRank}` : 'Your Score'}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="md:flex-[3] lg:flex-[2] xl:flex-[1.5] flex flex-col">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex-1 flex flex-col">
            <h3 className="text-white font-bold text-center mb-4 text-lg md:text-xl">
              🏆 Leaderboard
            </h3>
            {loading ? (
              <div className="text-center text-blue-200">Loading...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center text-blue-200">Be the first to play!</div>
            ) : (
              <div className="flex-1 flex flex-col justify-center space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.userId === playerSession.userId
                        ? 'bg-yellow-500/20 border border-yellow-500/50'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-bold w-6">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="text-white truncate max-w-[150px]">
                        {entry.username}
                      </span>
                      <span className="text-sm">
                        {entry.scoringMode === 'contrarian' ? '🎭' : 
                         entry.scoringMode === 'conformist' ? '👥' : '🧠'}
                      </span>
                    </div>
                    <span className="text-white font-bold">{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="md:flex-[2] lg:flex-[1.5] xl:flex-[1] flex flex-col justify-center space-y-4">
          <button
            onClick={onRestartGame}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition-all text-md"
          >
            🔄 Play Again
          </button>
          <button
            onClick={() => setIsAddQuestionModalOpen(true)}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition-all text-md"
          >
            ➕ Add Question
          </button>
        </div>
      </div>

      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold text-xl">Add Your Question</h4>
              <button 
                onClick={() => setIsAddQuestionModalOpen(false)}
                className="text-white text-3xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {/* Question Type Selector */}
              <div>
                <label className="block text-blue-200 text-lg mb-2">Question Type</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setQuestionType('multiple-choice')}
                    className={`px-4 py-2 rounded-lg ${
                      questionType === 'multiple-choice'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/20 text-blue-200 hover:bg-white/30'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionType('sequence')}
                    className={`px-4 py-2 rounded-lg ${
                      questionType === 'sequence'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/20 text-blue-200 hover:bg-white/30'
                    }`}
                  >
                    Sequence Order
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-blue-200 text-lg mb-2">Question Prompt</label>
                <input
                  type="text"
                  value={newQuestion.prompt}
                  onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                  placeholder="Enter your question..."
                  className="w-full p-2 md:p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none text-lg"
                />
              </div>

              {/* Sequence-specific inputs */}
              {questionType === 'sequence' ? (
                <div>
                  <label className="block text-blue-200 text-lg mb-2">
                    Arrange cards in correct order:
                  </label>
                  <div className="space-y-3">
                    {newQuestion.cards.map((text, index) => (
                      <div 
                        key={index} 
                        className="bg-white/10 rounded-lg p-3 flex items-center"
                      >
                        <span className="text-white font-bold mr-3">{index + 1}.</span>
                        <input
                          type="text"
                          value={text}
                          onChange={(e) => {
                            const newCards = [...newQuestion.cards];
                            newCards[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, cards: newCards });
                          }}
                          placeholder={`Step ${index + 1}`}
                          className="flex-1 bg-transparent text-white placeholder-blue-300 border-b border-white/30 focus:border-white/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newCards = [...newQuestion.cards];
                            newCards.splice(index, 1);
                            setNewQuestion({ ...newQuestion, cards: newCards });
                          }}
                          className="ml-3 text-red-400 hover:text-red-300 text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setNewQuestion({
                        ...newQuestion,
                        cards: [...newQuestion.cards, '']
                      })}
                      className="mt-2 text-blue-300 hover:text-blue-100 flex items-center"
                    >
                      <span className="mr-2">+</span> Add another step
                    </button>
                  </div>
                </div>
              ) : (
                // Multiple choice inputs
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newQuestion.cards.map((card, index) => (
                    <div key={index} className="bg-white/10 rounded-lg p-3">
                      <label className="block text-blue-200 text-lg mb-2">Answer {index + 1}</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={card}
                          onChange={(e) => {
                            const newCards = [...newQuestion.cards];
                            newCards[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, cards: newCards });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 p-2 md:p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none text-lg"
                        />
                        <button
                          onClick={() => setNewQuestion({ ...newQuestion, correctIndex: index })}
                          className={`px-3 py-2 rounded-lg text-lg ${
                            newQuestion.correctIndex === index
                              ? 'bg-green-500 text-white'
                              : 'bg-white/20 text-blue-200 hover:bg-white/30'
                          }`}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => handleAddQuestion()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 md:py-3 rounded-lg transition-colors text-lg"
                >
                  Submit Question
                </button>
                <button
                  onClick={() => setIsAddQuestionModalOpen(false)}
                  className="px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 md:py-3 rounded-lg transition-colors text-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};