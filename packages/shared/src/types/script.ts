import { type ScriptConfig, GameType } from './config.js';

// ---- DM手册相关 ----

export interface CharacterSummary {
  characterId: string;
  name: string;
  description: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  involvedCharacters: string[];
  isPublic: boolean;
}

export interface ClueDistributionEntry {
  clueId: string;
  roundIndex: number;
  targetCharacterId: string;
  condition: string;
  timing: string;
}

export interface RoundGuide {
  roundIndex: number;
  description: string;
  phases: string[];
}

export interface BranchDecisionPoint {
  roundIndex: number;
  voteQuestion: string;
  options: { text: string; consequence: string }[];
}

export interface ScoringCriterion {
  name: string;
  description: string;
  maxScore: number;
}

export interface JudgingRules {
  winConditions: string[];
  scoringCriteria: ScoringCriterion[];
}

export interface EndingDescription {
  endingId: string;
  name: string;
  narrative: string;
}

export interface DMHandbook {
  overview: string;
  characters: CharacterSummary[];
  timeline: TimelineEvent[];
  clueDistribution: ClueDistributionEntry[];
  roundGuides: RoundGuide[];
  branchDecisionPoints: BranchDecisionPoint[];
  endings: EndingDescription[];
  truthReveal: string;
  judgingRules: JudgingRules;
}

// ---- 玩家手册相关 ----

export interface CharacterRelationship {
  targetCharacterId: string;
  targetName: string;
  relationship: string;
  knownFacts: string[];
}

export interface RoundAction {
  roundIndex: number;
  readingGuide: string;
  investigationGuide: string;
  discussionGuide: string;
}

export interface PlayerHandbook {
  characterId: string;
  characterName: string;
  backgroundStory: string;
  primaryGoal: string;
  secondaryGoals: string[];
  relationships: CharacterRelationship[];
  knownClues: string[];
  roundActions: RoundAction[];
  secrets: string[];           // 仅该角色可见
}

// ---- 游戏物料 ----

export enum MaterialType {
  CLUE_CARD = 'clue_card',
  PROP_CARD = 'prop_card',
  VOTE_CARD = 'vote_card',
  SCENE_CARD = 'scene_card',
}

export interface Material {
  id: string;
  type: MaterialType;
  content: string;
  associatedCharacterId?: string;
  metadata: Record<string, unknown>;
}

export interface ClueCard extends Material {
  type: MaterialType.CLUE_CARD;
  clueId: string;              // 与DM手册线索分发表对应
  associatedCharacterId: string;
}

// ---- 分支结构 ----

export interface VoteOption {
  id: string;
  text: string;
  nextNodeId: string | null;   // null表示进入结局
  endingId: string | null;
}

export interface BranchNode {
  id: string;
  roundIndex: number;
  description: string;
  voteQuestion: string;
  options: VoteOption[];
}

export interface BranchEdge {
  fromNodeId: string;
  toNodeId: string;
  optionId: string;
}

export interface TriggerCondition {
  type: string;
  value: string;
}

export interface PlayerEnding {
  characterId: string;
  narrative: string;
  outcome: string;
}

export interface Ending {
  id: string;
  name: string;
  triggerConditions: TriggerCondition[];
  narrative: string;
  playerEndings: PlayerEnding[];
}

export interface BranchStructure {
  nodes: BranchNode[];
  edges: BranchEdge[];
  endings: Ending[];
}

// ---- 视频标记 ----

export interface VideoMarker {
  nodeId: string;
  description: string;
  scriptText: string;
}

// ---- 剧本主体 ----

export interface Script {
  id: string;
  version: string;            // 版本号 如 "v1.0"
  configId: string;
  config: ScriptConfig;
  dmHandbook: DMHandbook;
  playerHandbooks: PlayerHandbook[];
  materials: Material[];
  branchStructure: BranchStructure;
  videoMarkers: VideoMarker[];  // 可生成视频的关键节点
  createdAt: Date;
  updatedAt: Date;
}

// ---- AI DM 相关类型 ----

export interface PlayerEvaluation {
  userId: string;
  deductionScore: number;      // 推理表现评分 1-10
  roleplayScore: number;       // 角色扮演评分 1-10
  keyDecisions: string[];      // 关键决策回顾
  summary: string;
}

export interface RoundUpdate {
  roundIndex: number;
  phase: string;
  narrative: string;
  distributedClues: ClueDistribution[];
}

export interface ClueDistribution {
  clueId: string;
  targetUserId: string;
}

export interface VoteResult {
  nodeId: string;
  optionId: string;
  votes: Record<string, string>; // userId -> optionId
}

export interface BranchOutcome {
  selectedOptionId: string;
  narrative: string;
  nextNodeId: string | null;
  endingId: string | null;
}

// ---- LLM 相关类型 ----

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  responseTimeMs: number;
}

// ---- 排行榜 ----

export interface LeaderboardEntry {
  scriptId: string;
  scriptName: string;
  gameType: GameType;
  playerCount: number;
  avgScore: number;
  totalPlays: number;
  status: 'ranked' | 'pending'; // pending = 游玩次数<3
}

// ---- Skill模板 ----

export enum SkillCategory {
  CHARACTER_DESIGN = 'character_design',     // 角色设计
  CLUE_DESIGN = 'clue_design',              // 线索设计
  TIMELINE = 'timeline',                     // 时间线构建
  MOTIVE = 'motive',                         // 动机设计
  TRICK = 'trick',                           // 诡计设计
  RESTORATION = 'restoration',               // 还原逻辑
  DEDUCTION_CHAIN = 'deduction_chain',       // 推理链条
}

export interface SkillTemplate {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  gameTypes: GameType[];       // 适用的游戏类型
  priority: number;            // 优先级（类型匹配时使用）
  content: string;             // 模板内容（Prompt片段）
}
