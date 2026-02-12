# 知识库组件

本文档包含知识库子系统的核心组件接口定义：KnowledgeBaseService、EmbeddingAdapter、VectorStore、RAGService、LearningPipeline。

---

## 3. 知识库服务 (KnowledgeBaseService)

知识库核心服务，管理知识条目的CRUD、向量嵌入和有效性分数更新。

```typescript
// 知识分类
enum KnowledgeCategory {
  TECHNIQUES = 'techniques',           // 设计技巧
  PATTERNS = 'patterns',               // 结构模式
  EXAMPLES = 'examples',               // 优秀案例
  ANTI_PATTERNS = 'anti_patterns',     // 反面教材
  PLAYER_PREFERENCES = 'player_preferences', // 玩家偏好
  PROMPT_TEMPLATES = 'prompt_templates',     // 提示词模板
  REASONING_CHAINS = 'reasoning_chains'      // 推理链模式
}

// 知识来源
enum KnowledgeSource {
  SEED = 'seed',                       // Skill种子导入
  MANUAL = 'manual',                   // 手动录入
  ARTICLE = 'article',                 // 文章提取
  SCRIPT_ANALYSIS = 'script_analysis', // 剧本分析
  FEEDBACK_EXTRACTION = 'feedback_extraction', // 反馈提炼
  HIGH_RATED_SCRIPT = 'high_rated_script'      // 高评分剧本提取
}

// 知识条目状态
enum KnowledgeStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  EMBEDDING_PENDING = 'embedding_pending'
}

// 知识条目
interface KnowledgeEntry {
  id: string;
  content: string;
  category: KnowledgeCategory;
  gameTypeTags: GameType[];
  effectivenessScore: number;          // 0.0-1.0, 默认0.5
  source: KnowledgeSource;
  sourceReference: string;
  embedding: number[] | null;          // 向量嵌入
  usageCount: number;
  status: KnowledgeStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 权重更新记录
interface WeightUpdateRecord {
  id: string;
  knowledgeEntryId: string;
  reason: 'feedback' | 'manual';
  feedbackId: string | null;
  previousScore: number;
  newScore: number;
  createdAt: Date;
}

// 知识快照
interface KnowledgeSnapshot {
  id: string;
  entries: KnowledgeEntry[];
  totalEntries: number;
  avgEffectivenessScore: number;
  trigger: 'manual' | 'pre_update' | 'rollback';
  createdAt: Date;
}

// 反馈-知识关联
interface FeedbackKnowledgeLink {
  scriptId: string;
  knowledgeEntryIds: string[];
  createdAt: Date;
}

// 知识库查询过滤器
interface KnowledgeFilter {
  categories?: KnowledgeCategory[];
  gameTypes?: GameType[];
  status?: KnowledgeStatus;
  minScore?: number;
  maxScore?: number;
  limit?: number;
  offset?: number;
}

// 知识库统计
interface KnowledgeStats {
  totalEntries: number;
  byCategory: Record<KnowledgeCategory, number>;
  byStatus: Record<KnowledgeStatus, number>;
  avgEffectivenessScore: number;
  scoreDistribution: { range: string; count: number }[];
}

interface IKnowledgeBaseService {
  // CRUD
  create(input: CreateKnowledgeInput): Promise<KnowledgeEntry>;
  getById(id: string): Promise<KnowledgeEntry | null>;
  update(id: string, input: UpdateKnowledgeInput): Promise<KnowledgeEntry>;
  deprecate(id: string): Promise<void>;
  query(filter: KnowledgeFilter): Promise<{ entries: KnowledgeEntry[]; total: number }>;

  // 有效性分数
  updateEffectivenessScore(id: string, delta: number, reason: 'feedback' | 'manual', feedbackId?: string): Promise<void>;
  getWeightHistory(id: string, limit: number): Promise<WeightUpdateRecord[]>;

  // 快照
  createSnapshot(trigger: 'manual' | 'pre_update'): Promise<KnowledgeSnapshot>;
  listSnapshots(): Promise<KnowledgeSnapshot[]>;
  rollbackToSnapshot(snapshotId: string): Promise<void>;

  // 导出/导入
  exportKnowledgeBase(): Promise<string>;  // JSON
  importKnowledgeBase(json: string): Promise<{ imported: number; skipped: number }>;

  // 统计
  getStats(): Promise<KnowledgeStats>;

  // 种子数据
  seedFromSkills(skills: SkillTemplate[]): Promise<number>;

  // 序列化
  serialize(entry: KnowledgeEntry): string;
  deserialize(json: string): KnowledgeEntry;
}
```

