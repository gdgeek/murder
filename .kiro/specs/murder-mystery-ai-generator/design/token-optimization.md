# LLM Token 节省策略

> 本文档定义系统中所有 LLM 调用场景的 token 节省设计约束和实现策略。Token 消耗直接关联真实货币成本（双币经济系统），因此 token 节省是核心设计优先级。

---

## 全局原则

1. **能不调 LLM 就不调**：凡是可以通过模板、缓存、规则引擎解决的，不调用 LLM
2. **能少传就少传**：提示词中只包含当前任务必需的上下文，杜绝冗余信息
3. **能缓存就缓存**：相同或相似输入的 LLM 输出必须缓存复用
4. **能拆就拆**：大任务拆成小任务，每次调用只做一件事，避免单次调用传入过多上下文
5. **能压缩就压缩**：结构化数据用紧凑格式（JSON/YAML），叙述性内容用摘要替代全文

---

## 零、Token 节省模式开关

所有 token 节省策略通过一个全局开关控制，可在运行时动态切换。关闭开关后，系统回退到"无限制模式"，不应用任何 token 节省约束，以获得最大质量输出。

### 0.1 模式定义

```typescript
enum TokenOptimizationMode {
  OPTIMIZED = 'optimized',     // 节省模式：应用所有 token 节省策略
  UNLIMITED = 'unlimited'      // 无限制模式：不限制 token，追求最大质量
}

interface TokenOptimizationConfig {
  // 全局开关
  mode: TokenOptimizationMode;

  // 细粒度开关（仅在 OPTIMIZED 模式下生效）
  features: {
    pipelineSplit: boolean;          // 分阶段生成 Pipeline
    contextBudget: boolean;          // 上下文窗口预算管理
    ragOptimization: boolean;        // RAG 检索优化（top-K 缩减、摘要注入）
    promptCompression: boolean;      // 提示词压缩
    generationCache: boolean;        // 生成结果缓存
    dmPregeneration: boolean;        // DM 预生成内容
    dmSlidingWindow: boolean;        // DM 滑动上下文窗口
    dmResponseLimit: boolean;        // DM 回复 token 限制
    dmRuleEngine: boolean;           // DM 规则引擎零 token 回复
    batchEvaluation: boolean;        // 玩家评价批量生成
    modelTiering: boolean;           // 模型分级（小模型处理简单任务）
    interviewOptimization: boolean;  // 访谈问题数量控制和预设问题
  };
}

// 节省模式默认配置
const OPTIMIZED_CONFIG: TokenOptimizationConfig = {
  mode: TokenOptimizationMode.OPTIMIZED,
  features: {
    pipelineSplit: true,
    contextBudget: true,
    ragOptimization: true,
    promptCompression: true,
    generationCache: true,
    dmPregeneration: true,
    dmSlidingWindow: true,
    dmResponseLimit: true,
    dmRuleEngine: true,
    batchEvaluation: true,
    modelTiering: true,
    interviewOptimization: true
  }
};

// 无限制模式配置
const UNLIMITED_CONFIG: TokenOptimizationConfig = {
  mode: TokenOptimizationMode.UNLIMITED,
  features: {
    pipelineSplit: false,       // 单次调用生成完整剧本
    contextBudget: false,       // 不限制上下文窗口使用比例
    ragOptimization: false,     // RAG 使用完整内容，top-K=20
    promptCompression: false,   // 不压缩提示词
    generationCache: false,     // 不使用缓存，每次全新生成
    dmPregeneration: false,     // DM 全部实时生成
    dmSlidingWindow: false,     // DM 传入完整游戏历史
    dmResponseLimit: false,     // DM 回复不限长度
    dmRuleEngine: false,        // 所有问题都经过 LLM
    batchEvaluation: false,     // 逐个玩家独立生成评价
    modelTiering: false,        // 所有任务使用大模型
    interviewOptimization: false // 访谈不限问题数，全部动态生成
  }
};
```

### 0.2 无限制模式行为差异

| 功能 | 节省模式 | 无限制模式 |
|------|----------|------------|
| 剧本生成 | 8 阶段 Pipeline，阶段间传摘要 | 单次或少次调用，传入完整上下文 |
| RAG 知识注入 | top-10，摘要注入，分数 < 0.3 跳过 | top-20，完整内容注入，不跳过 |
| 少样本示例 | 精简格式，最多 3 个 | 完整格式，最多 5 个 |
| DM 主持 | 70% 预生成 + 滑动窗口 + 规则引擎 | 100% 实时 LLM 生成，完整历史上下文 |
| DM 回复长度 | max_tokens = 300 | max_tokens = 1000 |
| 玩家评价 | 批量 1 次调用 | 逐个独立调用，更个性化 |
| 模型选择 | 按任务分级（大/中/小） | 全部使用大模型 |
| 访谈 | 最多 6 题，前 2 题预设 | 最多 10 题，全部动态生成 |

