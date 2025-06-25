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
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    prompt: '',
    cards: ['', '', '', ''],
    correctIndex: 0,
  });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json() as LeaderboardResponse;
        
        if (data.status === 'success') {
          setLeaderboard(data.leaderboard);
          setPlayerRank(data.playerRank);
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
    const cards = newQuestion.cards
      .filter(text => text.trim())
      .map((text, index) => ({
        id: `card_${index}`,
        text: text.trim(),
        isCorrect: index === newQuestion.correctIndex,
      }));

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
          },
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        alert('Question added successfully! It will appear in future games.');
        setShowAddQuestion(false);
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
      case 'contrarian': return '🎭';
      case 'conformist': return '👥';
      case 'trivia': return '🧠';
      default: return '🎯';
    }
  };

  const getScoreMessage = () => {
    if (!playerRank) return 'Great job!';
    if (playerRank === 1) return '🏆 Champion!';
    if (playerRank <= 3) return '🥉 Top 3!';
    if (playerRank <= 5) return '⭐ Top 5!';
    return 'Well played!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎉 Game Complete!
          </h1>
          <p className="text-blue-200">
            {getScoreMessage()}
          </p>
        </div>

        {/* Player Score */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">{getScoringModeIcon()}</span>
              <span className="text-white font-semibold capitalize">{playerSession.scoringMode}</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{playerSession.totalScore}</div>
            <div className="text-yellow-200">
              {playerRank ? `Rank #${playerRank}` : 'Your Score'}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold text-center mb-4">🏆 Leaderboard</h3>
          
          {loading ? (
            <div className="text-center text-blue-200">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-blue-200">Be the first to play!</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-2 rounded ${
                    entry.userId === playerSession.userId
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-bold w-6">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-white">{entry.username}</span>
                    <span className="text-xs">
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

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={onRestartGame}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            🔄 Play Again
          </button>
          
          <button
            onClick={() => setShowAddQuestion(!showAddQuestion)}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            ➕ Add Your Question
          </button>
        </div>

        {/* Add Question Form */}
        {showAddQuestion && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
            <h4 className="text-white font-bold mb-4">Add Your Question</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-blue-200 text-sm mb-1">Question Prompt</label>
                <input
                  type="text"
                  value={newQuestion.prompt}
                  onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                  placeholder="Who would win in a battle between..."
                  className="w-full p-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                />
              </div>
              
              {newQuestion.cards.map((card, index) => (
                <div key={index}>
                  <label className="block text-blue-200 text-sm mb-1">
                    Answer {index + 1} {index < 2 && <span className="text-red-400">*</span>}
                  </label>
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
                      className="flex-1 p-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                    />
                    <button
                      onClick={() => setNewQuestion({ ...newQuestion, correctIndex: index })}
                      className={`px-3 py-2 rounded text-sm ${
                        newQuestion.correctIndex === index
                          ? 'bg-green-500 text-white'
                          : 'bg-white/20 text-blue-200 hover:bg-white/30'
                      }`}
                      title="Mark as correct answer (for trivia mode)"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleAddQuestion}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition-colors"
                >
                  Submit Question
                </button>
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className="px-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-blue-300 text-xs">
            Thanks for playing {deck.title}!
          </p>
        </div>
      </div>
    </div>
  );
};