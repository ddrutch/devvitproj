import React, { useState } from 'react';
import { ScoringMode, Deck, PlayerSession } from '../../shared/types/redditTypes';

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
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleStartGame = () => {
    if (selectedMode) {
      onStartGame(selectedMode);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            🥊 Debate Dueler
          </h1>
          <p className="text-blue-200 text-lg">
            {deck.title}
          </p>
          <button 
            onClick={() => setShowHowToPlay(true)}
            className="mt-2 text-blue-300 underline text-sm"
          >
            How to Play
          </button>
        </div>

        {/* Existing Session Notice */}
        {existingSession && existingSession.gameState === 'playing' && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-6">
            <p className="text-yellow-200 text-center text-sm">
              You have a game in progress! Starting a new game will reset your current progress.
            </p>
          </div>
        )}

        {/* Strategy Selection */}
        <div className="space-y-4 mb-8">
          <h3 className="text-white font-semibold text-center text-xl">
            Choose Your Strategy:
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {scoringModes.map((mode) => (
              <button
                key={mode.mode}
                onClick={() => setSelectedMode(mode.mode)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMode === mode.mode
                    ? 'border-white bg-white/20 shadow-lg'
                    : 'border-white/30 bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{mode.icon}</span>
                  <div className="text-left">
                    <h4 className="text-white font-semibold">{mode.title}</h4>
                    <p className="text-blue-200 text-sm">{mode.description}</p>
                  </div>
                  {selectedMode === mode.mode && (
                    <div className="ml-auto w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartGame}
          disabled={!selectedMode}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            selectedMode
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedMode ? '🚀 Start Dueling!' : 'Select a Strategy First'}
        </button>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-300 text-sm">
            Created by {deck.createdBy} • {deck.questions.length} questions
          </p>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">How to Play</h3>
            </div>
            
            <div className="space-y-4">
              <ul className="text-blue-200 space-y-3">
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Choose your scoring strategy</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Answer {deck.questions.length} timed questions</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Compete on the leaderboard</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Add your own questions after playing!</span>
                </li>
              </ul>
              
              <div className="pt-4">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};