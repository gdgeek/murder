# AI工具链组件

本文档包含AI工具链子系统的组件接口定义：PromptTemplateService、FewShotExampleService、ReasoningChainService、TokenTrackingService、ABTestService、PlayerRatingWeightService。

---

## 25. 提示词模板管理服务 (PromptTemplateService)

可版本化管理的LLM提示词模板系统，支持变量插值、版本控制和A/B测试。

```typescript
// 提示词模板类别
enum PromptCategory {
  SCRIPT_GENERATION = 'script_generation',       // 剧本生成主模板
  CHARACTER_GENERATION = 'character_generation',  // 角色生成模板
  CLUE_GENERATION = 'clue_generation',           // 线索生成模板
  BRANCH_GENERATION = 'branch_generation',       // 分支结构生成模板
  INTERVIEW_QUESTION = 'interview_question',     // 访谈问题生成模板
  KNOWLEDGE_EXTRACTION = 'knowledge_extraction', // 知识提炼模板
  FEEDBACK_ANALYSIS = 'feedback_analysis'        // 反馈分析模板
}

// 提示词模板
interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  currentVersion: number;
  activeVersionId: string;
  variables: PromptVariable[];     // 模板变量定义
  createdAt: Date;
  updatedAt: Date;
}

// 模板变量定义
interface PromptVariable {
  name: string;                    // 变量名，如 "playerCount"
  required: boolean;
  defaultValue: string | null;
  description: string;
}

// 提示词版本
interface PromptVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;                 // 模板内容，含 {{variable}} 占位符
  changelog: string;
  createdAt: Date;
}

// 渲染结果
interface PromptRenderResult {
  renderedContent: string;
  usedVariables: Record<string, string>;
  missingRequired: string[];
}

interface IPromptTemplateService {
  // CRUD
  create(input: CreatePromptTemplateInput): Promise<PromptTemplate>;
  getById(id: string): Promise<PromptTemplate | null>;
  getByCategory(category: PromptCategory): Promise<PromptTemplate[]>;
  
  // 版本管理
  updateContent(templateId: string, content: string, changelog: string): Promise<PromptVersion>;
  getVersionHistory(templateId: string): Promise<PromptVersion[]>;
  rollbackToVersion(templateId: string, versionId: string): Promise<PromptTemplate>;
  getActiveVersion(templateId: string): Promise<PromptVersion>;
  
  // 渲染
  render(templateId: string, variables: Record<string, string>): Promise<PromptRenderResult>;
  
  // 序列化
  serialize(template: PromptTemplate, versions: PromptVersion[]): string;
  deserialize(json: string): { template: PromptTemplate; versions: PromptVersion[] };
}
```

---

## 26. 少样本示例服务 (FewShotExampleService)

管理用于LLM提示词的输入-输出示例对。

```typescript
// 少样本示例
interface FewShotExample {
  id: string;
  category: PromptCategory;       // 与提示词模板类别对应
  gameTypes: GameType[];
  inputDescription: string;
  expectedOutput: string;
  qualityScore: number;            // 0.0-1.0
  status: 'active' | 'deprecated';
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IFewShotExampleService {
  create(input: CreateFewShotInput): Promise<FewShotExample>;
  getById(id: string): Promise<FewShotExample | null>;
  update(id: string, input: UpdateFewShotInput): Promise<FewShotExample>;
  deprecate(id: string): Promise<void>;
  
  // 选取匹配示例
  selectForGeneration(category: PromptCategory, gameType: GameType, topK?: number): Promise<FewShotExample[]>;
  
  // 质量评分更新（与知识条目有效性分数逻辑一致）
  updateQualityScore(id: string, delta: number, feedbackId?: string): Promise<void>;
  
  // 序列化
  serialize(example: FewShotExample): string;
  deserialize(json: string): FewShotExample;
}

const FEW_SHOT_CONFIG = {
  defaultTopK: 3,
  minQualityScore: 0.2
};
```

---

## 27. 推理链模式服务 (ReasoningChainService)

管理用于复杂剧本逻辑生成的链式思维推理模板。

```typescript
// 推理链模式
interface ReasoningChain {
  id: string;
  name: string;
  description: string;
  gameTypes: GameType[];
  steps: ReasoningStep[];
  applicableScenarios: string[];   // 适用场景：branch_structure, multi_ending, clue_chain, etc.
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 推理步骤
interface ReasoningStep {
  stepIndex: number;
  description: string;
  expectedOutputFormat: string;
}

interface IReasoningChainService {
  create(input: CreateReasoningChainInput): Promise<ReasoningChain>;
  getById(id: string): Promise<ReasoningChain | null>;
  update(id: string, input: UpdateReasoningChainInput): Promise<ReasoningChain>;
  
  // 检索匹配的推理链
  selectForScenario(scenario: string, gameType: GameType): Promise<ReasoningChain[]>;
  
  // 序列化
  serialize(chain: ReasoningChain): string;
  deserialize(json: string): ReasoningChain;
}
```

---

## 28. Token用量追踪服务 (TokenTrackingService)

追踪所有LLM调用的token消耗和成本。

