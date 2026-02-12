# 核心组件与接口

本文档包含系统核心组件的接口定义，涵盖配置服务、Skill库、生成引擎、游戏会话、AI DM、LLM适配器、反馈服务、账户服务、成就/收藏服务、排行榜服务、WebSocket事件协议和基础REST API端点。

---

## 1. 配置服务 (ConfigService)

负责剧本生成参数的校验、轮次结构自动适配和配置对象管理。

```typescript
// 游戏类型枚举
enum GameType {
  HONKAKU = 'honkaku',       // 本格
  SHIN_HONKAKU = 'shin_honkaku', // 新本格
  HENKAKU = 'henkaku'        // 变格
}

// 目标年龄段枚举
enum AgeGroup {
  ELEMENTARY = 'elementary',   // 小学生
  MIDDLE_SCHOOL = 'middle_school', // 中学生
  COLLEGE = 'college',         // 大学生
  ADULT = 'adult'              // 成年人
}

// 轮次阶段
interface RoundPhase {
  reading: number;    // 阅读时间（分钟）
  investigation: number; // 搜证时间（分钟）
  discussion: number;    // 推证/讨论时间（分钟）
}

// 轮次结构
interface RoundStructure {
  totalRounds: number;
  phases: RoundPhase[];
  finalVoteMinutes: number;
  revealMinutes: number;
}

// 配置参数
interface ScriptConfig {
  id: string;
  playerCount: number;        // 1-6
  durationHours: number;      // 2-6
  gameType: GameType;
  ageGroup: AgeGroup;
  restorationRatio: number;   // 还原比例 0-100
  deductionRatio: number;     // 推理比例 0-100, 与还原比例之和=100
  era: string;                // 时代背景
  location: string;           // 地点设定
  theme: string;              // 主题风格
  language: string;           // 生成语言
  roundStructure: RoundStructure; // 自动计算
}

// 配置服务接口
interface IConfigService {
  validate(input: CreateConfigInput): ValidationResult;
  create(input: CreateConfigInput): Promise<ScriptConfig>;
  calculateRoundStructure(durationHours: number): RoundStructure;
  getById(id: string): Promise<ScriptConfig | null>;
}

// 校验结果
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  constraint: string;
}
```

**轮次自动适配规则**：
| 时长 | 轮次 | 每轮时间 | 总结时间 |
|------|------|----------|----------|
| 2小时 | 2轮 | ~50分钟 | 20分钟 |
| 3小时 | 3轮 | ~50分钟 | 30分钟 |
| 4小时 | 3-4轮 | ~50分钟 | 30分钟 |
| 5小时 | 4轮 | ~55分钟 | 40分钟 |
| 6小时 | 4-5轮 | ~55分钟 | 40分钟 |

---

## 2. Skill库服务 (SkillService)

管理预定义的剧本杀Skill模板，按游戏类型提供对应模板。

```typescript
// Skill类别
enum SkillCategory {
  CHARACTER_DESIGN = 'character_design',     // 角色设计
  CLUE_DESIGN = 'clue_design',              // 线索设计
  TIMELINE = 'timeline',                     // 时间线构建
  MOTIVE = 'motive',                         // 动机设计
  TRICK = 'trick',                           // 诡计设计
  RESTORATION = 'restoration',               // 还原逻辑
  DEDUCTION_CHAIN = 'deduction_chain'        // 推理链条
}

// Skill模板
interface SkillTemplate {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  gameTypes: GameType[];       // 适用的游戏类型
  priority: number;            // 优先级（类型匹配时使用）
  content: string;             // 模板内容（Prompt片段）
}

interface ISkillService {
  getByCategory(category: SkillCategory): Promise<SkillTemplate[]>;
  getByGameType(gameType: GameType): Promise<SkillTemplate[]>;
  getForGeneration(gameType: GameType, categories: SkillCategory[]): Promise<SkillTemplate[]>;
  serialize(template: SkillTemplate): string;   // JSON序列化
  deserialize(json: string): SkillTemplate;     // JSON反序列化
}
```

---

## 8. 生成引擎服务 (GeneratorService)

核心AI生成模块，调用LLM结合知识库生成完整剧本。

