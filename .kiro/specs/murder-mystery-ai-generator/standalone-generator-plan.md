# 独立工程：AI 剧本杀生成器 — 依赖分析与开发策略

## 一、目标

在一个独立工程中实现"AI 生成剧本杀"核心功能，支持**双模式运行**：

- **独立模式（Standalone）**：作为 CLI 工具或独立 API 服务运行，使用文件存储 + 内存缓存，零外部依赖
- **微服务模式（Microservice）**：作为 `creation-service`（端口 3002）接入整体微服务架构，使用 MySQL + Redis，通过 REST API 与其他服务通信，订阅事件总线

两种模式共享同一套核心生成引擎代码，通过依赖注入切换基础设施实现。

---

## 二、依赖分析

### 2.1 必须包含的核心组件

| 组件 | 原因 | 复杂度 |
|------|------|--------|
| ConfigService | 参数校验、轮次结构计算，生成入口 | 低 |
| SkillService | Skill 模板管理，提供生成 Prompt 片段 | 低 |
| GeneratorService | 核心生成引擎，Pipeline 编排 | 高 |
| LLMAdapter | 调用大模型 API | 中 |
| PromptTemplateService | 提示词模板管理和渲染 | 中 |
| TokenTrackingService | Token 用量记录（节省模式需要） | 低 |
| Token 节省模式开关 | optimized / unlimited 切换 | 低 |

### 2.2 可选包含（建议第二阶段）

| 组件 | 原因 | 是否可延后 |
|------|------|-----------|
| KnowledgeBaseService + VectorStore + RAGService | 知识驱动生成，提升质量。但没有知识库时 Generator 可回退到纯 Skill 模板 | ✅ 可延后 |
| EmbeddingAdapter | 仅 RAG 需要 | ✅ 随知识库一起 |
| InterviewService | 预生成访谈，增强创作意图理解。但可跳过，直接用 Config 生成 | ✅ 可延后 |
| FewShotExampleService | 少样本示例，提升质量。但可先硬编码几个示例 | ✅ 可延后 |
| ReasoningChainService | 推理链模式，提升复杂逻辑质量。可先不用 | ✅ 可延后 |
| ABTestService | A/B 测试框架。独立工具阶段不需要 | ✅ 可延后 |

### 2.3 明确不需要的组件（独立模式）

| 组件 | 原因 |
|------|------|
| SessionService / AIDMService / WebSocket | 线上游玩子系统，与生成无关 |
| FeedbackService / LearningPipeline | 反馈闭环，需要游玩数据 |
| AccountService / AchievementService / CollectionService | 用户系统 |
| LeaderboardService / DesignerLeaderboardService | 排行榜 |
| DesignerService / EconomyService | 设计师身份、双币经济 |
| SkillCardService | 技能牌系统（依赖设计师等级），可简化为直接选 Skill |
| PluginSystem / AssetStorage / MediaGeneration / TTS | 多媒体和存储 |
| TagService | 标签系统（微服务模式下按需加载） |
| PlayerRatingWeightService | 评价权重 |
| 前端 (client/) | 独立工具不需要 UI |

### 2.4 外部依赖

| 依赖 | 用途 | 独立模式 | 微服务模式 |
|------|------|---------|-----------|
| LLM API（OpenAI / Claude / 其他） | 核心生成能力 | ✅ 必须 | ✅ 必须 |
| Node.js + TypeScript | 运行环境 | ✅ 必须 | ✅ 必须 |
| MySQL | 持久化 | ❌ 用文件替代 | ✅ 必须 |
| Redis | 缓存 + 事件总线 | ❌ 用内存替代 | ✅ 必须 |
| hnswlib-node | 向量搜索 | ❌ 延后 | ✅ 第二阶段 |
| Embedding API | 向量嵌入 | ❌ 延后 | ✅ 第二阶段 |

---

## 三、双模式架构设计

### 3.1 核心原则：依赖倒置 + 适配器模式

所有基础设施通过接口抽象，运行时根据模式注入不同实现：

