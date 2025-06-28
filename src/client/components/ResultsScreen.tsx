import React, { useState, useEffect } from 'react';
import { Deck, PlayerSession, LeaderboardResponse, LeaderboardEntry } from '../../shared/types/game';

interface ResultsScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onRestartGame: () => void;
}

const THEME_FLAIRS = [
  { id: 'battles', label: 'Epic Battles', icon: '⚔️', color: 'from-red-500 to-orange-500' },
  { id: 'food', label: 'Food Wars', icon: '🍕', color: 'from-yellow-500 to-orange-500' },
  { id: 'movies', label: 'Movie Madness', icon: '🎬', color: 'from-purple-500 to-pink-500' },
  { id: 'sports', label: 'Sports Showdown', icon: '⚽', color: 'from-green-500 to-blue-500' },
  { id: 'tech', label: 'Tech Talk', icon: '💻', color: 'from-blue-500 to-cyan-500' },
  { id: 'animals', label: 'Animal Kingdom', icon: '🦁', color: 'from-green-500 to-yellow-500' },
  { id: 'music', label: 'Music Mania', icon: '🎵', color: 'from-pink-500 to-purple-500' },
  { id: 'gaming', label: 'Gaming Galaxy', icon: '🎮', color: 'from-indigo-500 to-purple-500' },
  { id: 'science', label: 'Science Squad', icon: '🔬', color: 'from-cyan-500 to-blue-500' },
  { id: 'history', label: 'History Hub', icon: '📚', color: 'from-amber-500 to-red-500' },
  { id: 'custom', label: 'Custom Theme', icon: '✨', color: 'from-gray-500 to-gray-600' },
];

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  deck,
  playerSession,
  onRestartGame,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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

  const addQuestionToDeck = () => {
    const filteredCards = currentDeckQuestion.cards.filter(card => card.trim());
    
    if (!currentDeckQuestion.prompt.trim() || filteredCards.length < 2) {
      alert('Please provide a question and at least 2 answer options.');
      return;
    }

    const newQuestion = {
      prompt: currentDeckQuestion.prompt.trim(),
      cards: filteredCards,
      correctIndex: currentDeckQuestion.correctIndex,
      questionType: currentDeckQuestion.questionType,
    };

    setNewDeck(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));

    // Reset current question
    setCurrentDeckQuestion({
      prompt: '',
      cards: ['', '', '', ''],
      correctIndex: 0,
      questionType: 'multiple-choice',
    });
  };

  const removeQuestionFromDeck = (index: number) => {
    setNewDeck(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleCreateDeck = async () => {
    if (!newDeck.title.trim() || !newDeck.description.trim()) {
      alert('Please provide a title and description for your deck.');
      return;
    }

    if (newDeck.questions.length < 5) {
      alert('Please add at least 5 questions to your deck.');
      return;
    }

    const finalTheme = newDeck.theme === 'custom' ? newDeck.customTheme.trim() : newDeck.theme;
    if (!finalTheme) {
      alert('Please provide a theme for your deck.');
      return;
    }

    setIsCreatingPost(true);

    try {
      // Convert questions to proper format
      const formattedQuestions = newDeck.questions.map((q, index) => {
        let cards;
        if (q.questionType === 'multiple-choice') {
          cards = q.cards.map((text, cardIndex) => ({
            id: `card_${cardIndex}`,
            text: text.trim(),
            isCorrect: cardIndex === q.correctIndex,
          }));
        } else {
          cards = q.cards.map((text, cardIndex) => ({
            id: `step_${cardIndex}`,
            text: text.trim(),
            sequenceOrder: cardIndex + 1,
          }));
        }

        return {
          id: `q${index + 1}`,
          prompt: q.prompt,
          questionType: q.questionType,
          timeLimit: 20,
          cards,
        };
      });

      const deckData = {
        title: newDeck.title.trim(),
        description: newDeck.description.trim(),
        theme: finalTheme,
        questions: formattedQuestions,
      };

      const response = await fetch('/api/create-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deckData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert(`Deck created successfully! Post URL: ${data.postUrl}`);
        setIsCreateDeckModalOpen(false);
        // Reset form
        setNewDeck({
          title: '',
          description: '',
          theme: 'battles',
          customTheme: '',
          questions: [],
        });
      } else {
        alert(`Failed to create deck: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to create deck:', error);
      alert('Failed to create deck. Please try again.');
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
          <button
            onClick={() => setIsCreateDeckModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition-all text-md"
          >
            🎨 Create New Deck
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

      {/* Create Deck Modal */}
      {isCreateDeckModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-white font-bold text-2xl">🎨 Create New Deck</h4>
              <button 
                onClick={() => setIsCreateDeckModalOpen(false)}
                className="text-white text-3xl hover:text-red-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Deck Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-200 text-lg mb-2">Deck Title</label>
                  <input
                    type="text"
                    value={newDeck.title}
                    onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })}
                    placeholder="Epic Battles, Food Wars, etc."
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-blue-200 text-lg mb-2">Description</label>
                  <input
                    type="text"
                    value={newDeck.description}
                    onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                    placeholder="Who would win in these epic showdowns?"
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Theme/Flair Selection */}
              <div>
                <label className="block text-blue-200 text-lg mb-3">Theme/Flair</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {THEME_FLAIRS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setNewDeck({ ...newDeck, theme: theme.id })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newDeck.theme === theme.id
                          ? 'border-white bg-white/20'
                          : 'border-white/30 bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{theme.icon}</div>
                        <div className="text-white text-sm font-medium">{theme.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {newDeck.theme === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={newDeck.customTheme}
                      onChange={(e) => setNewDeck({ ...newDeck, customTheme: e.target.value })}
                      placeholder="Enter your custom theme..."
                      className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Questions Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-white font-bold text-xl">
                    Questions ({newDeck.questions.length}/5 minimum)
                  </h5>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    newDeck.questions.length >= 5 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {newDeck.questions.length >= 5 ? 'Ready!' : `Need ${5 - newDeck.questions.length} more`}
                  </div>
                </div>

                {/* Existing Questions */}
                {newDeck.questions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {newDeck.questions.map((question, index) => (
                      <div key={index} className="bg-white/10 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-blue-300 font-bold">Q{index + 1}:</span>
                              <span className="text-xs bg-purple-500/30 px-2 py-1 rounded">
                                {question.questionType}
                              </span>
                            </div>
                            <p className="text-white font-medium mb-2">{question.prompt}</p>
                            <div className="text-blue-200 text-sm">
                              {question.cards.filter(c => c.trim()).length} options
                            </div>
                          </div>
                          <button
                            onClick={() => removeQuestionFromDeck(index)}
                            className="text-red-400 hover:text-red-300 ml-4"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Question */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                  <h6 className="text-blue-200 font-medium mb-3">Add New Question</h6>
                  
                  {/* Question Type */}
                  <div className="flex space-x-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentDeckQuestion({ ...currentDeckQuestion, questionType: 'multiple-choice' })}
                      className={`px-4 py-2 rounded-lg ${
                        currentDeckQuestion.questionType === 'multiple-choice'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/20 text-blue-200 hover:bg-white/30'
                      }`}
                    >
                      Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDeckQuestion({ ...currentDeckQuestion, questionType: 'sequence' })}
                      className={`px-4 py-2 rounded-lg ${
                        currentDeckQuestion.questionType === 'sequence'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/20 text-blue-200 hover:bg-white/30'
                      }`}
                    >
                      Sequence Order
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <input
                    type="text"
                    value={currentDeckQuestion.prompt}
                    onChange={(e) => setCurrentDeckQuestion({ ...currentDeckQuestion, prompt: e.target.value })}
                    placeholder="Enter your question..."
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none mb-4"
                  />

                  {/* Answer Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {currentDeckQuestion.cards.map((card, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={card}
                          onChange={(e) => {
                            const newCards = [...currentDeckQuestion.cards];
                            newCards[index] = e.target.value;
                            setCurrentDeckQuestion({ ...currentDeckQuestion, cards: newCards });
                          }}
                          placeholder={currentDeckQuestion.questionType === 'sequence' ? `Step ${index + 1}` : `Option ${index + 1}`}
                          className="flex-1 p-2 rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:border-white/50 focus:outline-none"
                        />
                        {currentDeckQuestion.questionType === 'multiple-choice' && (
                          <button
                            onClick={() => setCurrentDeckQuestion({ ...currentDeckQuestion, correctIndex: index })}
                            className={`px-3 py-2 rounded-lg ${
                              currentDeckQuestion.correctIndex === index
                                ? 'bg-green-500 text-white'
                                : 'bg-white/20 text-blue-200 hover:bg-white/30'
                            }`}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setCurrentDeckQuestion({
                        ...currentDeckQuestion,
                        cards: [...currentDeckQuestion.cards, '']
                      })}
                      className="text-blue-300 hover:text-blue-100 flex items-center"
                    >
                      <span className="mr-1">+</span> Add Option
                    </button>
                    <button
                      onClick={addQuestionToDeck}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <div className="flex space-x-4 pt-4 border-t border-white/20">
                <button
                  onClick={handleCreateDeck}
                  disabled={newDeck.questions.length < 5 || isCreatingPost}
                  className={`flex-1 font-bold py-3 rounded-lg transition-all ${
                    newDeck.questions.length >= 5 && !isCreatingPost
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCreatingPost ? '🔄 Creating Post...' : '🚀 Create Deck & Post'}
                </button>
                <button
                  onClick={() => setIsCreateDeckModalOpen(false)}
                  className="px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
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