### 0.3 开关控制方式

- 环境变量：`TOKEN_OPTIMIZATION_MODE=optimized|unlimited`
- 管理员后台：运行时动态切换，无需重启
- 单次生成覆盖：设计师在创建剧本时可选择"高质量模式"（即无限制模式），此时从设计师的 Real_Currency_Balance 中按无限制模式的预估成本扣费
- 细粒度开关：管理员可单独开关某个策略（如只关闭 DM 规则引擎，其他保持节省模式）

### 0.4 成本预估对比

系统在设计师选择模式时，展示两种模式的预估 token 消耗和费用：

```typescript
interface GenerationCostEstimate {
  mode: TokenOptimizationMode;
  estimatedTokens: number;
  estimatedCost: number;           // 真实货币
  breakdown: {
    generation: number;            // 剧本生成 token
    dmPregeneration: number;       // DM 预生成 token（仅节省模式）
    interview: number;             // 访谈 token
  };
}

interface IGenerationCostService {
  estimate(config: ScriptConfig, mode: TokenOptimizationMode): Promise<GenerationCostEstimate>;
  compareEstimates(config: ScriptConfig): Promise<{
    optimized: GenerationCostEstimate;
    unlimited: GenerationCostEstimate;
    savingsPercent: number;
  }>;
}
```

---

## 零.五、节省模式 vs 无限制模式 A/B 质量对比

### 目标

量化 token 节省策略对剧本质量和游戏体验的实际影响，用数据驱动决策：哪些策略值得保留，哪些策略牺牲了过多质量。

### 对比方案设计

利用现有 ABTestService 框架，创建专门的"Token 模式 A/B 测试"：

```typescript
// Token 模式 A/B 测试（扩展 ABTest）
interface TokenModeABTest extends ABTest {
  // 变体 A = 节省模式，变体 B = 无限制模式
  variantA: ABTestVariant & { tokenMode: 'optimized' };
  variantB: ABTestVariant & { tokenMode: 'unlimited' };
  
  // 额外追踪指标
  tokenMetrics: {
    variantA: TokenModeMetrics;
    variantB: TokenModeMetrics;
  };
}

interface TokenModeMetrics {
  avgTokensPerGeneration: number;    // 平均每次生成 token 消耗
  avgTokensPerGameSession: number;   // 平均每场游戏 DM token 消耗
  avgCostPerGeneration: number;      // 平均每次生成费用
  avgCostPerGameSession: number;     // 平均每场游戏费用
}
```

### 对比维度

| 维度 | 数据来源 | 对比指标 |
|------|----------|----------|
| 剧本质量 | 玩家反馈 Feedback | 剧情评分、推理难度评分、角色体验评分、整体满意度 |
| DM 体验 | 新增 DM 体验评分 | DM 回复相关性、DM 回复自然度、DM 主持流畅度 |
| Token 消耗 | TokenUsageRecord | 生成总 token、DM 运行时 token、总费用 |
| 性价比 | 计算指标 | 质量分数 / token 消耗 = 每 token 质量产出 |

### 对比流程

```
1. 管理员创建 Token 模式 A/B 测试
   → 设置流量分配（如 50/50）
   → 设置最小样本数（如 20 个剧本 + 50 场游戏）

2. 系统自动分流
   → 剧本生成请求随机分配到节省模式或无限制模式
   → 记录每次生成使用的模式和 token 消耗

3. 玩家游玩并提交反馈
   → 反馈自动关联到对应的 A/B 变体
   → 额外收集 DM 体验评分（3 个维度，1-10 分）

4. 管理员查看对比报告
   → 各维度评分对比（含统计显著性）
   → Token 消耗对比
   → 性价比分析（质量/成本比）
   → 细粒度分析：哪些策略影响最大

5. 决策
   → 若质量差距 < 5%，保持节省模式
   → 若某维度差距 > 15%，考虑放宽该维度的节省策略
   → 可针对单个策略做进一步 A/B 测试
```

### DM 体验评分扩展

在游戏结束反馈表单中新增 DM 体验维度：

