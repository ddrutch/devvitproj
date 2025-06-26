import { Devvit, Post, useWebView } from '@devvit/public-api';

// Side effect import to bundle the server. The /index is required for server splitting.
import '../server/index';
import { defineConfig } from '@devvit/server';
import { saveDeck, getDeck } from '../server/core/game';
import { getDefaultDeck } from '../server/core/decks';
import { getRedis } from '@devvit/redis';

defineConfig({
  name: '[Bolt] Debate Dueler',
  entry: 'index.html',
  height: 'tall',
  menu: { enable: false },
});

// Devvit.addCustomPostType({
//   name: 'Debate Dueler',
//   height: 'tall',
//   render: (context) => {
//     const { mount } = useWebView({
      
//       onMessage: async (event, { postMessage }) => {
//       }
//     });

//     return (
//       <vstack alignment="center middle" gap="large" grow padding="large">
//         <text size="xxlarge" weight="bold">🥊 Debate Dueler</text>
        
//         <image
//           url="loading.gif"
//           description="Loading animation"
//           imageWidth={200}
//           imageHeight={200}
//           resizeMode="fit"
//         />

//         <vstack alignment="center" gap="medium">
//           <text size="large" weight="bold" color="orange">Choose Your Strategy:</text>
//           <text size="medium">🎭 Contrarian • 👥 Conformist • 🧠 Trivia</text>
//         </vstack>

//         <button
//           size="large"
//           appearance="primary"
//           onPress={() => mount()}
//         >
//           🚀 Start Dueling!
//         </button>
//       </vstack>
//     );
//   },
// });

export const Preview: Devvit.BlockComponent<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <zstack width={'100%'} height={'100%'} alignment="center middle">
      <vstack width={'100%'} height={'100%'} alignment="center middle">
        <image
          url="loading.gif"
          description="Loading..."
          height={'140px'}
          width={'140px'}
          imageHeight={'240px'}
          imageWidth={'240px'}
        />
        <spacer size="small" />
        <text maxWidth={`80%`} size="large" weight="bold" alignment="center middle" wrap>
          {text}
        </text>
      </vstack>
    </zstack>
  );
};

// Menu item for creating new posts
Devvit.addMenuItem({
  label: '[Bolt Debate Dueler]: New Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    let post: Post | undefined;
    try {
      const subreddit = await reddit.getCurrentSubreddit();
      post = await reddit.submitPost({
        title: 'Debate Dueler - Epic Battles',
        subredditName: subreddit.name,
        preview: <Preview />,
      });

      // Initialize the game with default deck
      const redis = getRedis();
      const defaultDeck = getDefaultDeck();
      await saveDeck({ redis, postId: post.id, deck: defaultDeck });

      ui.showToast({ text: 'Debate Dueler post created!' });
      ui.navigateTo(post.url);
    } catch (error) {
      if (post) {
        await post.remove(false);
      }
      if (error instanceof Error) {
        ui.showToast({ text: `Error creating post: ${error.message}` });
      } else {
        ui.showToast({ text: 'Error creating post!' });
      }
    }
  },
});

export default Devvit;