> **Token 节省约束**：生成引擎必须遵循 [Token 节省策略](token-optimization.md) 中的分阶段生成 Pipeline、上下文窗口预算管理、RAG 检索优化等设计。禁止一次性将所有上下文传入 LLM，必须按阶段拆分，每阶段只传入最小必需上下文。

```typescript
// 剧本结构
interface Script {
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

// 分支结构
interface BranchStructure {
  nodes: BranchNode[];
  edges: BranchEdge[];
  endings: Ending[];
}

interface BranchNode {
  id: string;
  roundIndex: number;
  description: string;
  voteQuestion: string;
  options: VoteOption[];
}

interface VoteOption {
  id: string;
  text: string;
  nextNodeId: string | null;   // null表示进入结局
  endingId: string | null;
}

interface Ending {
  id: string;
  name: string;
  triggerConditions: TriggerCondition[];
  narrative: string;
  playerEndings: PlayerEnding[];
}

interface PlayerEnding {
  characterId: string;
  narrative: string;
  outcome: string;
}

// 生成引擎接口
interface IGeneratorService {
  generate(config: ScriptConfig, tokenMode?: TokenOptimizationMode): Promise<Script>;
  optimizeWithFeedback(scriptId: string, feedback: AggregatedFeedback): Promise<Script>;
  getScript(id: string): Promise<Script | null>;
  getScriptVersions(id: string): Promise<Script[]>;
  listScripts(filters?: ScriptFilters): Promise<Script[]>;
  serializeScript(script: Script): string;
  deserializeScript(json: string): Script;
  getUsedKnowledge(scriptId: string): Promise<FeedbackKnowledgeLink | null>;
  estimateCost(config: ScriptConfig, tokenMode: TokenOptimizationMode): Promise<GenerationCostEstimate>;
}
```

---

## 9. DM手册 (DMHandbook)

```typescript
interface DMHandbook {
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

interface TimelineEvent {
  time: string;
  event: string;
  involvedCharacters: string[];
  isPublic: boolean;
}

interface ClueDistributionEntry {
  clueId: string;
  roundIndex: number;
  targetCharacterId: string;
  condition: string;
  timing: string;
}

interface BranchDecisionPoint {
  roundIndex: number;
  voteQuestion: string;
  options: { text: string; consequence: string }[];
}

interface JudgingRules {
  winConditions: string[];
  scoringCriteria: ScoringCriterion[];
}
```

---

## 10. 玩家手册 (PlayerHandbook)

```typescript
interface PlayerHandbook {
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

interface CharacterRelationship {
  targetCharacterId: string;
  targetName: string;
  relationship: string;
  knownFacts: string[];
}

interface RoundAction {
  roundIndex: number;
  readingGuide: string;
  investigationGuide: string;
  discussionGuide: string;
}
```

---

## 11. 游戏物料 (Material)

```typescript
enum MaterialType {
  CLUE_CARD = 'clue_card',
  PROP_CARD = 'prop_card',
  VOTE_CARD = 'vote_card',
  SCENE_CARD = 'scene_card'
}

interface Material {
  id: string;
  type: MaterialType;
  content: string;
  associatedCharacterId?: string;
  metadata: Record<string, unknown>;
}

interface ClueCard extends Material {
  type: MaterialType.CLUE_CARD;
  clueId: string;              // 与DM手册线索分发表对应
  associatedCharacterId: string;
}
```

---

## 12. 游戏会话服务 (SessionService)

```typescript
enum SessionStatus {
  WAITING = 'waiting',         // 等待玩家加入
  SELECTING = 'selecting',     // 选角阶段
  PLAYING = 'playing',         // 游戏进行中
  VOTING = 'voting',           // 投票中
  ENDED = 'ended'              // 已结束
}

interface GameSession {
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

interface SessionPlayer {
  userId: string;
  characterId: string | null;
  isReady: boolean;
  joinedAt: Date;
}

interface ISessionService {
  create(scriptId: string, creatorUserId: string): Promise<GameSession>;
  join(sessionId: string, userId: string): Promise<GameSession>;
  selectCharacter(sessionId: string, userId: string, characterId: string): Promise<void>;
  startGame(sessionId: string): Promise<void>;
  getSession(id: string): Promise<GameSession | null>;
  generateQRCode(sessionId: string): Promise<string>;
}
```

