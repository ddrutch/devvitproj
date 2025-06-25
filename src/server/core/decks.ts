import { Deck, Question, GameCard } from '../../shared/types/game';

// Default deck for the game
export const getDefaultDeck = (): Deck => ({
  id: 'default-battles',
  title: 'Epic Battles',
  description: 'Who would win in these epic showdowns?',
  theme: 'battles',
  createdBy: 'system',
  createdAt: Date.now(),
  questions: [
    {
      id: 'q1',
      prompt: 'In a battle royale, who emerges victorious?',
      timeLimit: 20,
      cards: [
        { id: 'bear', text: '🐻 Grizzly Bear', isCorrect: false },
        { id: 'tiger', text: '🐅 Siberian Tiger', isCorrect: true },
        { id: 'elephant', text: '🐘 African Elephant', isCorrect: false },
        { id: 'rhino', text: '🦏 White Rhino', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      prompt: 'Which superhero wins in a no-holds-barred fight?',
      timeLimit: 20,
      cards: [
        { id: 'superman', text: '🦸‍♂️ Superman', isCorrect: true },
        { id: 'batman', text: '🦇 Batman', isCorrect: false },
        { id: 'hulk', text: '💚 Hulk', isCorrect: false },
        { id: 'thor', text: '⚡ Thor', isCorrect: false },
      ],
    },
    {
      id: 'q3',
      prompt: 'In a zombie apocalypse, what\'s your best weapon?',
      timeLimit: 20,
      cards: [
        { id: 'katana', text: '⚔️ Katana', isCorrect: false },
        { id: 'crossbow', text: '🏹 Crossbow', isCorrect: true },
        { id: 'baseball-bat', text: '⚾ Baseball Bat', isCorrect: false },
        { id: 'chainsaw', text: '🪚 Chainsaw', isCorrect: false },
      ],
    },
    {
      id: 'q4',
      prompt: 'Which food would survive longest in your fridge?',
      timeLimit: 20,
      cards: [
        { id: 'honey', text: '🍯 Honey', isCorrect: true },
        { id: 'bread', text: '🍞 Bread', isCorrect: false },
        { id: 'milk', text: '🥛 Milk', isCorrect: false },
        { id: 'banana', text: '🍌 Banana', isCorrect: false },
      ],
    },
    {
      id: 'q5',
      prompt: 'What\'s the most useless superpower?',
      timeLimit: 20,
      cards: [
        { id: 'talk-to-fish', text: '🐠 Talk to Fish', isCorrect: false },
        { id: 'change-traffic-lights', text: '🚦 Change Traffic Lights', isCorrect: true },
        { id: 'invisible-when-alone', text: '👻 Invisible When Alone', isCorrect: false },
        { id: 'super-smell', text: '👃 Super Smell', isCorrect: false },
      ],
    },
  ],
});

export const validateDeck = (deck: Partial<Deck>): string[] => {
  const errors: string[] = [];
  
  if (!deck.title?.trim()) {
    errors.push('Deck title is required');
  }
  
  if (!deck.questions || deck.questions.length < 3) {
    errors.push('Deck must have at least 3 questions');
  }
  
  if (deck.questions) {
    deck.questions.forEach((question, index) => {
      if (!question.prompt?.trim()) {
        errors.push(`Question ${index + 1}: Prompt is required`);
      }
      
      if (!question.cards || question.cards.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 answer cards`);
      }
      
      if (question.cards && question.cards.length > 5) {
        errors.push(`Question ${index + 1}: Cannot have more than 5 answer cards`);
      }
      
      if (question.cards) {
        question.cards.forEach((card, cardIndex) => {
          if (!card.text?.trim()) {
            errors.push(`Question ${index + 1}, Card ${cardIndex + 1}: Text is required`);
          }
        });
      }
    });
  }
  
  return errors;
};