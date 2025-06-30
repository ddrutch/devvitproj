import React, { useState } from 'react';
import { THEME_FLAIRS } from './constants';
import { Deck, GameCard, Question } from '../../../shared/types/redditTypes';

interface DeckData {
  title: string;
  description: string;
  theme: string;
  customTheme: string;
  flairCSS: string;
  questions: Question[];
}

interface CreateDeckWizardProps {
  onClose: () => void;
  onSubmit: (deck: Deck) => void;
}

export const CreateDeckWizard: React.FC<CreateDeckWizardProps> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [questionCount, setQuestionCount] = useState(5);
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    questions: [] as string[],
  });

  const [deck, setDeck] = useState<DeckData>({
    title: '',
    description: '',
    theme: 'battles',
    flairCSS: 'battles-flair',
    customTheme: '',
    questions: [],
  });

  // Helper function to generate unique card IDs
  const generateCardId = () => `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const createGameCard = (text: string, isCorrect: boolean, sequenceOrder: number): GameCard => ({
    id: `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    text,
    isCorrect,
    sequenceOrder
  });

  // Initialize a question with proper GameCard objects
  // Initialize a question with proper GameCard objects
  const initializeQuestion = (): Question => ({
    id: `temp_${Date.now()}`,
    prompt: '',
    cards: [
      createGameCard('', true, 1),
      createGameCard('', false, 2),
      createGameCard('', false, 3),
      createGameCard('', false, 4),
    ],
    timeLimit: 20,
    questionType: 'multiple-choice',
  });


  const [currentQuestion, setCurrentQuestion] = useState<Question>(initializeQuestion());

  const isLastStep = () => step === 1 + questionCount + 1;

  const validateStep1 = () => {
    const newErrors = { title: '', description: '' };
    let isValid = true;
    
    if (!deck.title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    
    if (!deck.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    setErrors({ ...errors, ...newErrors });
    return isValid;
  };

  const validateQuestion = () => {
    const questionErrors = [...errors.questions];
    let isValid = true;
    
    if (!currentQuestion.prompt.trim()) {
      questionErrors[step - 2] = 'Question prompt is required';
      isValid = false;
    }
    
    // Check at least 2 non-empty options
    const validOptions = currentQuestion.cards.filter(card => card.text.trim()).length;
    if (validOptions < 2) {
      questionErrors[step - 2] = 'At least 2 options are required';
      isValid = false;
    }
    
    // For multiple-choice, validate correct card exists
    if (currentQuestion.questionType === 'multiple-choice') {
      const hasCorrect = currentQuestion.cards.some(card => card.isCorrect);
      if (!hasCorrect) {
        questionErrors[step - 2] = 'Please select a correct answer';
        isValid = false;
      }
    }
    
    setErrors({ ...errors, questions: questionErrors });
    return isValid;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step > 1 && step <= 1 + questionCount && !validateQuestion()) return;

    if (step > 1 && step <= 1 + questionCount) {
      setDeck(d => ({
        ...d,
        questions: [...d.questions, currentQuestion],
      }));
      setCurrentQuestion(initializeQuestion());
    }

    if (isLastStep()) {
      const flair = THEME_FLAIRS.find(f => f.id === deck.theme);
      const safeFlair = flair ?? THEME_FLAIRS[0];
      if (!safeFlair) {
        console.error('No flair found. Please check THEME_FLAIRS list.');
        return;
      }
      
      const finalDeck: Deck = {
        title: deck.title,
        description: deck.description,
        theme: deck.theme,
        flairCSS: safeFlair.cssClass,
        questions: deck.questions,
        flairText: deck.title.trim(),
        createdBy: 'User',
        createdAt: Date.now(),
        id: `deck_${Date.now()}`,
      };
      
      onSubmit(finalDeck);
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) return onClose();
    setStep(step - 1);
  };

  const updateCard = (index: number, value: string) => {
    const newCards = currentQuestion.cards.map((card, i) => 
      i === index ? {...card, text: value} : card
    );
    
    setCurrentQuestion({
      ...currentQuestion,
      cards: newCards,
    });
  };

  const setCorrectCard = (index: number) => {
    const newCards = currentQuestion.cards.map((card, i) => ({
      ...card,
      isCorrect: i === index
    }));
    
    setCurrentQuestion({
      ...currentQuestion,
      cards: newCards,
    });
  };

  const addCardOption = () => {
    if (currentQuestion.cards.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        cards: [
          ...currentQuestion.cards,
          createGameCard(
            '', 
            false, 
            currentQuestion.cards.length + 1
          )
        ],
      });
    }
  };

  const removeCardOption = (index: number) => {
    if (currentQuestion.cards.length > 2) {
      const newCards = [...currentQuestion.cards];
      newCards.splice(index, 1);
      
      // Adjust correct card if needed
      let shouldUpdateCorrect = false;
      if (currentQuestion.questionType === 'multiple-choice') {
        shouldUpdateCorrect = currentQuestion.cards[index]?.isCorrect ?? false;
      }
      
      setCurrentQuestion({
        ...currentQuestion,
        cards: shouldUpdateCorrect
          ? newCards.map((card, i) => ({ ...card, isCorrect: i === 0 }))
          : newCards,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-xl p-6 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-white text-2xl font-bold">Create New Deck</h4>
              
              <div>
                <label className="block text-blue-200">Title *</label>
                <input
                  className={`w-full p-2 rounded ${errors.title ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={deck.title}
                  onChange={e => setDeck({ ...deck, title: e.target.value })}
                  placeholder="Enter deck title"
                />
                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
              </div>
              
              <div>
                <label className="block text-blue-200">Description *</label>
                <textarea
                  className={`w-full p-2 rounded ${errors.description ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={deck.description}
                  onChange={e => setDeck({ ...deck, description: e.target.value })}
                  placeholder="Describe your deck"
                  rows={3}
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              </div>
              
              <div>
                <label className="block text-blue-200">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_FLAIRS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDeck(d => ({ ...d, theme: f.id, flairCSS: f.cssClass }))}
                      className={`p-2 rounded ${deck.theme === f.id ? 'bg-white/30' : 'bg-white/10'}`}
                    >
                      <div className="text-center">
                        <div className="text-lg">{f.icon}</div>
                        <div className="text-xs text-white">{f.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step > 1 && !isLastStep() && (
            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Question {step - 1}</h4>
              
              <div className="flex space-x-2 mb-4">
                <button
                  className={`px-3 py-1 rounded ${currentQuestion.questionType === 'multiple-choice' ? 'bg-blue-500' : 'bg-gray-700'}`}
                  onClick={() => setCurrentQuestion({
                    ...currentQuestion,
                    questionType: 'multiple-choice'
                  })}
                >
                  Multiple Choice
                </button>
                <button
                  className={`px-3 py-1 rounded ${currentQuestion.questionType === 'sequence' ? 'bg-blue-500' : 'bg-gray-700'}`}
                  onClick={() => setCurrentQuestion({
                    ...currentQuestion,
                    questionType: 'sequence'
                  })}
                >
                  Sequence Order
                </button>
              </div>
              
              <div>
                <label className="block text-blue-200">Prompt *</label>
                <input
                  className={`w-full p-2 rounded ${errors.questions[step-2] ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={currentQuestion.prompt}
                  onChange={e => setCurrentQuestion({ 
                    ...currentQuestion, 
                    prompt: e.target.value 
                  })}
                  placeholder="Enter your question"
                />
              </div>
              
              <div>
                <label className="block text-blue-200">Options *</label>
                <div className="space-y-2">
                  {currentQuestion.cards.map((card, idx) => (
                    <div key={card.id} className="flex items-center space-x-2">
                      {currentQuestion.questionType === 'sequence' && (
                        <span className="text-white w-6 h-6 flex items-center justify-center rounded bg-blue-500">
                          {idx + 1}
                        </span>
                      )}
                      
                      <input
                        className="flex-1 p-2 rounded bg-white/20 text-white"
                        value={card.text}
                        onChange={e => updateCard(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      
                      {currentQuestion.questionType === 'multiple-choice' && (
                        <button
                          onClick={() => setCorrectCard(idx)}
                          className={`w-8 h-8 flex items-center justify-center rounded ${
                            card.isCorrect 
                              ? 'bg-green-500' 
                              : 'bg-gray-600'
                          }`}
                        >
                          {card.isCorrect ? '✓' : ''}
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeCardOption(idx)}
                        className="w-8 h-8 flex items-center justify-center bg-red-500/80 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {currentQuestion.cards.length < 6 && (
                    <button
                      onClick={addCardOption}
                      className="px-3 py-1 bg-blue-600 rounded text-white"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
                
                {errors.questions[step-2] && (
                  <p className="text-red-400 text-sm mt-1">{errors.questions[step-2]}</p>
                )}
              </div>
            </div>
          )}

          {isLastStep() && (
            <div className="text-white">
              <h4 className="text-2xl font-bold mb-4">Review Deck</h4>
              
              <div className="mb-4">
                <p><strong>Title:</strong> {deck.title}</p>
                <p><strong>Description:</strong> {deck.description}</p>
                <p><strong>Theme:</strong> {THEME_FLAIRS.find(t => t.id === deck.theme)?.label}</p>
              </div>
              
              <div>
                <h5 className="text-xl font-bold mb-2">Questions:</h5>
                {deck.questions.map((q, idx) => (
                  <div key={idx} className="mb-4 p-3 bg-white/10 rounded-lg">
                    <p><strong>Q{idx + 1}:</strong> {q.prompt}</p>
                    <p className="mt-2"><strong>Options:</strong></p>
                    <ul className="list-disc pl-5 mt-1">
                      {q.cards.map((card, cardIdx) => (
                        <li 
                          key={card.id} 
                          className={card.isCorrect ? 'text-green-300' : ''}
                        >
                          {card.text}
                          {card.isCorrect && ' ✓'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <button 
            onClick={handleBack} 
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={handleNext}
            className={`px-4 py-2 text-white rounded ${
              isLastStep() ? 'bg-green-600' : 'bg-blue-600'
            }`}
          >
            {isLastStep() ? 'Create Deck' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};