```typescript
interface DMExperienceFeedback {
  dmRelevanceScore: number;      // DM 回复相关性 1-10
  dmNaturalnessScore: number;    // DM 回复自然度 1-10（是否像真人主持）
  dmFlowScore: number;           // DM 主持流畅度 1-10（节奏是否合适）
}
```

### 细粒度策略对比

除了整体模式对比，还支持对单个策略做独立 A/B 测试：

```typescript
// 示例：仅对比"DM 规则引擎"开关的影响
const singleFeatureTest: ABTest = {
  name: 'DM 规则引擎 A/B 测试',
  variantA: { /* 开启规则引擎 */ },
  variantB: { /* 关闭规则引擎，所有问题走 LLM */ },
  // 其他策略保持一致
};
```

这样可以精确定位哪个策略对质量影响最大，做到"该省的省，不该省的不省"。

---

## 一、剧本生成（GeneratorService）Token 节省策略

### 1.1 分阶段生成（Pipeline 拆分）

将一次性生成完整剧本拆分为多个独立阶段，每阶段只传入该阶段所需的最小上下文：

```
阶段1: 世界观骨架 → 输入: Config + 访谈摘要(压缩版)
                    输出: 世界观JSON骨架(时代/地点/氛围/核心事件)

阶段2: 角色网络   → 输入: 世界观骨架 + 角色数量
                    输出: 角色档案JSON(名称/关系/动机/秘密)

阶段3: 核心事件链 → 输入: 世界观骨架 + 角色摘要(仅名称+动机)
                    输出: 时间线 + 案件真相 + 作案手法

阶段4: 分支结构   → 输入: 时间线摘要 + 角色名称列表
                    输出: 分支节点 + 投票选项 + 多结局触发条件

阶段5: 线索系统   → 输入: 时间线 + 角色摘要 + 分支结构摘要
                    输出: 线索卡列表 + 分发规则

阶段6: DM手册     → 输入: 以上各阶段输出的摘要(非全文)
                    输出: 轮次流程指引 + 判定规则

阶段7: 玩家手册   → 输入: 角色档案(仅当前角色) + 关系网(仅相关部分)
                    输出: 单个玩家手册 (每个角色独立调用)

阶段8: 物料生成   → 输入: 线索列表(仅ID+摘要)
                    输出: 线索卡/道具卡/场景卡内容
```

**关键约束**：
- 每个阶段的输入只包含前序阶段输出的**摘要/骨架**，而非全文
- 阶段间传递使用紧凑 JSON 格式，不传递叙述性长文本
- 玩家手册逐角色生成，每次调用只传入单个角色的相关信息

### 1.2 上下文窗口预算管理

```typescript
interface TokenBudget {
  maxContextTokens: number;       // 模型上下文窗口上限
  budgetRatio: number;            // 使用比例上限，默认 0.75
  allocation: {
    systemPrompt: number;         // 系统提示词预算 ~10%
    knowledgeContext: number;      // RAG知识条目预算 ~20%
    fewShotExamples: number;      // 少样本示例预算 ~15%
    taskContext: number;           // 任务上下文预算 ~25%
    reservedForOutput: number;    // 预留给输出 ~30%
  };
}

const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  maxContextTokens: 128000,
  budgetRatio: 0.75,
  allocation: {
    systemPrompt: 0.10,
    knowledgeContext: 0.20,
    fewShotExamples: 0.15,
    taskContext: 0.25,
    reservedForOutput: 0.30
  }
};
```

- Generator 在组装提示词前，先估算各部分 token 数
- 若知识条目超出预算，按有效性分数降序截断
- 若少样本示例超出预算，减少示例数量（从默认3个降到1个）
- 每次调用记录实际 token 消耗，用于动态调优预算分配

### 1.3 RAG 检索优化

- 检索结果按有效性分数排序后，只取 top-K 条目（默认 K=10，非 20）
- 知识条目注入提示词时，只使用**内容摘要**（前200字符），不注入完整内容
- 对于有效性分数 < 0.3 的条目直接跳过，不计入候选
- 相似度 < 0.6 的检索结果直接丢弃

### 1.4 提示词模板压缩

- 系统提示词使用精简版本，避免冗长的角色描述和重复指令
- 变量插值后的提示词进行空白字符压缩（多余换行、缩进）
- 少样本示例使用**精简格式**：只保留输入的关键参数和输出的结构骨架，不保留完整叙述

### 1.5 生成结果缓存

