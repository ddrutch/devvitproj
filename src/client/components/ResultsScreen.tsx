import React, { useState, useEffect } from 'react';
import { Deck, PlayerSession, LeaderboardEntry } from '../../shared/types/redditTypes';
import { sendToDevvit } from '../utils';
import { useDevvitListener } from '../hooks/useDevvitListener';
import { THEME_FLAIRS } from './comComponents/constants';
import { CreateDeckWizard } from './comComponents/deckWizard';

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
    const [showQuestionAddedFeedback, setShowQuestionAddedFeedback] = useState(false);
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [playerRank, setPlayerRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
    const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
    const [questionType, setQuestionType] = useState<'multiple-choice' | 'sequence'>('multiple-choice');
    const [newQuestion, setNewQuestion] = useState({
      prompt: '',
      cards: ['', '', '', ''],
      correctIndex: 0,
  });

  // New deck creation state
  const [newDeck, setNewDeck] = useState({
    title: '',
    description: '',
    theme: 'battles',
    customTheme: '',
    flairCSS: 'battles-flair', // Default flair CSS
    questions: [] as Array<{
      prompt: string;
      cards: string[];
      correctIndex: number;
      questionType: 'multiple-choice' | 'sequence';
    }>,
  });
  const [currentDeckQuestion, setCurrentDeckQuestion] = useState({
    prompt: '',
    cards: ['', '', '', ''],
    correctIndex: 0,
    questionType: 'multiple-choice' as 'multiple-choice' | 'sequence',
  });
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  useEffect(() => {
    sendToDevvit({
      type: 'GET_LEADERBOARD_DATA',
    });
  }, []);

  const LEADERBOARD_DATA = useDevvitListener("GIVE_LEADERBOARD_DATA");

  useEffect(() => {
    if (LEADERBOARD_DATA) {
      console.log("LEADERBOARD DATA RECEIVED", LEADERBOARD_DATA);

      setLeaderboard(LEADERBOARD_DATA.leaderboard);
      setPlayerRank(LEADERBOARD_DATA.playerRank ?? null);
      setLoading(false);
    }
  }, [LEADERBOARD_DATA]);

  const handleAddQuestion = async () => {
    setIsAddingQuestion(true); // Start loading
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
      return;
    }

    try {
      sendToDevvit({
        type: 'ADD_QUESTION',
        payload: {
          question: {
            id : `user_${Date.now()}`,
            prompt: newQuestion.prompt.trim(),
            cards,
            timeLimit: 20,
            questionType,
          },
        },
      });
      // Show feedback and close modal
      setShowQuestionAddedFeedback(true);
      setIsAddQuestionModalOpen(false);

      setTimeout(() => setShowQuestionAddedFeedback(false), 3000);
    } catch (error) {
      console.error('Failed to add question:', error);
    } finally {
      setIsAddingQuestion(false); // End loading
    }
      //alert('Failed to add question. Please try again.');
    
  };

  // const addQuestionToDeck = () => {
  //   const filteredCards = currentDeckQuestion.cards.filter(card => card.trim());
  //   if (!currentDeckQuestion.prompt.trim() || filteredCards.length < 2) {
  //     //alert('Please provide a question and at least 2 answer options.');
  //     return;
  //   }

  //   const newQuestion = {
  //     prompt: currentDeckQuestion.prompt.trim(),
  //     cards: filteredCards,
  //     correctIndex: currentDeckQuestion.correctIndex,
  //     questionType: currentDeckQuestion.questionType,
  //   };

  //   setNewDeck(prev => ({
  //     ...prev,
  //     questions: [...prev.questions, newQuestion],
  //   }));
  //   // Reset current question
  //   setCurrentDeckQuestion({
  //     prompt: '',
  //     cards: ['', '', '', ''],
  //     correctIndex: 0,
  //     questionType: 'multiple-choice',
  //   });
  // };

  // const removeQuestionFromDeck = (index: number) => {
  //   setNewDeck(prev => ({
  //     ...prev,
  //     questions: prev.questions.filter((_, i) => i !== index),
  //   }));
  //};

  const handleCreateDeck = async (createdDeck: Deck) => {
    if (!createdDeck.title.trim() || !createdDeck.description.trim()) {
      return;
    }

    if (createdDeck.questions.length < 5) {
      return;
    }
    
    const selectedFlair = THEME_FLAIRS.find(f => f.id === createdDeck.theme) ?? THEME_FLAIRS[0];
    


    setIsCreatingPost(true);

    try {
      // Prepare deck data - no need to convert questions
      const deckData: Deck = {
        ...createdDeck,
        theme: createdDeck.theme,
        flairCSS: selectedFlair?.cssClass ?? 'battles-flair',
      };

      // Send to backend
      sendToDevvit({
        type: 'CREATE_NEW_POST',
        payload: {
          postData: deckData,
        },
      });

      // Close modal
      setIsAddQuestionModalOpen(false);
      setIsCreateDeckModalOpen(false);
    } catch (error) {
      console.error('Failed to create deck:', error);
    } finally {
      setIsCreatingPost(false);
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

  const getSelectedTheme = () => {
    return THEME_FLAIRS.find(theme => theme.id === newDeck.theme) || THEME_FLAIRS[0];
  };

  return (
  <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-3 flex flex-col">
    {/* Built with Bolt.new Badge */}
    <div className="absolute top-2 right-2 z-50">
      <a 
        href="https://bolt.new" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center space-x-1 bg-black/20 backdrop-blur-sm border border-white/20 rounded-full px-2 py-1 text-white/80 hover:text-white hover:bg-black/30 transition-all text-xs"
      >
        <span>⚡</span>
        <span>Built with Bolt.new</span>
      </a>
    </div>

    {/* Main content area with reduced gap */}
    <div className="flex-grow flex flex-col md:flex-row gap-4 mb-2">
      {/* Player Score - Reduced size */}
      <div className="md:w-1/4 flex flex-col">
        <div className="text-center mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            🎉 Game Complete!
          </h1>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-2 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <span className="text-xl md:text-2xl">{getScoringModeIcon()}</span>
              <span className="text-white font-semibold capitalize text-sm md:text-base">
                {playerSession.scoringMode}
              </span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">
              {playerSession.totalScore}
            </div>
            <div className="text-yellow-200 text-sm md:text-base font-medium">
              {playerRank ? `Rank #${playerRank}` : 'Your Score'}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard - Takes more space */}
      <div className="md:flex-1 flex flex-col">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 flex-1 flex flex-col">
          <h3 className="text-white font-bold text-center mb-2 text-base md:text-lg">
            🏆 Leaderboard
          </h3>
          {loading ? (
            <div className="text-center text-blue-200 text-sm">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-blue-200 text-sm">Be the first to play!</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center space-y-2 md:space-y-1 lg:space-y-0.5">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`
                    transform
                    -   lg:scale-95
                    +   lg:scale-y-92
                    flex items-center justify-between
                    p-3 md:p-2 lg:py-1 lg:px-2
                    rounded-lg
                    text-base md:text-sm
                    ${entry.userId === playerSession.userId
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-white/5'}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold text-lg md:text-base">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-white truncate max-w-[120px]">
                      {entry.username}
                    </span>
                    <span className="text-sm md:text-xs">
                      {entry.scoringMode === 'contrarian' ? '🎭' :
                       entry.scoringMode === 'conformist' ? '👥' : '🧠'}
                    </span>
                  </div>
                  <span className="text-white font-bold text-lg md:text-base">
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
      
      {/* Action Buttons - Smaller and more compact */}
      <div className="flex justify-center gap-3 pb-2">
        <button
          onClick={onRestartGame}
          className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
        >
          <span className="text-xl">🔄</span>
          <span className="text-xs mt-1">Play Again</span>
        </button>
        
        <button
          onClick={() => setIsAddQuestionModalOpen(true)}
          disabled={isAddingQuestion}
          className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
        >
          <span className="text-xl">➕</span>
          <span className="text-xs mt-1">Add Question</span>
        </button>
        
        <button
          onClick={() => setIsCreateDeckModalOpen(true)}
          className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-lg transition-all"
        >
          <span className="text-xl">🎨</span>
          <span className="text-xs mt-1">Create Deck</span>
        </button>
      </div>


      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20 px-4">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-lg p-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h4 className="text-white font-bold text-xl">Add Your Question</h4>
              <button onClick={() => setIsAddQuestionModalOpen(false)} className="text-white text-3xl">×</button>
            </div>

            {/* Body: Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Prompt */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-blue-200 text-base mb-2">Question Prompt</label>
                <input
                  type="text"
                  value={newQuestion.prompt}
                  onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                  placeholder="Enter your question..."
                  className="w-full p-2 text-base rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none"
                />
              </div>

              {/* Question Type */}
              <div className="col-span-1 sm:col-span-2 flex space-x-6">
                <button
                  onClick={() => setQuestionType('multiple-choice')}
                  className={`flex-1 py-2 text-base rounded-lg ${questionType === 'multiple-choice' ? 'bg-purple-600 text-white' : 'bg-white/20 text-blue-200'}`}
                >Multiple Choice</button>
                <button
                  onClick={() => setQuestionType('sequence')}
                  className={`flex-1 py-2 text-base rounded-lg ${questionType === 'sequence' ? 'bg-purple-600 text-white' : 'bg-white/20 text-blue-200'}`}
                >Sequence Order</button>
              </div>

              {/* Options */}
              {newQuestion.cards.slice(0, 4).map((card, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={card}
                    onChange={(e) => {
                      const cards = [...newQuestion.cards];
                      cards[idx] = e.target.value;
                      setNewQuestion({ ...newQuestion, cards });
                    }}
                    placeholder={questionType === 'sequence' ? `Step ${idx + 1}` : `Option ${idx + 1}`}
                    className="flex-1 p-2 text-base rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none"
                  />
                  {questionType === 'multiple-choice' && (
                    <button
                      onClick={() => setNewQuestion({ ...newQuestion, correctIndex: idx })}
                      className={`px-3 py-1 text-base rounded-lg ${newQuestion.correctIndex === idx ? 'bg-green-500 text-white' : 'bg-white/20 text-blue-200'}`}
                    >✓</button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsAddQuestionModalOpen(false)}
                className="px-4 py-2 text-base rounded-lg bg-gray-600 text-white"
              >Cancel</button>
              <button
                onClick={handleAddQuestion}
                disabled={isAddingQuestion}
                className={`px-6 py-2 text-base rounded-lg ${
                  isAddingQuestion ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600'
                } text-white`}
              >Submit</button>
            </div>
          </div>
        </div>
      )}


      {/* Optional feedback toast */}
      {showQuestionAddedFeedback && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg">
          Question added!
        </div>
      )}
      
      {/* Create Deck Wizard Modal */}
      {isCreateDeckModalOpen && (
        <CreateDeckWizard
          onClose={() => setIsCreateDeckModalOpen(false)}
          onSubmit={handleCreateDeck}
        />
      )}
    </div>
  );
};