// @murder-mystery/shared - Shared types and utilities

// Config types
export {
  GameType,
  AgeGroup,
  type RoundPhase,
  type RoundStructure,
  type ScriptConfig,
  type CreateConfigInput,
  type ValidationResult,
  type ValidationError,
} from './types/config.js';

// Script types
export {
  type CharacterSummary,
  type TimelineEvent,
  type ClueDistributionEntry,
  type RoundGuide,
  type BranchDecisionPoint,
  type ScoringCriterion,
  type JudgingRules,
  type EndingDescription,
  type DMHandbook,
  type CharacterRelationship,
  type RoundAction,
  type PlayerHandbook,
  MaterialType,
  type Material,
  type ClueCard,
  type VoteOption,
  type BranchNode,
  type BranchEdge,
  type TriggerCondition,
  type PlayerEnding,
  type Ending,
  type BranchStructure,
  type VideoMarker,
  type Script,
  type PlayerEvaluation,
  type RoundUpdate,
  type ClueDistribution,
  type VoteResult,
  type BranchOutcome,
  type LLMRequest,
  type LLMResponse,
  type LeaderboardEntry,
  SkillCategory,
  type SkillTemplate,
} from './types/script.js';

// Session types
export {
  SessionStatus,
  type SessionPlayer,
  type VoteRecord,
  type GameSession,
} from './types/session.js';

// Feedback types
export {
  type Feedback,
  type LiveSuggestion,
  type AggregatedFeedback,
} from './types/feedback.js';

// Account types
export {
  type PlayerAccount,
  type Achievement,
  type CollectionItem,
  type GameHistoryEntry,
} from './types/account.js';

// Tag types
export {
  TagCategory,
  type Tag,
  type ScriptTag,
} from './types/tag.js';

// Asset types
export {
  AssetType,
  type Asset,
} from './types/asset.js';

// Plugin types
export {
  PluginType,
  type IPlugin,
  type PluginConfig,
  type IStoragePlugin,
  type ITTSPlugin,
  TTSNodeType,
} from './types/plugin.js';

// WebSocket types
export {
  type ClientEvent,
  type ServerEvent,
} from './types/websocket.js';