---

## 4. Embedding适配器 (EmbeddingAdapter)

向量嵌入生成的适配层，支持多种嵌入模型提供商。

```typescript
interface EmbeddingRequest {
  text: string;
  model?: string;
}

interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  tokenUsage: number;
}

interface IEmbeddingAdapter {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  embedBatch(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]>;
  getProviderName(): string;
  getDimensions(): number;
}

// 配置通过环境变量
// EMBEDDING_PROVIDER=openai|local
// EMBEDDING_API_KEY=xxx
// EMBEDDING_ENDPOINT=https://api.openai.com/v1/embeddings
// EMBEDDING_MODEL=text-embedding-3-small
```

---

## 5. 向量存储 (VectorStore)

进程内向量存储，使用hnswlib实现近似最近邻搜索。

```typescript
interface VectorSearchResult {
  id: string;
  score: number;  // 余弦相似度 0-1
}

interface IVectorStore {
  initialize(dimensions: number): Promise<void>;
  addVector(id: string, vector: number[]): Promise<void>;
  removeVector(id: string): Promise<void>;
  search(queryVector: number[], topK: number): Promise<VectorSearchResult[]>;
  size(): number;
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
```

---

## 6. RAG检索服务 (RAGService)

检索增强生成服务，负责从知识库中检索语义相关的知识条目并组装到LLM提示词中。

```typescript
interface RAGQuery {
  gameType: GameType;
  theme: string;
  era: string;
  location: string;
  categories?: KnowledgeCategory[];
}

interface RAGResult {
  entries: KnowledgeEntry[];
  queryEmbedding: number[];
  totalCandidates: number;
}

interface IRAGService {
  retrieve(query: RAGQuery, topK?: number): Promise<RAGResult>;
  buildPromptContext(entries: KnowledgeEntry[], maxTokens?: number): string;
  semanticSearch(text: string, topK?: number): Promise<KnowledgeEntry[]>;
}

// 默认配置
const RAG_CONFIG = {
  defaultTopK: 20,
  maxContextTokens: 4000,       // 知识条目占用的最大token数
  minEffectivenessScore: 0.2    // 最低有效性分数阈值
};
```

---

## 7. 学习管道 (LearningPipeline)

闭环学习流程的编排服务，协调反馈分析、权重更新和知识提炼。

```typescript
interface FeedbackAnalysisResult {
  scriptId: string;
  compositeScore: number;        // 综合反馈分数
  linkedEntryIds: string[];
  weightAdjustments: { entryId: string; delta: number }[];
  autoDeprecated: string[];      // 自动弃用的条目ID
}

interface KnowledgeExtractionResult {
  candidates: {
    content: string;
    suggestedCategory: KnowledgeCategory;
    source: KnowledgeSource;
    sourceReference: string;
  }[];
}

interface ILearningPipeline {
  // 反馈处理
  processFeedback(feedbackId: string): Promise<FeedbackAnalysisResult>;
  calculateCompositeScore(feedback: Feedback): number;

  // 知识提炼
  extractFromFeedbacks(scriptId: string): Promise<KnowledgeExtractionResult>;
  extractFromHighRatedScript(scriptId: string): Promise<KnowledgeExtractionResult>;
  extractFromArticle(text: string): Promise<KnowledgeExtractionResult>;
  extractFromScript(scriptContent: string): Promise<KnowledgeExtractionResult>;

  // 自动触发检查
  checkFeedbackExtractionTrigger(scriptId: string): Promise<boolean>;
  checkHighRatedScriptTrigger(scriptId: string): Promise<boolean>;
}

// 综合分数计算权重
const COMPOSITE_SCORE_WEIGHTS = {
  plotScore: 0.3,
  difficultyScore: 0.2,
  characterScore: 0.3,
  overallScore: 0.2
};

// 有效性分数调整参数
const EFFECTIVENESS_ADJUSTMENT = {
  positiveThreshold: 7,          // 高于此分数增加权重
  negativeThreshold: 5,          // 低于此分数减少权重
  positiveDeltaFactor: 0.02,
  negativeDeltaFactor: 0.02,
  autoDeprecateThreshold: 0.1,   // 低于此分数考虑弃用
  autoDeprecateConsecutive: 5    // 连续负向调整次数
};
```
