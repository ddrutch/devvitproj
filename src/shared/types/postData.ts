export type PostData = {
    Title: string;
    character: string;
    turnHistory: string;    
    enemyDeck: string;
    authorAvatar: string;
    authorId: string; 
    authorName: string; 
    leaderboard?: string; // Store as stringified array of LeaderboardEntry
    
    publishedUserIds?: string; // Array of user IDs who have published
};

export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatar: string;
    healthRemaining: number;
    turnsTaken: number;
    score: number;
    timestamp: number;
}