---

## 13. AI DM服务 (AIDMService)

> **Token 节省约束**：AI DM 必须遵循 [Token 节省策略](token-optimization.md) 中的预生成+实时混合模式、滑动上下文窗口、规则引擎零 token 回复、批量评价生成等设计。预生成内容占比目标 ≥ 70%，单次回复限制 max_tokens=300，规则引擎优先匹配常见问题。

```typescript
interface IAIDMService {
  initialize(session: GameSession, handbook: DMHandbook, tokenMode?: TokenOptimizationMode): Promise<void>;
  advanceRound(sessionId: string): Promise<RoundUpdate>;
  distributeClues(sessionId: string, roundIndex: number): Promise<ClueDistribution[]>;
  initiateVote(sessionId: string, branchPoint: BranchDecisionPoint): Promise<void>;
  processVoteResult(sessionId: string, voteResult: VoteResult): Promise<BranchOutcome>;
  answerQuestion(sessionId: string, question: string, askerId: string): Promise<string>;
  generatePlayerEvaluation(sessionId: string, userId: string): Promise<PlayerEvaluation>;
  speakText(text: string): Promise<AudioBuffer | null>; // TTS，失败返回null
}

interface PlayerEvaluation {
  userId: string;
  deductionScore: number;      // 推理表现评分 1-10
  roleplayScore: number;       // 角色扮演评分 1-10
  keyDecisions: string[];      // 关键决策回顾
  summary: string;
}

interface RoundUpdate {
  roundIndex: number;
  phase: string;
  narrative: string;
  distributedClues: ClueDistribution[];
}
```

---

## 14. LLM适配器 (LLMAdapter)

```typescript
interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

interface LLMResponse {
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  responseTimeMs: number;
}

interface ILLMAdapter {
  send(request: LLMRequest): Promise<LLMResponse>;
  getProviderName(): string;
}

// 重试配置
const LLM_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2
};
```

---

## 15. 反馈服务 (FeedbackService)

```typescript
interface Feedback {
  id: string;
  sessionId: string;
  scriptId: string;
  userId: string;
  plotScore: number;           // 剧情评分 1-10
  difficultyScore: number;     // 推理难度评分 1-10
  characterScore: number;      // 角色体验评分 1-10
  overallScore: number;        // 整体满意度 1-10
  comment: string;
  createdAt: Date;
}

interface LiveSuggestion {
  id: string;
  sessionId: string;
  scriptId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

interface AggregatedFeedback {
  scriptId: string;
  totalFeedbacks: number;
  avgPlotScore: number;
  avgDifficultyScore: number;
  avgCharacterScore: number;
  avgOverallScore: number;
  lowScoreDimensions: string[];  // 平均分<6的维度
  topSuggestions: string[];
}

interface IFeedbackService {
  submitFeedback(input: CreateFeedbackInput): Promise<Feedback>;
  submitLiveSuggestion(input: CreateSuggestionInput): Promise<LiveSuggestion>;
  getAggregatedFeedback(scriptId: string): Promise<AggregatedFeedback>;
  checkAutoOptimizeTrigger(scriptId: string): Promise<boolean>;
  triggerAutoOptimize(scriptId: string): Promise<Script>;
}
```

---

## 16. 账户服务 (AccountService)

```typescript
interface PlayerAccount {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatarUrl: string;
  // 玩家身份
  playerLevel: number;
  playerXp: number;
  totalGamesPlayed: number;
  totalScriptsPlayed: number;
  totalEndingsUnlocked: number;
  // 经济
  gameCoinBalance: number;
  realCurrencyBalance: number;
  createdAt: Date;
}

interface IAccountService {
  register(email: string, password: string, nickname: string): Promise<PlayerAccount>;
  login(email: string, password: string): Promise<{ token: string; account: PlayerAccount }>;
  getProfile(userId: string): Promise<PlayerAccount>;
  updateProfile(userId: string, updates: Partial<Pick<PlayerAccount, 'nickname' | 'avatarUrl'>>): Promise<void>;
  getGameHistory(userId: string): Promise<GameHistoryEntry[]>;
  getDualIdentityProfile(userId: string): Promise<DualIdentityProfile>;
}
```

---

