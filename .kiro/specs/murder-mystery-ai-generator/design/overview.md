# 设计文档：概述与架构

## 概述

本系统是一个全栈TypeScript应用，由三个核心子系统组成：**剧本生成子系统**、**线上游玩子系统**和**知识库子系统**，通过评价反馈闭环连接。

系统采用前后端分离架构：
- **前端**：Vue 3 + TypeScript SPA，使用Vue Router路由管理，Pinia状态管理，Vue I18n国际化
- **后端**：Node.js + Express + TypeScript RESTful API + WebSocket实时通信
- **数据层**：MySQL持久化存储 + Redis缓存/会话/实时状态
- **AI层**：LLM适配器统一接入多种大语言模型，Embedding适配器生成向量嵌入，TTS引擎语音合成，可选视频生成
- **知识层**：向量存储（hnswlib）支持语义搜索，RAG检索增强生成，反馈驱动权重更新
- **部署**：Docker + Docker Compose容器编排，GitHub Actions CI/CD

核心设计决策：
1. 剧本与游戏解耦：剧本作为独立资产存储，可被多个Game_Session复用
2. AI DM全自动主持：所有游戏由AI_DM主持，基于DM_Handbook自动推进流程
3. 分支叙事引擎：支持多分支剧情和多结局，通过玩家投票动态选择路径
4. 知识驱动生成：通过RAG从知识库中检索语义相关的知识条目，注入LLM提示词上下文
5. 闭环学习系统：学习→实践→反馈→精进，知识库通过玩家反馈持续演化
6. 反馈驱动优化：玩家评价和建议自动反馈到知识库和生成引擎
7. AI预生成访谈：在剧本生成前通过自适应交互式访谈收集创作者意图
8. 完整AI工具链：提示词模板版本化、少样本示例、推理链、Token追踪、A/B测试
9. 玩家评价权重：基于玩家游玩记录的加权评价机制
10. 双身份系统：玩家身份和设计师身份独立升级
11. 技能牌系统：设计师通过选牌定制生成效果
12. 双币经济系统：游戏币和真实货币完全分离
13. 设计师荣誉系统：专属排行榜和荣誉称号
14. **LLM Token 节省优先**：所有涉及 LLM 调用的功能（剧本生成、AI DM、知识提炼、访谈等）必须将 token 节省作为核心设计约束。详见 [Token 节省策略](token-optimization.md)

## 详细设计文档索引

| 文档 | 内容 |
|------|------|
| [独立生成器开发计划](../standalone-generator-plan.md) | 独立工程双模式架构（Standalone + Microservice）、依赖分析、4 阶段开发策略、项目结构、API 契约 |
| [Token 节省策略](token-optimization.md) | LLM Token 节省全局策略：剧本生成、AI DM、知识提炼、访谈等所有 LLM 调用场景的 token 优化设计 |
| [组件接口：核心子系统](components-core.md) | ConfigService, SkillService, GeneratorService, DMHandbook, PlayerHandbook, Material, SessionService, AIDMService, LLMAdapter, FeedbackService, AccountService, 成就收藏, 排行榜, WebSocket协议 |
| [组件接口：知识库子系统](components-knowledge.md) | KnowledgeBaseService, EmbeddingAdapter, VectorStore, RAGService, LearningPipeline |
| [组件接口：AI工具链](components-ai-toolchain.md) | PromptTemplateService, FewShotExampleService, ReasoningChainService, TokenTrackingService, ABTestService, PlayerRatingWeightService |
| [组件接口：设计师与经济](components-designer.md) | SkillCardService, DesignerService, EconomyService, DesignerLeaderboardService |
| [组件接口：插件与多媒体](components-plugins.md) | PluginSystem, AssetStorage, TagSystem, InterviewService, MediaGeneration, TTS |
| [数据库设计](database.md) | MySQL 表结构, Redis 数据结构 |
| [项目结构](project-structure.md) | 目录结构, 测试框架 |
| [正确性属性](properties.md) | 45 个 Property-Based Testing 属性 |
| [REST API 端点](rest-api.md) | 所有 REST API 端点汇总 |