```typescript
// ===== 运行模式 =====
enum RunMode {
  STANDALONE = 'standalone',
  MICROSERVICE = 'microservice'
}

// ===== 存储抽象 =====
interface IScriptRepository {
  save(script: Script): Promise<string>;
  getById(id: string): Promise<Script | null>;
  list(filters?: ScriptFilters): Promise<Script[]>;
  getVersions(id: string): Promise<Script[]>;
}

// 独立模式：JSON 文件存储
class FileScriptRepository implements IScriptRepository { /* output/ 目录 */ }
// 微服务模式：MySQL 存储
class MySQLScriptRepository implements IScriptRepository { /* scripts 表 */ }

// ===== 缓存抽象 =====
interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

// 独立模式：内存 Map
class MemoryCacheProvider implements ICacheProvider { /* Map + setTimeout TTL */ }
// 微服务模式：Redis
class RedisCacheProvider implements ICacheProvider { /* ioredis */ }

// ===== 知识检索抽象 =====
interface IKnowledgeRetriever {
  retrieve(query: RAGQuery, topK?: number): Promise<KnowledgeEntry[]>;
  retrieveBatch(queries: RAGQuery[], totalContextTokens?: number): Promise<KnowledgeEntry[]>;
}

// 独立模式：返回空（回退到 Skill 模板）
class NoopKnowledgeRetriever implements IKnowledgeRetriever { /* 返回 [] */ }
// 微服务模式：调用 knowledge-service REST API
class RemoteKnowledgeRetriever implements IKnowledgeRetriever {
  // POST ${KNOWLEDGE_SERVICE_URL}/api/internal/rag/retrieve-batch
}

// ===== AI 工具链抽象 =====
interface IAIToolchainProvider {
  getPromptTemplate(name: string, version?: string): Promise<PromptTemplate | null>;
  getFewShotExamples(category: string, limit?: number): Promise<FewShotExample[]>;
  recordTokenUsage(record: TokenUsageRecord): Promise<void>;
  assignABTest(category: string, userId?: string): Promise<ABTestVariant | null>;
}

// 独立模式：本地文件模板 + 内存记录
class LocalAIToolchainProvider implements IAIToolchainProvider { /* prompts/ 目录 */ }
// 微服务模式：调用 ai-toolchain-service REST API
class RemoteAIToolchainProvider implements IAIToolchainProvider {
  // GET ${AI_TOOLCHAIN_URL}/api/internal/prompts/:name
  // POST ${AI_TOOLCHAIN_URL}/api/internal/token-usage
}

// ===== 事件总线抽象 =====
interface IEventBus {
  publish<T>(channel: string, payload: T): Promise<void>;
  subscribe(channel: string, handler: (event: DomainEvent) => Promise<void>): void;
}

// 独立模式：本地 EventEmitter（进程内）
class LocalEventBus implements IEventBus { /* EventEmitter */ }
// 微服务模式：Redis Pub/Sub + Outbox Pattern
class RedisEventBus implements IEventBus { /* @murder-mystery/event-bus */ }
```

### 3.2 依赖注入容器

```typescript
interface AppContainer {
  runMode: RunMode;
  scriptRepository: IScriptRepository;
  cache: ICacheProvider;
  knowledgeRetriever: IKnowledgeRetriever;
  aiToolchain: IAIToolchainProvider;
  eventBus: IEventBus;
  llmAdapter: ILLMAdapter;
  configService: IConfigService;
  skillService: ISkillService;
  generatorService: IGeneratorService;
  promptService: IPromptTemplateService;
  tokenTracker: ITokenTrackingService;
}

function createContainer(mode: RunMode): AppContainer {
  if (mode === RunMode.STANDALONE) {
    return createStandaloneContainer();
  }
  return createMicroserviceContainer();
}
```

### 3.3 双入口设计

```
独立模式入口：src/cli.ts
  → 解析命令行参数
  → createContainer(RunMode.STANDALONE)
  → 调用 generatorService.generate(config)
  → 输出 JSON 到 output/

独立 API 入口：src/standalone-server.ts
  → createContainer(RunMode.STANDALONE)
  → Express 监听自定义端口（默认 4000）
  → 暴露简化 API（/api/generate, /api/configs, /api/scripts）

微服务入口：src/server.ts
  → createContainer(RunMode.MICROSERVICE)
  → Express 监听端口 3002
  → 暴露完整 creation-service API（/api/creation/...）
  → 暴露内部 API（/api/internal/scripts/...）
  → 订阅事件总线
```

---

## 四、微服务模式 API 契约

微服务模式下，本工程作为 `creation-service` 运行，必须实现以下 API：

### 4.1 对外 REST API（前端调用）

```
POST   /api/creation/configs                — 创建配置
GET    /api/creation/configs/:id            — 获取配置
POST   /api/creation/scripts/generate       — 生成剧本（支持 tokenMode 参数）
GET    /api/creation/scripts                — 剧本列表
GET    /api/creation/scripts/:id            — 剧本详情
GET    /api/creation/scripts/:id/versions   — 版本历史
POST   /api/creation/scripts/:id/optimize   — 反馈优化
GET    /api/creation/scripts/search         — 标签搜索
```

