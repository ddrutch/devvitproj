# 🥊 Debate Dueler

A fast-paced, card-based debate game built for Reddit using Devvit. Players choose sides on controversial topics and compete using different scoring strategies in timed rounds.

## 🎮 How to Play

1. **Choose Your Strategy:**
   - **🎭 Contrarian**: Score higher for picking the least popular choice
   - **👥 Conformist**: Score higher for picking the most popular choice  
   - **🧠 Trivia**: Score based on correct answers

2. **Answer Questions**: Respond to timed multiple-choice or sequence questions

3. **Compete**: Climb the leaderboard and see how your choices compare to the community

4. **Create**: Add your own questions or create entirely new debate topics

## ✨ Features

- **Three Unique Scoring Modes** - Play your way with different strategies
- **Real-time Community Stats** - See how popular each choice is
- **Mobile-First Design** - Optimized for all screen sizes
- **User-Generated Content** - Add questions and create custom debate decks
- **Leaderboards** - Compete with other players
- **Themed Categories** - Epic Battles, Food Wars, Movie Madness, and more

## 🛠️ Built With

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js serverless functions
- **Database**: Redis (via Devvit)
- **Platform**: Reddit Devvit
- **Development**: Bolt.new

## 🚀 Getting Started

This project is designed to run on Reddit's Devvit platform. To set up locally:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Login to Reddit:**
   ```bash
   npm run login
   ```

3. **Initialize the app:**
   ```bash
   npm run devvit:init
   ```

4. **Update your test subreddit** in `package.json` (replace `YOUR_SUBREDDIT_NAME`)

5. **Start development:**
   ```bash
   npm run dev
   ```

## 📱 Testing

The app should be tested on Reddit, not in the preview window:

1. Go to your test subreddit
2. Click the three dots menu → Create Post
3. Look for "[Bolt] Debate Dueler" option
4. Create and test your post

## 🎯 Game Mechanics

### Scoring System
- **Base Score**: 50 points per question
- **Time Bonus**: +5 points per second remaining
- **Strategy Multiplier**: Based on your chosen scoring mode

### Question Types
- **Multiple Choice**: Pick the best answer from 2-5 options
- **Sequence**: Arrange items in the correct order

### Community Features
- **Add Questions**: Contribute to existing debates
- **Create Decks**: Start entirely new debate topics
- **Leaderboards**: See top players across all scoring modes

## 🏗️ Project Structure

```
src/
├── client/          # React frontend (webview)
├── devvit/          # Reddit Devvit app components  
├── server/          # Node.js serverless backend
└── shared/          # Shared types and utilities
```

## 🎨 Themes

Choose from pre-built themes or create custom ones:
- ⚔️ Epic Battles
- 🍕 Food Wars  
- 🎬 Movie Madness
- ⚽ Sports Showdown
- 💻 Tech Talk
- 🦁 Animal Kingdom
- 🎵 Music Mania
- 🎮 Gaming Galaxy
- 🔬 Science Squad
- 📚 History Hub
- ✨ Custom Theme

## 🤝 Contributing

This is a hackathon project built with Bolt.new! Feel free to:
- Add new question types
- Create new themes
- Improve the scoring system
- Enhance the UI/UX

## 📄 License

BSD-3-Clause License - see LICENSE file for details

---

**Built with ⚡ [Bolt.new](https://bolt.new)** - The AI-powered full-stack development platform