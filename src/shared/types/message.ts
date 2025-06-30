import { GameUserData, RedditUserData } from './userData.js';
import { PostData } from './postData.js';

import { LeaderboardEntry } from './game.js';

/** Message from Devvit to the web view. */
export type DevvitMessage =
  | { type: 'initialData'; data: { userId:string, postId:string } }
  | { type: 'fetchPostDataReponse'; data: { postData:PostData } }
  | { type: 'fetchLeaderboardResponse'; data: { leaderboard:LeaderboardEntry[] } }
  | { type: 'fetchUserDataResponse'; data: { redditUser:RedditUserData, dbUser:GameUserData } }
  | { type: 'buyProductResponse'; data: { productSku:string, status:string, error:string } }
  | { type: 'setUserScoreResponse'; data: { status:string } }
  | { type: 'setUserDataResponse'; data: { status:string } }

export type DevvitMessageType = DevvitMessage['type'];

/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: 'webViewReady' }
  | { type: 'fetchPostData'}
  | { type: 'createNewPost' }
  | { type: 'setUserScore'; data: { score:number } }
  | { type: 'setUserData'; data: { userId: string, userData:GameUserData } }
  | { type: 'fetchLeaderboard', data: {topEntries:number} }
  | { type: 'fetchUserData', data: {userId:string} }


export type WebViewMessageType = WebViewMessage['type'];

/**
 * Web view MessageEvent listener data type. The Devvit API wraps all messages
 * from Blocks to the web view.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  /** Reserved type for messages sent via `context.ui.webView.postMessage`. */
  type?: 'devvit-message' | string;
};
