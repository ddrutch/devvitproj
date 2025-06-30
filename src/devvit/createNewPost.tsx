import { Devvit} from '@devvit/public-api';
import { createRedisService } from './redisService.js';
import { Preview } from './Preview.js';
import { Deck } from '../shared/types/redditTypes.js';




export async function createNewPost(postData : Deck , context: Devvit.Context) {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
        //title: postData.title,
        title: `🥊 ${postData.title} by ${postData.createdBy}`,
        subredditName: subreddit.name,
        // The preview appears while the post loads
        preview: <Preview />,
        
        //runAs: 'USER',
        // preview: (
        //     <vstack height="100%" width="100%" alignment="middle center">
        //         <text size="large">Loading ...</text>
        //     </vstack>
        // ),
    });
    //const redis = getRedis();
    const redisService = createRedisService(context);
    //const redis = createRedisService(context);
    //await redisService.savePostData(post.id, postData);
    await redisService.saveDeck(post.id, postData);

    ui.showToast({ text: 'Created post!' });
    ui.navigateTo(post);
}