```typescript
interface GenerationCache {
  // 相同 Config 参数组合的世界观骨架可缓存复用
  getWorldSkeleton(configHash: string): Promise<WorldSkeleton | null>;
  setWorldSkeleton(configHash: string, skeleton: WorldSkeleton, ttl: number): Promise<void>;
  
  // 相同游戏类型的角色模板骨架可缓存
  getCharacterTemplates(gameType: GameType): Promise<CharacterTemplate[] | null>;
}
```

- 对 Config 参数做哈希，相同参数组合的中间产物（世界观骨架、角色模板）可从 Redis 缓存读取
- 缓存 TTL 默认 24 小时，避免所有剧本千篇一律

---

## 二、AI DM（AIDMService）Token 节省策略

### 2.1 预生成 + 实时生成混合模式

AI DM 的主持内容分为两类，采用不同策略：

| 内容类型 | 策略 | LLM 调用 |
|----------|------|----------|
| 固定叙述（开场白、轮次过渡、线索分发话术、结局揭示） | 剧本生成时预生成，存入 DM_Handbook | 无（运行时零 token） |
| 动态回应（玩家提问、讨论引导、即兴评价） | 运行时实时调用 LLM | 有，但严格控制上下文 |

**预生成内容占比目标：≥ 70%**，即一场游戏中 AI DM 的大部分主持内容在剧本生成阶段就已经写好，运行时直接读取。

### 2.2 DM 上下文窗口滑动策略

AI DM 实时回应时，不传入完整游戏历史，而是使用滑动窗口：

```typescript
interface DMContextWindow {
  // 固定部分（每次调用都传入）
  systemPrompt: string;              // 精简版 DM 角色定义 (~200 tokens)
  currentRoundGuide: string;         // 当前轮次的流程指引 (~300 tokens)
  characterSummaries: string;        // 角色名称+一句话描述 (~100 tokens)
  
  // 滑动部分（只保留最近 N 条）
  recentChatHistory: ChatMessage[];  // 最近 20 条聊天记录
  recentEvents: GameEvent[];         // 最近 5 个游戏事件
  
  // 按需部分（仅在相关时传入）
  relevantClues?: string;            // 仅当玩家提问涉及线索时传入相关线索
  voteContext?: string;              // 仅在投票阶段传入投票上下文
}

const DM_CONTEXT_CONFIG = {
  maxChatHistory: 20,                // 最多保留最近20条聊天
  maxGameEvents: 5,                  // 最多保留最近5个事件
  maxResponseTokens: 300,            // DM 单次回复最大 token 数
  systemPromptMaxTokens: 200         // 系统提示词上限
};
```

### 2.3 DM 回复 token 限制

- AI DM 的每次实时回复严格限制 `max_tokens = 300`
- 系统提示词中明确要求 DM 回复简洁、不重复已知信息
- 对于玩家的简单问题（如"现在是什么阶段"），使用规则引擎直接回复，不调用 LLM

### 2.4 DM 规则引擎（零 token 回复）

以下场景由规则引擎处理，完全不调用 LLM：

```typescript
interface DMRuleEngine {
  // 可直接回答的问题模式
  rules: DMRule[];
}

interface DMRule {
  pattern: RegExp | string[];        // 匹配模式
  handler: (session: GameSession, handbook: DMHandbook) => string;
}

// 示例规则
const DM_RULES: DMRule[] = [
  {
    pattern: ['现在是什么阶段', '当前阶段', 'what phase'],
    handler: (session) => `当前是第${session.currentRound}轮的${session.currentPhase}阶段。`
  },
  {
    pattern: ['还有多少时间', '剩余时间', 'time left'],
    handler: (session) => `本阶段剩余约${getRemainingMinutes(session)}分钟。`
  },
  {
    pattern: ['玩家列表', '谁在游戏', 'who is playing'],
    handler: (session) => formatPlayerList(session.players)
  },
  {
    pattern: ['投票结果', 'vote result'],
    handler: (session) => formatLastVoteResult(session.voteHistory)
  }
];
```

- 规则引擎优先匹配，匹配成功则直接返回，不调用 LLM
- 预计可覆盖 30-40% 的玩家常见提问

### 2.5 玩家评价批量生成

游戏结束时的玩家评价，不逐个调用 LLM，而是一次调用批量生成所有玩家的评价：

```typescript
// 批量生成：一次调用生成所有玩家评价
interface BatchEvaluationRequest {
  sessionSummary: string;            // 游戏摘要（~200 tokens）
  players: {
    characterName: string;
    keyActions: string[];            // 最多3个关键行为
  }[];
}
// 输出：所有玩家的评价 JSON 数组
```