### 4.2 内部 API（供其他微服务调用）

```
GET    /api/internal/scripts/:id            — 获取剧本完整内容（gameplay-service 调用）
GET    /api/internal/scripts/:id/dm-handbook — 获取 DM 手册（gameplay-service 调用）
GET    /api/internal/scripts/:id/player-handbooks — 获取玩家手册列表
GET    /api/internal/scripts/:id/materials  — 获取物料
GET    /api/internal/scripts/:id/branch-structure — 获取分支结构
GET    /api/internal/scripts/:id/config     — 获取剧本配置
GET    /api/internal/scripts/:id/designer   — 获取剧本创建者 ID
POST   /api/internal/cache/invalidate       — 缓存失效通知
```

内部 API 通过 `X-Internal-Service-Key` header 认证。

### 4.3 事件订阅（微服务模式）

| 事件 | 来源 | 处理 |
|------|------|------|
| `events:feedback:threshold-reached` | feedback-service | 触发自动优化 |
| `events:knowledge:weights-updated` | knowledge-service | 失效 RAG 缓存 |
| `events:designer:level-up` | progression-service | 更新技能牌解锁状态 |

### 4.4 事件发布（微服务模式）

| 事件 | 触发时机 | 订阅者 |
|------|---------|--------|
| `events:script:generated` | 剧本生成完成 | progression-service |

### 4.5 同步调用其他服务（微服务模式）

```
本工程 ──► knowledge-service      (RAG 检索)
本工程 ──► ai-toolchain-service   (提示词模板、少样本示例、Token 记录)
本工程 ──► auth-service           (验证用户)
本工程 ──► progression-service    (查询设计师等级、扣费)
```

---

## 五、项目结构

```
murder-mystery-generator/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── cli.ts                         # 独立模式 CLI 入口
│   ├── standalone-server.ts           # 独立模式 API 入口
│   ├── server.ts                      # 微服务模式入口（creation-service:3002）
│   ├── container.ts                   # 依赖注入容器工厂
│   ├── types/
│   │   ├── config.ts                  # ScriptConfig, GameType, AgeGroup
│   │   ├── script.ts                  # Script, DMHandbook, PlayerHandbook, Material
│   │   ├── prompt.ts                  # PromptTemplate, PromptVariable
│   │   ├── token.ts                   # TokenOptimizationMode, TokenBudget
│   │   └── interfaces.ts             # 所有抽象接口（IScriptRepository, ICacheProvider 等）
│   ├── core/                          # 核心业务逻辑（两种模式共享）
│   │   ├── config.service.ts          # 参数校验 + 轮次计算
│   │   ├── skill.service.ts           # Skill 模板管理
│   │   ├── generator.service.ts       # 核心生成 Pipeline
│   │   ├── prompt.service.ts          # 提示词模板渲染
│   │   └── token-tracker.ts           # Token 用量记录
│   ├── adapters/
│   │   ├── llm/
│   │   │   ├── llm-adapter.ts         # LLM 接口 + 工厂
│   │   │   ├── openai.adapter.ts      # OpenAI 实现
│   │   │   └── anthropic.adapter.ts   # Anthropic 实现
│   │   ├── standalone/                # 独立模式适配器
│   │   │   ├── file-repository.ts     # JSON 文件存储
│   │   │   ├── memory-cache.ts        # 内存缓存
│   │   │   ├── local-toolchain.ts     # 本地提示词模板
│   │   │   ├── noop-knowledge.ts      # 空知识检索
│   │   │   └── local-event-bus.ts     # 本地 EventEmitter
│   │   └── microservice/              # 微服务模式适配器
│   │       ├── mysql-repository.ts    # MySQL 存储
│   │       ├── redis-cache.ts         # Redis 缓存
│   │       ├── remote-toolchain.ts    # 远程 ai-toolchain-service
│   │       ├── remote-knowledge.ts    # 远程 knowledge-service
│   │       └── redis-event-bus.ts     # Redis Pub/Sub 事件总线
│   ├── routes/                        # HTTP 路由
│   │   ├── standalone.routes.ts       # 独立模式简化路由
│   │   ├── creation.routes.ts         # /api/creation/* 微服务路由
│   │   └── internal.routes.ts         # /api/internal/* 内部 API
│   ├── middleware/
│   │   ├── auth.ts                    # JWT 验证（微服务模式）
│   │   └── service-key.ts            # 内部服务密钥验证
│   ├── skills/                        # Skill 模板 JSON 文件
│   │   ├── honkaku/
│   │   ├── shin-honkaku/
│   │   └── henkaku/
│   ├── prompts/                       # 提示词模板文件
│   │   ├── world-building.md
│   │   ├── character-network.md
│   │   ├── event-chain.md
│   │   ├── branch-structure.md
│   │   ├── clue-system.md
│   │   ├── dm-handbook.md
│   │   ├── player-handbook.md
│   │   └── materials.md
│   ├── config/
│   │   └── index.ts                   # 环境变量 + 运行模式检测
│   └── output/                        # 独立模式输出目录
│       └── .gitkeep
├── tests/
│   ├── core/                          # 核心逻辑测试
│   ├── adapters/                      # 适配器测试
│   └── routes/                        # API 路由测试
└── scripts/
    └── generate.ts                    # 快速生成脚本
```

