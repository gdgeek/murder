import type { SessionPlayer, VoteRecord } from './session.js';
import type {
  ClueCard,
  VoteOption,
  Ending,
  RoundUpdate,
  VoteResult,
  PlayerEvaluation,
} from './script.js';

// 客户端 -> 服务端
export type ClientEvent =
  | { type: 'join_session'; sessionId: string; token: string }
  | { type: 'select_character'; characterId: string }
  | { type: 'ready' }
  | { type: 'chat_message'; content: string }
  | { type: 'vote'; optionId: string }
  | { type: 'ask_dm'; question: string }
  | { type: 'submit_suggestion'; content: string };

// 服务端 -> 客户端
export type ServerEvent =
  | { type: 'player_joined'; player: SessionPlayer }
  | { type: 'player_left'; userId: string }
  | { type: 'character_selected'; userId: string; characterId: string }
  | { type: 'game_started' }
  | { type: 'round_update'; round: RoundUpdate }
  | { type: 'clue_received'; clue: ClueCard }
  | { type: 'chat_message'; userId: string; content: string; timestamp: Date }
  | { type: 'vote_initiated'; question: string; options: VoteOption[] }
  | { type: 'vote_result'; result: VoteResult }
  | { type: 'branch_outcome'; narrative: string }
  | { type: 'dm_speech'; text: string; audioUrl?: string }
  | { type: 'game_ended'; ending: Ending; evaluations: PlayerEvaluation[] }
  | { type: 'video_play'; videoUrl: string }
  | { type: 'error'; message: string };
