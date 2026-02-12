# 设计文档：线上剧本杀AI生成工具

> 本文档已拆分为多个子文档以降低 token 消耗。请参阅下方索引。

## 文档索引

- [独立生成器开发计划](standalone-generator-plan.md) — 独立工程双模式架构（Standalone + Microservice）、依赖分析、4 阶段开发策略
- [概述与架构](design/overview.md) — 系统概述、核心设计决策、架构图、请求流程、知识库学习闭环
- [Token 节省策略](design/token-optimization.md) — LLM Token 节省全局策略：分阶段生成、DM 混合模式、模型分级、缓存、预算管理
- [组件接口：核心子系统](design/components-core.md) — ConfigService, SkillService, GeneratorService, DMHandbook, PlayerHandbook, Material, SessionService, AIDMService, LLMAdapter, FeedbackService, AccountService, 成就收藏, 排行榜, WebSocket协议
- [组件接口：知识库子系统](design/components-knowledge.md) — KnowledgeBaseService, EmbeddingAdapter, VectorStore, RAGService, LearningPipeline
- [组件接口：AI工具链](design/components-ai-toolchain.md) — PromptTemplateService, FewShotExampleService, ReasoningChainService, TokenTrackingService, ABTestService, PlayerRatingWeightService
- [组件接口：设计师与经济](design/components-designer.md) — SkillCardService, DesignerService, EconomyService, DesignerLeaderboardService
- [组件接口：插件与多媒体](design/components-plugins.md) — PluginSystem, AssetStorage, TagSystem, InterviewService, MediaGeneration, TTS
- [数据库设计](design/database.md) — MySQL 表结构, Redis 数据结构
- [项目结构](design/project-structure.md) — 目录结构, 测试框架
- [正确性属性](design/properties.md) — 45 个 Property-Based Testing 属性
- [REST API 端点](design/rest-api.md) — 所有 REST API 端点汇总
