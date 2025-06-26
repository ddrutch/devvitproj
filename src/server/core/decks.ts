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
      questionType: 'multiple-choice',
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
      questionType: 'multiple-choice',
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
      questionType: 'multiple-choice',
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
      questionType: 'multiple-choice',
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
      questionType: 'multiple-choice',     
      timeLimit: 20,
      cards: [
        { id: 'talk-to-fish', text: '🐠 Talk to Fish', isCorrect: false },
        { id: 'change-traffic-lights', text: '🚦 Change Traffic Lights', isCorrect: true },
        { id: 'invisible-when-alone', text: '👻 Invisible When Alone', isCorrect: false },
        { id: 'super-smell', text: '👃 Super Smell', isCorrect: false },
      ],
    },
    
    {
      id: 'q6',
      prompt: 'Order the steps for a perfect bank heist:',
      questionType: 'sequence',
      timeLimit: 30,
      cards: [
        { id: 'step1', text: 'Case the joint', sequenceOrder: 1 },
        { id: 'step2', text: 'Disable security', sequenceOrder: 2 },
        { id: 'step3', text: 'Grab the loot', sequenceOrder: 3 },
        { id: 'step4', text: 'Escape clean', sequenceOrder: 4 },
      ],
    }
    
  ],
});

export const getOperationsDeck = (): Deck => ({
  id: 'order-of-operations',
  title: 'Perfect Sequence',
  description: 'Arrange steps in the correct order',
  theme: 'sequence',
  createdBy: 'system',
  createdAt: Date.now(),
  questions: [
    {
      id: 'q1',
      prompt: 'Order the steps for a perfect bank heist:',
      questionType: 'sequence',
      timeLimit: 30,
      cards: [
        { id: 'step1', text: 'Case the joint', sequenceOrder: 1 },
        { id: 'step2', text: 'Disable security', sequenceOrder: 2 },
        { id: 'step3', text: 'Grab the loot', sequenceOrder: 3 },
        { id: 'step4', text: 'Escape clean', sequenceOrder: 4 },
      ],
    },
    {
      id: 'q2',
      prompt: 'Arrange the steps to make a perfect omelette:',
      questionType: 'sequence',
      timeLimit: 30,
      cards: [
        { id: 'step1', text: 'Crack eggs into bowl', sequenceOrder: 1 },
        { id: 'step2', text: 'Whisk eggs with salt/pepper', sequenceOrder: 2 },
        { id: 'step3', text: 'Heat butter in pan', sequenceOrder: 3 },
        { id: 'step4', text: 'Pour eggs into pan', sequenceOrder: 4 },
        { id: 'step5', text: 'Fold and serve', sequenceOrder: 5 },
      ],
    },
    {
      id: 'q3',
      prompt: 'Which superpower would you want?',
      questionType: 'multiple-choice',
      timeLimit: 20,
      cards: [
        { id: 'fly', text: 'Flight' },
        { id: 'invis', text: 'Invisibility' },
        { id: 'strength', text: 'Super strength' },
        { id: 'tele', text: 'Teleportation' },
      ],
    }
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