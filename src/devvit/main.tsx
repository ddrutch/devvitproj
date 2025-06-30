import { Devvit, Post, useWebView } from '@devvit/public-api';
import { BlocksToWebviewMessage, WebviewToBlockMessage } from '../shared/types/redditTypes';
import { createRedisService } from './redisService';
import { createNewPost as createNewPostUtil } from './createNewPost';
import '../server/index';
import { defineConfig } from '@devvit/server';
import { getDefaultDeck } from '../server/core/decks';
import { Preview } from './Preview';
import { Question } from '../shared/types/redditTypes';
import { HeroButton } from './components/HeroButton';

defineConfig({
  name: '[Bolt] Debate Dueler',
  entry: 'index.html',
  height: 'tall',
  menu: { enable: false },
});


Devvit.addMenuItem({
  label: 'Create Debate Dueler Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({

      title: 'default duel',
      subredditName: subreddit.name,
      preview: <Preview />,
    });
    ui.showToast({ text: 'Created post!' });
    ui.navigateTo(post.url);
  },
});

Devvit.addCustomPostType({
  name: 'Dueler',
  height: 'tall',
  render:  (context) => { 
    const grapuser = context.reddit.getCurrentUsername() || 'Anonymous';
    const { mount } = useWebView<WebviewToBlockMessage, BlocksToWebviewMessage>({
    
      
      onMessage: async (event, { postMessage }) => {
        console.log('Received message', event);
        const data = event as unknown as WebviewToBlockMessage;
        const redisService = createRedisService(context);
        const defaultDeck = getDefaultDeck();
        const deck = await redisService.getDeck(context.postId!) || defaultDeck;
        const playerSession = await redisService.getPlayerSession(context.postId!, context.userId!);
        const leaderboard = await redisService.getLeaderboard(context.postId!);
        const playerRank = await redisService.getPlayerRank(context.postId!, context.userId!);
        const allQuestionStats = await redisService.getQuestionStats(context.postId!, deck);
        const graphicUsername = await context.reddit.getCurrentUsername();

        
        if (deck == defaultDeck) {
          await redisService.saveDeck(context.postId!, defaultDeck);
        }

        switch (data.type) {
          case 'INIT':   
            postMessage({
              type: 'INIT_RESPONSE',
              payload: {
                postId: context.postId!,
                deck: deck,
                playerSession: playerSession,
                playerRank: playerRank,
                userId : context.userId!,
                username: await context.reddit.getCurrentUsername() || 'Anonymous',
                allQuestionStats: allQuestionStats || null,
              },
            });
            break;
          case 'CREATE_NEW_POST':
            //await createNewPostUtil(data.payload.post.Title, data.payload.post, context);
            await createNewPostUtil(data.payload.postData, context);
          break;

          case 'COMPLETE_GAME':
            //await redisService.saveUserData(context.userId!, data.payload.playerData);
            if (context.postId && context.userId) {
              await redisService.saveUserGameData(
                context.postId,
                context.userId,
                data.payload.answers,
                data.payload.totalScore,
                data.payload.sessionData
              );
              
              postMessage({
                type: 'CONFIRM_SAVE_PLAYER_DATA',
                payload: { isSaved: true }
              });
            }
            break;
          case 'GET_LEADERBOARD_DATA': 
            postMessage({
              type: 'GIVE_LEADERBOARD_DATA',
              payload: {
                leaderboard,
                playerRank: playerRank,
                playerScore: null,
              },
            })
            break;
          case 'ADD_QUESTION':
            if (context.postId) {
              const username = await context.reddit.getCurrentUsername() || 'Anonymous';
              const question: Question = {
                ...data.payload.question,
                authorUsername: username, // Now guaranteed to be string
              };
              await redisService.addQuestionToDeck(context.postId, question);
            }
            break;

          default:
            console.error('Unknown message type', data satisfies never);
            break;
        }
      },
    });

    return (
      <zstack width="100%" height="100%" alignment="center middle">
        <image
          imageHeight={1024}
          imageWidth={1500}
          height="100%"
          width="100%"
          url="background2.png"
          description="Striped blue background"
          resizeMode="cover"
        />
      <vstack alignment="center" gap="none" padding="large" grow>
          {/* Title section */}
          <vstack width={'100%'} height={'30%'} alignment="top center">
            <image
              url="logo.png"
              description="Loading..."
              height={'140px'}
              width={'140px'}
              imageHeight={'240px'}
              imageWidth={'240px'}
            />
          </vstack>
          <vstack height="30%" alignment="middle center" gap="medium">
            <text size="xxlarge" weight="bold" outline = "thick">{}</text>
          </vstack>
          
          {/* Main content section */}
          <vstack height="70%" alignment="center" grow>
            {/* Button row */}
            <vstack height="40%" alignment="bottom center" gap="medium">
              <HeroButton
                label="Play the game!"
                onPress={() => {mount();}}
                animated={true}
              />
                 
            </vstack>
        </vstack>
      </vstack>
      </zstack>
    );
  },
});






























export default Devvit;