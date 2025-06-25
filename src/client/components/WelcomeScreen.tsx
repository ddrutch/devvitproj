import React, { useState } from 'react';
import { ScoringMode, Deck, PlayerSession } from '../../shared/types/game';

interface WelcomeScreenProps {
  deck: Deck;
  onStartGame: (scoringMode: ScoringMode) => void;
  existingSession: PlayerSession | null;
}

const scoringModes: { mode: ScoringMode; title: string; description: string; icon: string }[] = [
  {
    mode: 'contrarian',
    title: 'Contrarian',
    description: 'Score higher for picking the least popular choice',
    icon: '🎭',
  },
  {
    mode: 'conformist',
    title: 'Conformist',
    description: 'Score higher for picking the most popular choice',
    icon: '👥',
  },
  {
    mode: 'trivia',
    title: 'Trivia',
    description: 'Score based on correct answers',
    icon: '🧠',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  deck,
  onStartGame,
  existingSession,
}) => {
  const [selectedMode, setSelectedMode] = useState<ScoringMode | null>(null);

  const handleStartGame = () => {
    if (selectedMode) {
      onStartGame(selectedMode);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🥊 Debate Dueler
          </h1>
          <p className="text-blue-200 text-lg">
            {deck.title}
          </p>
          <p className="text-blue-300 text-sm mt-2">
            {deck.description}
          </p>
        </div>

        {/* Existing Session Notice */}
        {existingSession && existingSession.gameState === 'playing' && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
            <p className="text-yellow-200 text-sm text-center">
              You have a game in progress! Starting a new game will reset your current progress.
            </p>
          </div>
        )}

        {/* Game Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Choose your scoring strategy below</li>
            <li>• Answer {deck.questions.length} timed questions</li>
            <li>• Compete on the leaderboard</li>
            <li>• Add your own questions after playing!</li>
          </ul>
        </div>

        {/* Scoring Mode Selection */}
        <div className="space-y-3 mb-8">
          <h3 className="text-white font-semibold text-center mb-4">
            Choose Your Strategy:
          </h3>
          
          {scoringModes.map((mode) => (
            <button
              key={mode.mode}
              onClick={() => setSelectedMode(mode.mode)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedMode === mode.mode
                  ? 'border-white bg-white/20 shadow-lg'
                  : 'border-white/30 bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{mode.icon}</span>
                <div className="flex-1 text-left">
                  <h4 className="text-white font-semibold">{mode.title}</h4>
                  <p className="text-blue-200 text-sm">{mode.description}</p>
                </div>
                {selectedMode === mode.mode && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartGame}
          disabled={!selectedMode}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            selectedMode
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedMode ? '🚀 Start Dueling!' : 'Select a Strategy First'}
        </button>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-300 text-xs">
            Created by {deck.createdBy} • {deck.questions.length} questions
          </p>
        </div>
      </div>
    </div>
  );
};