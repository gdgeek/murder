export interface PlayerAccount {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatarUrl: string;
  totalGamesPlayed: number;
  totalScriptsPlayed: number;
  totalEndingsUnlocked: number;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requiredGames: number | null;    // 基于游玩次数的成就
  specialCondition: string | null; // 特殊条件成就
  iconUrl: string;
}

export interface CollectionItem {
  id: string;
  userId: string;
  type: 'ending_card' | 'character_card';
  scriptId: string;
  itemName: string;
  unlockedAt: Date;
}

export interface GameHistoryEntry {
  sessionId: string;
  scriptId: string;
  scriptName: string;
  characterId: string;
  characterName: string;
  endingName: string;
  playedAt: Date;
}