### 关键简化决策（按模式对比）

| 维度 | 独立模式 | 微服务模式 |
|------|---------|-----------|
| 存储 | JSON 文件（output/） | MySQL（creation_db） |
| 缓存 | 内存 Map | Redis |
| 知识检索 | 无（回退 Skill 模板） | REST 调用 knowledge-service |
| AI 工具链 | 本地文件模板 | REST 调用 ai-toolchain-service |
| 事件总线 | 本地 EventEmitter | Redis Pub/Sub |
| 认证 | 无 | JWT + X-Internal-Service-Key |
| API 路由 | `/api/generate` 等简化路由 | `/api/creation/*` + `/api/internal/*` |
| 端口 | 4000（可配置） | 3002（固定） |
| 入口 | `cli.ts` 或 `standalone-server.ts` | `server.ts` |

---

## 六、开发策略（分 4 个阶段）

### 阶段 1：最小可用（MVP）— 约 3-5 天

目标：独立模式可用。输入 Config，输出完整剧本 JSON。

```
实现顺序：
1. 项目脚手架（package.json, tsconfig, .env）
2. types/ — 所有类型定义 + 抽象接口
3. container.ts — 依赖注入容器（先只实现 standalone）
4. config.service.ts — 参数校验 + 轮次计算
5. llm-adapter.ts — OpenAI/Claude API 调用 + 重试 + Token 记录
6. prompts/ — 8 个阶段的提示词模板（最核心的工作量）
7. prompt.service.ts — 模板加载 + 变量渲染
8. skill.service.ts — 加载 Skill JSON 模板
9. generator.service.ts — 8 阶段 Pipeline 编排
10. adapters/standalone/ — 文件存储 + 内存缓存 + 空知识检索
11. cli.ts — CLI 入口
12. 基础测试
```

交付物：
- `npx ts-node src/cli.ts --config config.json` → 输出完整剧本到 `output/`
- 支持 optimized / unlimited 两种 Token 模式
- 输出包含：DM 手册、N 份玩家手册、物料、分支结构

### 阶段 2：独立 API + 质量提升 — 约 3-4 天

目标：独立模式 API 可用，引入知识库提升质量。

```
实现顺序：
1. standalone-server.ts — Express API 入口
2. routes/standalone.routes.ts — 简化路由
3. knowledge/ — 本地知识条目（JSON 文件存储）
4. vector-store.ts — hnswlib 向量存储
5. embedding-adapter.ts — Embedding API 适配
6. rag.service.ts — RAG 检索 + 提示词注入
7. 更新 generator.service.ts — 集成 RAG + 少样本
8. interview.service.ts — 访谈问答 + 摘要生成
```

### 阶段 3：微服务模式 — 约 3-4 天

目标：作为 `creation-service` 接入微服务架构。

```
实现顺序：
1. adapters/microservice/ — MySQL 存储、Redis 缓存、远程知识检索、远程工具链、Redis 事件总线
2. container.ts — 添加 microservice 容器创建
3. server.ts — 微服务入口（端口 3002）
4. routes/creation.routes.ts — /api/creation/* 完整路由
5. routes/internal.routes.ts — /api/internal/* 内部 API
6. middleware/ — JWT 验证 + 内部服务密钥
7. 事件订阅处理（feedback:threshold-reached, knowledge:weights-updated, designer:level-up）
8. 事件发布（script:generated）
9. Saga 模式集成（扣费 → 生成 → 存储）
10. 降级策略（knowledge-service 不可用时回退 Skill 模板）
```

### 阶段 4：完善与发布 — 约 2-3 天

目标：npm 包发布 + 完整测试 + 文档。

