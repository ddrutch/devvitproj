export type GameUserData = {
    decks: string; // JSON string of all decks (optional for backward compatibility)
    activeDeckId: string; // ID of the active deck (optional for backward compatibility)
}



export type RedditUserData = {
    username: string;
    userId: string;
}