> **Token 节省约束**：TokenTrackingService 除追踪外，还承担预算管控职责。每次 LLM 调用后检查是否超出预算，超出时记录警告。详见 [Token 节省策略](token-optimization.md) 第六节。

```typescript
// 调用类型
enum LLMCallType {
  GENERATION = 'generation',           // 剧本生成
  INTERVIEW = 'interview',             // 访谈
  KNOWLEDGE_EXTRACTION = 'knowledge_extraction', // 知识提炼
  FEEDBACK_ANALYSIS = 'feedback_analysis',       // 反馈分析
  OPTIMIZATION = 'optimization',       // 剧本优化
  DM_RESPONSE = 'dm_response'          // AI DM回答
}

// Token用量记录
interface TokenUsageRecord {
  id: string;
  callType: LLMCallType;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTimeMs: number;
  scriptId: string | null;
  interviewSessionId: string | null;
  createdAt: Date;
}

// Token用量统计
interface TokenUsageStats {
  totalTokens: number;
  byCallType: Record<LLMCallType, number>;
  byTimePeriod: { period: string; tokens: number }[];
  avgTokensPerGeneration: number;
}

interface ITokenTrackingService {
  record(input: CreateTokenUsageInput): Promise<TokenUsageRecord>;
  getStats(startDate: Date, endDate: Date): Promise<TokenUsageStats>;
  getDailyUsage(date: Date): Promise<number>;
  checkThresholdAlert(dailyUsage: number): boolean;
}

const TOKEN_CONFIG = {
  defaultDailyThreshold: 1000000,      // 默认每日token预警阈值
  contextWindowBudgetRatio: 0.8        // 上下文窗口使用上限比例
};
```

---

## 29. A/B测试服务 (ABTestService)

对不同LLM模型或提示词版本进行对比实验。

```typescript
// A/B测试
interface ABTest {
  id: string;
  name: string;
  description: string;
  variantA: ABTestVariant;
  variantB: ABTestVariant;
  trafficRatio: { a: number; b: number }; // 百分比，和为100
  status: 'running' | 'completed' | 'cancelled';
  winnerId: 'a' | 'b' | null;
  startedAt: Date;
  endedAt: Date | null;
}

// A/B测试变体
interface ABTestVariant {
  id: string;
  modelName: string | null;            // 可选：指定不同模型
  promptTemplateVersionId: string | null; // 可选：指定不同提示词版本
  sampleCount: number;
  feedbackIds: string[];
  avgCompositeScore: number | null;
}

// A/B测试结果
interface ABTestResult {
  testId: string;
  variantA: { samples: number; avgScore: number | null; dimensionScores: Record<string, number> };
  variantB: { samples: number; avgScore: number | null; dimensionScores: Record<string, number> };
  isSignificant: boolean;
  insufficientSamples: boolean;        // 任一变体 < 5 个反馈
  recommendation: string;
}

interface IABTestService {
  create(input: CreateABTestInput): Promise<ABTest>;
  getById(id: string): Promise<ABTest | null>;
  listActive(): Promise<ABTest[]>;
  
  // 流量分配
  assignVariant(testId: string): 'a' | 'b';
  
  // 反馈关联
  linkFeedback(testId: string, variant: 'a' | 'b', feedbackId: string): Promise<void>;
  
  // 结果分析
  getResult(testId: string): Promise<ABTestResult>;
  
  // 结束测试
  complete(testId: string, winner: 'a' | 'b'): Promise<void>;
  cancel(testId: string): Promise<void>;
}

const AB_TEST_CONFIG = {
  minSamplesForSignificance: 5,
  defaultTrafficRatio: { a: 50, b: 50 }
};
```

---

## 30. 玩家评价权重服务 (PlayerRatingWeightService)

基于玩家游玩记录计算评价权重，使资深玩家的评价在反馈计算和排行榜中占更大权重。

```typescript
// 玩家评价权重等级
interface PlayerWeightTier {
  minGames: number;
  weight: number;
}

const PLAYER_WEIGHT_TIERS: PlayerWeightTier[] = [
  { minGames: 25, weight: 1.5 },
  { minGames: 10, weight: 1.2 },
  { minGames: 5,  weight: 1.0 },
  { minGames: 0,  weight: 0.7 }
];

// 加权评价
interface WeightedFeedback {
  feedback: Feedback;
  playerWeight: number;
  playerGamesPlayed: number;
}

interface IPlayerRatingWeightService {
  // 计算单个玩家的评价权重
  calculateWeight(gamesPlayed: number): number;
  
  // 计算加权平均评分
  calculateWeightedAverage(feedbacks: WeightedFeedback[], dimension: string): number;
  
  // 获取带权重的反馈列表
  getWeightedFeedbacks(scriptId: string): Promise<WeightedFeedback[]>;
}
```

**集成点**：
- `FeedbackService.getAggregatedFeedback()` 使用 `PlayerRatingWeightService` 计算加权平均
- `LeaderboardService.recalculate()` 使用加权平均评分排名
- `LearningPipeline.calculateCompositeScore()` 使用加权综合分数更新知识条目有效性