```
实现顺序：
1. 导出核心接口为 npm 包（@murder-mystery/generator）
2. 完善测试覆盖（核心逻辑 + 适配器 + 路由）
3. Docker 支持（Dockerfile + docker-compose 集成）
4. README + 使用文档
5. 与主工程 docker-compose.yml 集成验证
```

---

## 七、阶段 1 详细任务清单

### 7.1 提示词模板设计（最关键）

8 个阶段的提示词模板是 MVP 的核心工作量：

| 阶段 | 模板文件 | 输入 | 输出格式 |
|------|----------|------|----------|
| 1 | world-building.md | Config + Skill摘要 | `{ era, location, atmosphere, coreEvent, theme }` |
| 2 | character-network.md | 世界观骨架 + playerCount | `{ characters: [{ name, role, motive, secrets, alibi }] }` |
| 3 | event-chain.md | 世界观骨架 + 角色摘要 | `{ timeline: [{ time, event, characters }], truth, method }` |
| 4 | branch-structure.md | 时间线摘要 + 角色名 | `{ nodes: [...], edges: [...], endings: [...] }` |
| 5 | clue-system.md | 时间线 + 角色 + 分支 | `{ clues: [{ id, content, target, round, condition }] }` |
| 6 | dm-handbook.md | 各阶段摘要 | `{ overview, roundGuides, judgingRules, truthReveal }` |
| 7 | player-handbook.md | 单角色档案 + 关系 | `{ background, goals, relationships, roundActions }` |
| 8 | materials.md | 线索列表 | `{ clueCards, propCards, voteCards, sceneCards }` |

### 7.2 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 运行时 | Node.js 20+ | 与主工程一致 |
| 语言 | TypeScript 5.x | 类型安全 |
| LLM SDK | openai (npm) | 支持 OpenAI 和兼容 API |
| 测试 | Vitest | 与主工程一致 |
| CLI | commander | 轻量 CLI 框架 |
| API | Express | 与主工程一致 |
| 包管理 | pnpm | 快速、节省磁盘 |
| MySQL | mysql2 | 微服务模式 |
| Redis | ioredis | 微服务模式 |

### 7.3 环境变量

```env
# 运行模式
RUN_MODE=standalone               # standalone | microservice

# LLM 配置
LLM_PROVIDER=openai               # openai | anthropic
LLM_API_KEY=sk-xxx
LLM_MODEL_LARGE=gpt-4o            # 核心生成用大模型
LLM_MODEL_SMALL=gpt-4o-mini       # 辅助任务用小模型
LLM_BASE_URL=                     # 可选：自定义 API 端点

# Token 模式
TOKEN_MODE=optimized               # optimized | unlimited

# 独立模式配置
STANDALONE_PORT=4000               # 独立 API 端口
OUTPUT_DIR=./output
OUTPUT_FORMAT=json                 # json | markdown

# 微服务模式配置（仅 RUN_MODE=microservice 时需要）
PORT=3002
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=creation_db
MYSQL_USER=root
MYSQL_PASSWORD=
REDIS_URL=redis://localhost:6379
JWT_SECRET=
INTERNAL_SERVICE_KEY=
KNOWLEDGE_SERVICE_URL=http://localhost:3004
AI_TOOLCHAIN_SERVICE_URL=http://localhost:3005
AUTH_SERVICE_URL=http://localhost:3001
PROGRESSION_SERVICE_URL=http://localhost:3006
```

---

## 八、风险与注意事项

1. **提示词质量是成败关键**：8 个阶段的提示词模板需要反复调试，建议先用 unlimited 模式调通，再切 optimized 模式优化
2. **LLM 输出不稳定**：JSON 输出可能格式错误，需要做 JSON 解析容错 + 重试
3. **阶段间一致性**：Pipeline 各阶段输出需要保持角色名、时间线等信息一致，需要在后续阶段的提示词中明确引用前序输出
4. **Token 消耗预估**：MVP 阶段先用 unlimited 模式跑通，记录实际 token 消耗，再据此调优 optimized 模式的预算参数
5. **接口兼容**：独立工具的类型定义尽量与 `@murder-mystery/shared` 包保持一致，减少微服务模式迁移成本
6. **双模式测试**：核心逻辑测试使用 standalone 适配器（快速、无外部依赖），集成测试需要覆盖 microservice 适配器
7. **降级一致性**：微服务模式下 knowledge-service 不可用时，降级行为应与独立模式一致（回退 Skill 模板），确保生成引擎不因基础设施差异产生不同行为