- 相比逐个生成（N 次调用），批量生成只需 1 次调用
- 对于 6 人局，节省约 5 次 LLM 调用

---

## 三、知识提炼与反馈分析 Token 节省策略

### 3.1 反馈文本预处理

- 在调用 LLM 分析反馈前，先对文字评价做去重和聚类
- 相似度 > 0.9 的评价合并为一条代表性评价
- 只将去重后的评价列表传入 LLM，避免重复内容浪费 token

### 3.2 知识提炼延迟批处理

- 不在每条反馈到达时立即触发 LLM 提炼
- 累积到阈值（默认 10 条）后批量处理，一次 LLM 调用分析所有反馈
- 高评分剧本学习同理：累积足够数据后一次性分析

### 3.3 文章/剧本导入分块

- 长文章/剧本先按段落分块，每块独立提取
- 使用较小的模型（如 GPT-4o-mini）做初步提取，仅对高价值候选用大模型精炼

---

## 四、访谈系统（InterviewService）Token 节省策略

### 4.1 访谈问题数量控制

- 默认最大问题数从 10 降为 6
- 每个问题的 LLM 调用只传入：当前问答对 + 已覆盖维度列表（非完整历史）
- 访谈摘要生成时，传入问答对的精简版（问题 + 回答关键词），非完整原文

### 4.2 预设问题优先

- 前 2 个问题使用预设模板（零 LLM 调用），从第 3 个问题开始动态生成
- 预设问题覆盖最核心的维度（叙事风格、推理复杂度），减少 LLM 调用次数

---

## 五、LLM 适配器层优化

### 5.1 模型分级策略

不同任务使用不同规格的模型：

| 任务类型 | 推荐模型级别 | 说明 |
|----------|-------------|------|
| 剧本核心生成（世界观、角色、事件链） | 大模型（GPT-4o / Claude Sonnet） | 需要高质量创意输出 |
| 线索/物料生成 | 中等模型（GPT-4o-mini） | 结构化输出，创意要求较低 |
| DM 实时回复 | 小模型（GPT-4o-mini） | 短回复，速度优先 |
| 知识提炼/反馈分析 | 小模型（GPT-4o-mini） | 结构化提取任务 |
| 访谈追问生成 | 小模型（GPT-4o-mini） | 短问题生成 |
| Embedding 生成 | 专用嵌入模型 | text-embedding-3-small |

```typescript
interface ModelTierConfig {
  tier: 'large' | 'medium' | 'small';
  modelName: string;
  maxTokens: number;
  costPer1kTokens: number;
}

const MODEL_TIER_MAPPING: Record<LLMCallType, string> = {
  [LLMCallType.GENERATION]: 'large',
  [LLMCallType.OPTIMIZATION]: 'large',
  [LLMCallType.DM_RESPONSE]: 'small',
  [LLMCallType.INTERVIEW]: 'small',
  [LLMCallType.KNOWLEDGE_EXTRACTION]: 'small',
  [LLMCallType.FEEDBACK_ANALYSIS]: 'small'
};
```

### 5.2 响应格式约束

- 所有 LLM 调用明确指定输出格式为 JSON（使用 `response_format: { type: "json_object" }`）
- 避免 LLM 输出冗余的解释性文本，只输出结构化数据
- 对于支持 Structured Outputs 的模型，使用 JSON Schema 约束输出结构

### 5.3 Prompt 缓存利用

- 对于支持 Prompt Caching 的模型（如 Claude、GPT-4o），将系统提示词和少样本示例放在提示词前部，利用缓存降低重复 token 计费
- 同一生成 Pipeline 的多个阶段共享相同的系统提示词前缀

---

## 六、Token 消耗监控与预警

```typescript
// 扩展 TokenTrackingService 配置
const TOKEN_OPTIMIZATION_CONFIG = {
  // 单次剧本生成 token 预算上限
  maxTokensPerGeneration: 50000,
  
  // AI DM 单场游戏 token 预算上限
  maxTokensPerGameSession: 20000,
  
  // 单次访谈 token 预算上限
  maxTokensPerInterview: 5000,
  
  // 预警阈值
  alerts: {
    singleCallWarning: 10000,        // 单次调用超过此值记录警告
    dailyBudget: 500000,             // 每日总预算
    generationBudgetExceeded: 0.9    // 单次生成消耗超过预算90%时预警
  }
};
```

- 每次 LLM 调用后，TokenTrackingService 检查是否超出预算
- 超出预算时记录警告日志，但不中断流程（避免影响用户体验）
- 管理员仪表盘展示 token 消耗趋势和优化建议