## 17. 成就与收藏服务

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  requiredGames: number | null;  // 基于游玩次数的成就
  specialCondition: string | null; // 特殊条件成就
  iconUrl: string;
}

interface CollectionItem {
  id: string;
  userId: string;
  type: 'ending_card' | 'character_card';
  scriptId: string;
  itemName: string;
  unlockedAt: Date;
}

interface IAchievementService {
  checkAndUnlock(userId: string): Promise<Achievement[]>;
  getUnlocked(userId: string): Promise<Achievement[]>;
  getAllAchievements(): Promise<Achievement[]>;
}

interface ICollectionService {
  unlockItems(userId: string, sessionId: string): Promise<CollectionItem[]>;
  getCollection(userId: string): Promise<CollectionItem[]>;
  getScriptProgress(userId: string, scriptId: string): Promise<ScriptCollectionProgress>;
}
```

---

## 18. 排行榜服务 (LeaderboardService)

```typescript
interface LeaderboardEntry {
  scriptId: string;
  scriptName: string;
  gameType: GameType;
  playerCount: number;
  avgScore: number;
  totalPlays: number;
  status: 'ranked' | 'pending'; // pending = 游玩次数<3
}

interface ILeaderboardService {
  getRankings(limit: number, offset: number): Promise<LeaderboardEntry[]>;
  recalculate(scriptId: string): Promise<void>;
}
```

---

## 19. WebSocket事件协议

```typescript
// 客户端 -> 服务端
type ClientEvent =
  | { type: 'join_session'; sessionId: string; token: string }
  | { type: 'select_character'; characterId: string }
  | { type: 'ready' }
  | { type: 'chat_message'; content: string }
  | { type: 'vote'; optionId: string }
  | { type: 'ask_dm'; question: string }
  | { type: 'submit_suggestion'; content: string };

// 服务端 -> 客户端
type ServerEvent =
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
```

---

## 20. REST API端点

```
认证:
  POST   /api/auth/register          - 注册
  POST   /api/auth/login             - 登录

账户:
  GET    /api/account/profile        - 获取个人信息
  PUT    /api/account/profile        - 更新个人信息
  GET    /api/account/history        - 游戏历史
  GET    /api/account/achievements   - 成就列表
  GET    /api/account/collection     - 收藏列表

配置:
  POST   /api/configs                - 创建配置
  GET    /api/configs/:id            - 获取配置

剧本:
  POST   /api/scripts/generate       - 生成剧本
  GET    /api/scripts                - 剧本列表
  GET    /api/scripts/:id            - 获取剧本详情
  GET    /api/scripts/:id/versions   - 获取版本历史
  POST   /api/scripts/:id/optimize   - 手动触发优化

游戏会话:
  POST   /api/sessions               - 创建会话
  GET    /api/sessions/:id           - 获取会话信息
  GET    /api/sessions/:id/qrcode    - 获取二维码

反馈:
  POST   /api/feedback               - 提交评价
  GET    /api/feedback/script/:id    - 获取剧本评价汇总

排行榜:
  GET    /api/leaderboard            - 获取排行榜

知识库:
  GET    /api/knowledge              - 知识条目列表（支持分页、筛选、排序）
  POST   /api/knowledge              - 创建知识条目
  GET    /api/knowledge/:id          - 获取知识条目详情
  PUT    /api/knowledge/:id          - 更新知识条目
  DELETE /api/knowledge/:id          - 弃用知识条目
  GET    /api/knowledge/:id/history  - 获取权重更新历史
  POST   /api/knowledge/search       - 语义搜索（输入文本返回相似条目）
  POST   /api/knowledge/import/article   - 从文章提取知识
  POST   /api/knowledge/import/script    - 从剧本分析提取知识
  POST   /api/knowledge/import/confirm   - 确认导入候选知识
  GET    /api/knowledge/stats        - 知识库统计数据
  POST   /api/knowledge/snapshots    - 创建快照
  GET    /api/knowledge/snapshots    - 快照列表
  POST   /api/knowledge/snapshots/:id/rollback - 回滚到快照
  GET    /api/knowledge/export       - 导出知识库JSON
  POST   /api/knowledge/import       - 导入知识库JSON

国际化:
  GET    /api/i18n/:locale           - 获取语言包
```
