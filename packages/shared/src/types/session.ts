export enum SessionStatus {
  WAITING = 'waiting',         // 等待玩家加入
  SELECTING = 'selecting',     // 选角阶段
  PLAYING = 'playing',         // 游戏进行中
  VOTING = 'voting',           // 投票中
  ENDED = 'ended',             // 已结束
}

export interface SessionPlayer {
  userId: string;
  characterId: string | null;
  isReady: boolean;
  joinedAt: Date;
}

export interface VoteRecord {
  roundIndex: number;
  nodeId: string;
  optionId: string;
  votes: Record<string, string>; // userId -> optionId
}

export interface GameSession {
  id: string;
  scriptId: string;
  status: SessionStatus;
  qrCodeUrl: string;
  players: SessionPlayer[];
  currentRound: number;
  currentPhase: string;
  voteHistory: VoteRecord[];
  branchPath: string[];        // 已走过的分支节点ID
  endingId: string | null;
  createdAt: Date;
}
