# 实施计划：线上剧本杀AI生成工具

## 概述

基于已批准的需求文档和设计文档，将系统拆分为增量式编码任务。采用 Monorepo 结构（packages/shared、packages/server、packages/client），全栈 TypeScript，MySQL + Redis 数据层，Docker + Docker Compose 部署，GitHub Actions CI/CD。

测试框架：Vitest + fast-check（属性测试），Supertest（API测试），Playwright（E2E测试）。

## 任务

- [x] 1. 项目脚手架与基础设施搭建
  - [x] 1.1 初始化 Monorepo 项目结构
    - 创建根目录 `package.json`（workspaces 配置）、`tsconfig.base.json`
    - 创建 `packages/shared/`、`packages/server/`、`packages/client/` 三个子包，各自含 `package.json` 和 `tsconfig.json`
    - 安装核心依赖：TypeScript、Vitest、fast-check、ESLint
    - _需求: 17.1, 17.2_

  - [x] 1.2 搭建后端 Express 应用骨架
    - 创建 `packages/server/src/app.ts`，配置 Express、CORS、JSON 解析、错误处理中间件
    - 创建 `packages/server/src/config/index.ts`，读取环境变量（DB、Redis、LLM API 等）
    - _需求: 17.1_

  - [x] 1.3 搭建数据库连接与迁移
    - 创建 `packages/server/src/db/mysql.ts`（MySQL 连接池）和 `packages/server/src/db/redis.ts`（Redis 客户端）
    - 创建 `packages/server/src/db/migrations/` 目录，编写初始迁移脚本，包含所有表结构（player_accounts, script_configs, scripts, tags, script_tags, game_sessions, session_players, feedbacks, live_suggestions, achievements, player_achievements, collection_items, assets）
    - _需求: 17.2, 17.3_

  - [x] 1.4 搭建前端 Vue 3 应用骨架
    - 使用 Vite 创建 `packages/client/`，配置 Vue Router、Pinia、Vue I18n
    - 创建基础路由结构和布局组件
    - 创建 `packages/client/src/i18n/` 目录，初始化中英文语言包骨架
    - _需求: 18.1, 18.2_

  - [x] 1.5 配置 Docker 与 Docker Compose
    - 创建 `packages/server/Dockerfile` 和 `packages/client/Dockerfile`
    - 创建根目录 `docker-compose.yml`，编排前端、后端、MySQL、Redis 四个服务
    - _需求: 17.1, 17.2, 17.3_

  - [x] 1.6 配置 GitHub Actions CI/CD
    - 创建 `.github/workflows/ci.yml`，包含代码检查（lint）、测试运行（vitest --run）、Docker 镜像构建步骤
    - _需求: 17.4, 17.5_

- [x] 2. 共享类型定义（packages/shared）
  - [x] 2.1 定义核心类型
    - 创建 `packages/shared/src/types/config.ts`：ScriptConfig、GameType、AgeGroup、RoundStructure、RoundPhase、ValidationResult、ValidationError
    - 创建 `packages/shared/src/types/script.ts`：Script、DMHandbook、PlayerHandbook、Material、BranchStructure、BranchNode、VoteOption、Ending、PlayerEnding、TimelineEvent、ClueDistributionEntry、CharacterRelationship、RoundAction
    - 创建 `packages/shared/src/types/session.ts`：GameSession、SessionPlayer、SessionStatus、VoteRecord
    - 创建 `packages/shared/src/types/feedback.ts`：Feedback、LiveSuggestion、AggregatedFeedback
    - 创建 `packages/shared/src/types/account.ts`：PlayerAccount、Achievement、CollectionItem、GameHistoryEntry
    - 创建 `packages/shared/src/types/tag.ts`：Tag、TagCategory、ScriptTag
    - 创建 `packages/shared/src/types/asset.ts`：Asset、AssetType
    - 创建 `packages/shared/src/types/plugin.ts`：IPlugin、PluginType、PluginConfig
    - 创建 `packages/shared/src/types/websocket.ts`：ClientEvent、ServerEvent 联合类型
    - 创建 `packages/shared/src/index.ts` 统一导出
    - _需求: 1.1, 3.1, 7.1, 8.1, 12.1, 15.1_

- [x] 3. 配置服务与参数校验（ConfigService）
  - [x] 3.1 实现配置参数校验逻辑
    - 创建 `packages/server/src/services/config.service.ts`
    - 实现 `validate()` 方法：校验 playerCount（1-6）、durationHours（2-6）、gameType 枚举、ageGroup 枚举、restorationRatio + deductionRatio = 100、必填文本字段非空
    - 返回 ValidationResult，包含每个不合法字段的具体错误信息
    - _需求: 1.1, 1.2, 1.4_

  - [x] 3.2 实现轮次结构自动适配
    - 实现 `calculateRoundStructure(durationHours)` 方法
    - 按设计文档中的适配规则表计算轮次数、每轮阶段时间、总结时间
    - 确保每轮包含阅读（10-15分钟）、搜证（15-20分钟）、推证（15-20分钟）三个阶段
    - _需求: 1.6, 1.7_

  - [x] 3.3 实现配置 CRUD 与 REST API
    - 实现 `create()` 和 `getById()` 方法，持久化到 MySQL script_configs 表
    - 创建 `packages/server/src/routes/configs.ts`，实现 POST /api/configs 和 GET /api/configs/:id
    - _需求: 1.5_

  - [ ]* 3.4 编写配置参数校验属性测试
    - **Property 1: 配置参数校验完整性**
    - 使用 fast-check 生成任意配置输入，验证：合法输入校验通过，非法输入返回精确错误列表
    - **验证需求: 1.1, 1.2, 1.4**

  - [ ]* 3.5 编写轮次结构属性测试
    - **Property 9: 轮次结构时长约束**
    - 使用 fast-check 对 durationHours 2-6 生成输入，验证所有轮次时间 + 总结时间 ≤ D × 60 分钟
    - **验证需求: 1.6, 1.7**

- [x] 4. Skill库服务（SkillService）— 注意：此服务将在任务43中被SkillCardService扩展
  - [x] 4.1 实现 Skill 模板管理
    - 创建 `packages/server/src/services/skill.service.ts`
    - 创建 `packages/server/src/skills/` 目录，按游戏类型（honkaku/shin-honkaku/henkaku）组织 JSON 模板文件
    - 实现 `getByCategory()`、`getByGameType()`、`getForGeneration()` 方法
    - 实现 `serialize()` 和 `deserialize()` 方法（JSON 序列化/反序列化）
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.2 编写 Skill 模板 JSON 往返属性测试
    - **Property 2: Skill模板JSON往返一致性**
    - 使用 fast-check 生成任意 SkillTemplate 对象，验证 serialize → deserialize → serialize 结果一致
    - **验证需求: 2.7**

- [x] 5. 检查点 - 基础服务验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 6. LLM 适配器（LLMAdapter）
  - [x] 6.1 实现 LLM 适配器
    - 创建 `packages/server/src/adapters/llm-adapter.interface.ts`（ILLMAdapter 接口）
    - 创建 `packages/server/src/adapters/llm-adapter.ts`（具体实现）
    - 实现 `send()` 方法：发送 prompt，接收响应，记录 token 用量和响应时间
    - 实现指数退避重试策略（最多3次，baseDelay 1000ms，backoffMultiplier 2）
    - 通过环境变量配置 API 密钥和端点
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 6.2 编写 LLM 适配器单元测试
    - 测试重试逻辑（mock API 失败场景）
    - 测试错误响应结构化返回
    - _需求: 11.3, 11.4_

- [ ] 7. 剧本生成引擎（GeneratorService）
  - [~] 7.1 实现核心生成逻辑
    - 创建 `packages/server/src/services/generator.service.ts`
    - 实现 `generate(config)` 方法：组装 Skill 模板 + Config 参数为 LLM prompt，调用 LLM_Adapter，解析响应为 Script 结构
    - 生成 DM_Handbook（含时间线、线索分发表、轮次指引、分支决策点、多结局、判定规则）
    - 生成 PlayerHandbook（每个角色含背景、目标、关系、已知线索、轮次行动指引）
    - 生成 Material（线索卡、道具卡、投票卡、场景描述卡）
    - 生成 BranchStructure（分支节点、边、多结局）
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 4.1-4.6, 5.1-5.4, 6.1-6.3_

  - [ ] 7.2 实现剧本序列化与存储
    - 实现 `serializeScript()` 和 `deserializeScript()` 方法
    - 实现 `getScript()`、`getScriptVersions()`、`listScripts()` 方法
    - 持久化到 MySQL scripts 表（content 字段存储完整 JSON）
    - _需求: 3.9_

  - [ ] 7.3 实现标签自动生成
    - 创建 `packages/server/src/services/tag.service.ts`
    - 实现 `autoGenerateTags(script)` 方法：根据 Config 自动生成游戏类型、年龄段、玩家人数、时代背景、主题风格标签
    - 实现 `addCustomTag()`、`removeTag()`、`searchByTags()` 方法
    - 创建 `packages/server/src/routes/tags.ts`，实现标签相关 REST API
    - _需求: 3.10 (标签), 9.5_

  - [ ] 7.4 实现反馈驱动优化
    - 实现 `optimizeWithFeedback(scriptId, feedback)` 方法：基于聚合反馈数据生成优化 prompt，调用 LLM 生成新版本
    - 新版本号自动递增（v1.0 → v1.1），原版本保留不变
    - _需求: 3.10 (原8 版本), 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 7.5 实现剧本生成 REST API
    - 创建 `packages/server/src/routes/scripts.ts`
    - 实现 POST /api/scripts/generate、GET /api/scripts、GET /api/scripts/:id、GET /api/scripts/:id/versions、POST /api/scripts/:id/optimize
    - 实现 GET /api/scripts/search（支持标签组合查询）
    - _需求: 3.1, 9.5_

  - [ ]* 7.6 编写剧本生成属性测试
    - **Property 3: 剧本生成玩家手册数量一致性** — 对任意有效 Config（playerCount=N），生成的 playerHandbooks.length === N
    - **Property 4: 线索分发完整性** — DM_Handbook 中 clueDistribution 引用的每个 clueId 在 Material 线索卡中存在，反之亦然
    - **Property 5: 分支结构可达性** — 从起始节点出发，任意投票组合都能到达至少一个 Ending
    - **Property 6: 玩家手册信息隔离** — 任意两个 PlayerHandbook 的 secrets 与对方可见内容无交集
    - **Property 10: Script JSON往返一致性** — deserializeScript(serializeScript(script)) 语义等价于原始 script
    - **验证需求: 3.2, 3.4, 3.7, 3.8, 3.9, 5.2, 6.3**

- [ ] 8. 检查点 - 生成引擎验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 9. 玩家账户系统（AccountService）
  - [ ] 9.1 实现账户注册与登录
    - 创建 `packages/server/src/services/account.service.ts`
    - 实现 `register()` 方法：邮箱注册，密码哈希存储
    - 实现 `login()` 方法：验证凭据，生成 JWT token，存储到 Redis（TTL 24h）
    - 创建 `packages/server/src/middleware/auth.ts`，实现 JWT 认证中间件
    - _需求: 12.1, 12.4_

  - [ ] 9.2 实现账户管理与游戏历史
    - 实现 `getProfile()`、`updateProfile()`、`getGameHistory()` 方法
    - 创建 `packages/server/src/routes/auth.ts`（POST /api/auth/register, POST /api/auth/login）
    - 创建 `packages/server/src/routes/account.ts`（GET/PUT /api/account/profile, GET /api/account/history, GET /api/account/achievements, GET /api/account/collection）
    - _需求: 12.2, 12.3, 12.5_

  - [ ]* 9.3 编写账户服务单元测试
    - 测试注册邮箱唯一性校验
    - 测试登录凭据验证
    - 测试 JWT token 生成与验证
    - _需求: 12.1, 12.4_

- [ ] 10. 游戏会话服务（SessionService）
  - [ ] 10.1 实现会话创建与加入
    - 创建 `packages/server/src/services/session.service.ts`
    - 实现 `create()` 方法：从 Script_Repository 选择剧本，创建会话，生成二维码 URL
    - 实现 `join()` 方法：通过会话 ID 加入，更新 Redis 玩家列表
    - 实现 `generateQRCode()` 方法：生成包含会话链接的二维码
    - _需求: 7.1, 7.2_

  - [ ] 10.2 实现选角与游戏启动
    - 实现 `selectCharacter()` 方法：校验角色未被选择，标记已选
    - 实现 `startGame()` 方法：校验所有玩家已选角且已准备，初始化 AI_DM
    - 实现 `getSession()` 方法
    - _需求: 7.3, 7.4_

  - [ ] 10.3 实现会话 REST API
    - 创建 `packages/server/src/routes/sessions.ts`
    - 实现 POST /api/sessions、GET /api/sessions/:id、GET /api/sessions/:id/qrcode
    - _需求: 7.1, 7.11_

- [ ] 11. WebSocket 实时通信
  - [ ] 11.1 实现 WebSocket 服务端
    - 创建 `packages/server/src/websocket/handler.ts`
    - 创建 `packages/server/src/websocket/events.ts`
    - 处理 ClientEvent：join_session、select_character、ready、chat_message、vote、ask_dm、submit_suggestion
    - 广播 ServerEvent：player_joined、player_left、character_selected、game_started、round_update、clue_received、chat_message、vote_initiated、vote_result、branch_outcome、dm_speech、game_ended、video_play、error
    - 使用 Redis 存储实时聊天记录和投票状态
    - _需求: 7.5, 7.8, 7.9_

  - [ ] 11.2 实现前端 WebSocket 客户端
    - 创建 `packages/client/src/composables/useWebSocket.ts`
    - 实现连接管理、事件发送、事件监听、自动重连
    - _需求: 7.5_

- [ ] 12. AI DM 服务（AIDMService）
  - [ ] 12.1 实现 AI DM 核心逻辑
    - 创建 `packages/server/src/services/ai-dm.service.ts`
    - 实现 `initialize()` 方法：加载 DM_Handbook，初始化游戏状态
    - 实现 `advanceRound()` 方法：按轮次流程推进游戏（阅读→搜证→推证）
    - 实现 `distributeClues()` 方法：根据线索分发表在正确时机分发线索
    - 实现 `initiateVote()` 和 `processVoteResult()` 方法：发起投票，根据结果选择分支
    - 实现 `answerQuestion()` 方法：根据 DM_Handbook 信息范围回答玩家提问
    - 实现 `generatePlayerEvaluation()` 方法：生成每位玩家的个人评价
    - _需求: 10.1, 10.2, 10.3, 10.6, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [ ]* 12.2 编写 AI DM 单元测试
    - 测试线索分发时机正确性
    - 测试投票结果分支选择逻辑
    - 测试信息范围控制（不泄露秘密信息）
    - _需求: 10.2, 10.3, 10.6_

- [ ] 13. 检查点 - 游戏核心流程验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 14. 反馈系统（FeedbackService）
  - [ ] 14.1 实现评价提交与汇总
    - 创建 `packages/server/src/services/feedback.service.ts`
    - 实现 `submitFeedback()` 方法：校验评分范围 1-10，关联 Session 和 Script 存储
    - 实现 `submitLiveSuggestion()` 方法：存储实时建议
    - 实现 `getAggregatedFeedback()` 方法：计算各维度平均分，识别低分维度（<6分）
    - _需求: 8.1, 8.2, 8.3_

  - [ ] 14.2 实现自动优化触发
    - 实现 `checkAutoOptimizeTrigger()` 方法：检查评价数量 ≥ 5 且任一维度平均分 < 6
    - 实现 `triggerAutoOptimize()` 方法：调用 GeneratorService.optimizeWithFeedback()，通知创建者
    - 创建 `packages/server/src/routes/feedback.ts`，实现 POST /api/feedback、GET /api/feedback/script/:id
    - _需求: 8.6, 8.7, 8.8, 8.9_

  - [ ]* 14.3 编写评分范围属性测试
    - **Property 7: 评分范围有效性**
    - 使用 fast-check 生成任意评分输入，验证合法评分（1-10）被接受，非法评分被拒绝
    - **验证需求: 8.2**

  - [ ]* 14.4 编写版本递增属性测试
    - **Property 8: 版本递增不可变性**
    - 使用 fast-check 生成版本历史序列，验证版本号严格递增且旧版本内容不变
    - **验证需求: 3.10, 8.8**

- [ ] 15. 排行榜服务（LeaderboardService）
  - [ ] 15.1 实现排行榜逻辑
    - 创建 `packages/server/src/services/leaderboard.service.ts`
    - 实现 `getRankings()` 方法：从 Redis Sorted Set 读取排名，游玩次数 < 3 标记为"评分待定"
    - 实现 `recalculate()` 方法：重新计算 Script 平均分并更新 Redis
    - 创建 `packages/server/src/routes/leaderboard.ts`，实现 GET /api/leaderboard（支持标签筛选）
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. 成就与收藏服务
  - [ ] 16.1 实现成就系统
    - 创建 `packages/server/src/services/achievement.service.ts`
    - 实现 `checkAndUnlock()` 方法：检查游玩次数里程碑（1/5/10/25/50次）和特殊条件（推理评分≥8）
    - 实现 `getUnlocked()` 和 `getAllAchievements()` 方法
    - 初始化成就定义数据（首次游玩、初入江湖、推理达人、侦探大师、传奇侦探、明察秋毫、逻辑之王）
    - _需求: 13.3, 13.4, 13.5_

  - [ ] 16.2 实现收藏系统
    - 创建 `packages/server/src/services/collection.service.ts`
    - 实现 `unlockItems()` 方法：游戏结束后自动解锁结局卡和角色卡
    - 实现 `getCollection()` 和 `getScriptProgress()` 方法
    - _需求: 13.1, 13.2, 13.6_

- [ ] 17. 插件系统与资源存储
  - [ ] 17.1 实现插件管理器
    - 创建 `packages/server/src/plugins/plugin-manager.ts`
    - 实现 `loadPlugins()` 方法：从 plugins.json 配置文件加载和初始化插件
    - 实现 `getPlugin()`、`getEnabledPlugins()`、`isPluginEnabled()` 方法
    - 插件调用失败时记录错误日志并回退到默认行为
    - _需求: 15.1, 15.4, 15.5_

  - [ ] 17.2 实现存储插件
    - 创建 `packages/server/src/plugins/storage/local-storage.plugin.ts`（默认本地存储）
    - 创建 `packages/server/src/plugins/storage/tencent-cos.plugin.ts`（腾讯COS插件骨架）
    - 创建 `packages/server/src/services/asset-storage.service.ts`，实现统一资源存取接口
    - _需求: 15.2, 15.3_

  - [ ] 17.3 实现 TTS 语音服务（双模式）
    - 创建 `packages/server/src/services/tts.service.ts`
    - 实现 `preGenerateForScript()` 方法：为 DM_Handbook 固定叙述文本预生成语音
    - 实现 `speakRealtime()` 方法：实时 TTS 流式生成
    - 实现 `speak()` 方法：智能模式（优先实时，延迟>2秒回退到预生成/文字）
    - 创建 `packages/server/src/plugins/tts/placeholder.plugin.ts`（TTS 插件占位实现）
    - _需求: 10.4, 10.5, 10.7_

  - [ ] 17.4 创建多媒体生成服务骨架
    - 创建 `packages/server/src/services/media-generation.service.ts`
    - 创建 `packages/server/src/plugins/image-gen/placeholder.plugin.ts`
    - 创建 `packages/server/src/plugins/music-gen/placeholder.plugin.ts`
    - 创建 `packages/server/src/plugins/video-gen/placeholder.plugin.ts`
    - 实现占位接口，标记为可选功能
    - _需求: 14.1-14.6, 16.1-16.6_

  - [ ] 17.5 创建插件配置文件
    - 创建 `packages/server/src/plugins.json`，定义所有插件的注册配置（默认仅启用本地存储）
    - _需求: 15.4_

- [ ] 18. 检查点 - 后端服务完整性验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 19. 后端国际化支持
  - [ ] 19.1 实现后端 i18n 中间件与语言包
    - 创建 `packages/server/src/middleware/i18n.ts`，根据请求 Accept-Language 或查询参数选择语言
    - 创建 `packages/server/src/i18n/zh.json` 和 `packages/server/src/i18n/en.json`，包含错误信息和提示文本
    - 创建 `packages/server/src/routes/i18n.ts`，实现 GET /api/i18n/:locale
    - _需求: 18.3, 18.5_

- [ ] 20. 前端页面实现 - 认证与账户
  - [ ] 20.1 实现登录与注册页面
    - 创建 `packages/client/src/views/Login.vue` 和 `packages/client/src/views/Register.vue`
    - 创建 `packages/client/src/stores/auth.ts`（Pinia store，管理 token 和用户状态）
    - 实现表单校验、API 调用、登录状态持久化
    - _需求: 12.1, 12.4_

  - [ ] 20.2 实现个人主页
    - 创建 `packages/client/src/views/Profile.vue`
    - 创建 `packages/client/src/stores/account.ts`
    - 展示昵称、头像、游戏统计、游戏历史、成就徽章、收藏品列表
    - 支持修改昵称和头像
    - _需求: 12.2, 12.3, 12.5, 13.6_

  - [ ] 20.3 实现成就与收藏页面
    - 创建 `packages/client/src/views/Achievements.vue`
    - 展示所有成就（已解锁/未解锁）和收藏品（结局卡/角色卡）
    - _需求: 13.1-13.6_

- [ ] 21. 前端页面实现 - 剧本生成
  - [ ] 21.1 实现剧本配置表单
    - 创建 `packages/client/src/views/ScriptCreate.vue`
    - 创建 `packages/client/src/components/ConfigForm.vue`
    - 实现参数配置界面：玩家人数选择（1-6）、时长选择（2-6小时）、游戏类型选择（本格/新本格/变格）、年龄段选择、还原/推理比例滑块（联动，和为100%）、背景文本输入
    - 前端参数校验 + 提交生成请求
    - _需求: 1.1, 1.2, 1.3, 1.8_

  - [ ] 21.2 实现剧本列表与详情页
    - 创建 `packages/client/src/views/ScriptList.vue` 和 `packages/client/src/views/ScriptDetail.vue`
    - 创建 `packages/client/src/stores/script.ts`
    - 创建 `packages/client/src/components/TagFilter.vue`（标签筛选组件）
    - 展示剧本列表（支持标签筛选和搜索）、剧本详情（含版本历史）
    - _需求: 7.1, 9.5_

- [ ] 22. 前端页面实现 - 游戏流程
  - [ ] 22.1 实现游戏房间页面
    - 创建 `packages/client/src/views/GameRoom.vue`
    - 创建 `packages/client/src/components/QRCode.vue`（二维码组件）
    - 创建 `packages/client/src/components/CharacterSelect.vue`（选角组件）
    - 展示房间二维码、已加入玩家列表、角色选择界面、准备/开始按钮
    - _需求: 7.1, 7.2, 7.3, 7.4_

  - [ ] 22.2 实现游戏进行页面
    - 创建 `packages/client/src/views/GamePlay.vue`
    - 创建 `packages/client/src/stores/game.ts`（Pinia store，管理游戏实时状态）
    - 创建 `packages/client/src/components/ChatPanel.vue`（实时聊天组件）
    - 创建 `packages/client/src/components/VotePanel.vue`（投票组件）
    - 创建 `packages/client/src/components/ClueCard.vue`（线索卡展示组件）
    - 创建 `packages/client/src/components/PlayerHandbook.vue`（玩家手册展示组件）
    - 创建 `packages/client/src/components/VideoPlayer.vue`（视频播放组件）
    - 创建 `packages/client/src/composables/useAudio.ts`（音频播放 composable）
    - 集成 WebSocket 实时通信，展示游戏阶段、聊天、线索、投票、AI DM 语音/文字
    - _需求: 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ] 22.3 实现游戏结果页面
    - 创建 `packages/client/src/views/GameResult.vue`
    - 创建 `packages/client/src/components/FeedbackForm.vue`（评价表单组件）
    - 展示结局叙述、真相还原、每位玩家个人评价
    - 集成评价表单（剧情/推理难度/角色体验/整体满意度评分 + 文字评价）
    - 集成建议提交入口
    - _需求: 7.10 (原8), 7.9 (原9, 10), 7.11, 8.1_

- [ ] 23. 前端页面实现 - 排行榜与首页
  - [ ] 23.1 实现排行榜页面
    - 创建 `packages/client/src/views/Leaderboard.vue`
    - 展示剧本排名列表（名称、类型、人数、评分、游玩次数）
    - 游玩次数 < 3 显示"评分待定"
    - 支持标签筛选
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 23.2 实现首页
    - 创建 `packages/client/src/views/Home.vue`
    - 展示热门剧本、最新剧本、快速创建入口
    - _需求: 7.1_

- [ ] 24. 前端响应式布局与国际化
  - [ ] 24.1 实现响应式布局
    - 创建 `packages/client/src/styles/main.css`，实现手机、iPad、电脑三种屏幕适配
    - 所有页面和组件支持响应式布局
    - _需求: 7.12_

  - [ ] 24.2 完善前端国际化
    - 完善 `packages/client/src/i18n/zh.json` 和 `packages/client/src/i18n/en.json` 语言包
    - 创建 `packages/client/src/composables/useI18n.ts`（语言切换 composable）
    - 所有界面文本通过 Vue I18n 管理，不硬编码
    - 实现语言切换功能
    - _需求: 18.1, 18.2, 18.4, 18.5_

- [ ] 25. 前端路由配置
  - [ ] 25.1 完善路由与导航守卫
    - 更新 `packages/client/src/router/index.ts`
    - 配置所有页面路由，实现登录守卫（未登录跳转登录页）
    - _需求: 12.4_

- [ ] 26. 检查点 - 前端完整性验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 27. 集成联调与最终验证
  - [ ] 27.1 前后端集成联调
    - 验证所有 REST API 端点与前端页面的数据交互
    - 验证 WebSocket 实时通信在游戏流程中的完整性
    - 验证 Docker Compose 一键启动所有服务
    - _需求: 17.3_

  - [ ]* 27.2 编写集成测试
    - 使用 Supertest 测试关键 API 流程（注册→登录→创建配置→生成剧本→创建会话→提交评价）
    - _需求: 全部_

- [ ] 28. 最终检查点 - 全部测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 29. 新增共享类型定义（AI工具链）
  - [ ] 29.1 定义AI工具链相关类型
    - 创建 `packages/shared/src/types/interview.ts`：InterviewSession、InterviewQA、InterviewDimension、InterviewTemplateContent
    - 创建 `packages/shared/src/types/prompt-template.ts`：PromptTemplate、PromptVersion、PromptCategory、PromptVariable、PromptRenderResult
    - 创建 `packages/shared/src/types/few-shot.ts`：FewShotExample
    - 创建 `packages/shared/src/types/reasoning-chain.ts`：ReasoningChain、ReasoningStep
    - 创建 `packages/shared/src/types/token-usage.ts`：TokenUsageRecord、LLMCallType、TokenUsageStats
    - 创建 `packages/shared/src/types/ab-test.ts`：ABTest、ABTestVariant、ABTestResult
    - 更新 `packages/shared/src/index.ts` 统一导出
    - _需求: 27.1, 29.1, 30.1, 30.4, 31.1, 32.1_

- [ ] 30. 数据库迁移（新增表）
  - [ ] 30.1 创建新增表的迁移脚本
    - 创建迁移文件，包含以下新表：interview_sessions、prompt_templates、prompt_versions、few_shot_examples、reasoning_chains、token_usage_records、ab_tests、ab_test_feedbacks、script_generation_records
    - 更新 Redis 数据结构：interview状态、A/B测试计数、Token每日累计
    - _需求: 27.9, 29.2, 30.1, 31.1, 32.1_

- [ ] 31. 玩家评价权重服务（PlayerRatingWeightService）
  - [ ] 31.1 实现玩家评价权重计算
    - 创建 `packages/server/src/services/player-rating-weight.service.ts`
    - 实现 `calculateWeight(gamesPlayed)` 方法：根据游玩次数分级返回权重（≥25次→1.5，≥10次→1.2，≥5次→1.0，<5次→0.7）
    - 实现 `calculateWeightedAverage(feedbacks, dimension)` 方法：计算加权平均评分
    - 实现 `getWeightedFeedbacks(scriptId)` 方法：查询反馈并关联玩家游玩次数
    - _需求: 8.10, 9.6, 22.8_

  - [ ] 31.2 集成玩家评价权重到现有服务
    - 更新 `FeedbackService.getAggregatedFeedback()` 使用加权平均
    - 更新 `LeaderboardService.recalculate()` 使用加权平均评分
    - 更新 `LearningPipeline.calculateCompositeScore()` 使用加权综合分数
    - _需求: 8.10, 9.6, 22.8_

  - [ ]* 31.3 编写玩家评价权重属性测试
    - **Property 30: 玩家评价权重计算**
    - 使用 fast-check 生成任意游玩次数，验证权重分级正确；生成任意反馈集合，验证加权平均公式正确
    - **验证需求: 8.10, 9.6, 22.8**

- [ ] 32. 提示词模板管理服务（PromptTemplateService）
  - [ ] 32.1 实现提示词模板CRUD与版本管理
    - 创建 `packages/server/src/services/prompt-template.service.ts`
    - 实现 `create()` 方法：创建模板，分配唯一ID和初始版本v1
    - 实现 `updateContent()` 方法：创建新版本记录，版本号自动递增
    - 实现 `getVersionHistory()` 和 `rollbackToVersion()` 方法
    - 实现 `getActiveVersion()` 和 `getByCategory()` 方法
    - 实现 `serialize()` 和 `deserialize()` 方法
    - _需求: 29.1, 29.2, 29.3, 29.5, 29.7_

  - [ ] 32.2 实现提示词模板变量渲染
    - 实现 `render(templateId, variables)` 方法：替换 {{variable}} 占位符
    - 处理必填变量缺失（返回错误）、可选变量缺失（使用默认值）
    - _需求: 29.6_

  - [ ] 32.3 实现提示词模板 REST API
    - 创建 `packages/server/src/routes/prompt-templates.ts`
    - 实现 GET/POST /api/prompt-templates、GET/PUT /api/prompt-templates/:id、GET /api/prompt-templates/:id/versions、POST /api/prompt-templates/:id/rollback、POST /api/prompt-templates/:id/render
    - _需求: 29.1-29.7_

  - [ ]* 32.4 编写提示词模板属性测试
    - **Property 25: 提示词模板版本管理**
    - 使用 fast-check 生成任意更新序列，验证版本号严格递增且历史保留
    - **Property 26: 提示词模板变量渲染**
    - 使用 fast-check 生成任意模板和变量集合，验证渲染正确性
    - **验证需求: 29.2, 29.3, 29.5, 29.6**

- [ ] 33. 少样本示例服务（FewShotExampleService）
  - [ ] 33.1 实现少样本示例管理
    - 创建 `packages/server/src/services/few-shot-example.service.ts`
    - 实现 CRUD 方法：create、getById、update、deprecate
    - 实现 `selectForGeneration(category, gameType, topK)` 方法：按类别和游戏类型匹配，按质量评分降序选取前K个
    - 实现 `updateQualityScore()` 方法：与知识条目有效性分数更新逻辑一致
    - 实现 `serialize()` 和 `deserialize()` 方法
    - _需求: 30.1, 30.2, 30.3, 30.6_

  - [ ] 33.2 实现少样本示例 REST API
    - 创建 `packages/server/src/routes/few-shot-examples.ts`
    - 实现 GET/POST /api/few-shot-examples、GET/PUT/DELETE /api/few-shot-examples/:id
    - _需求: 30.1, 30.2_

- [ ] 34. 推理链模式服务（ReasoningChainService）
  - [ ] 34.1 实现推理链管理
    - 创建 `packages/server/src/services/reasoning-chain.service.ts`
    - 实现 CRUD 方法：create、getById、update
    - 实现 `selectForScenario(scenario, gameType)` 方法：按适用场景和游戏类型检索匹配的推理链
    - 实现 `serialize()` 和 `deserialize()` 方法
    - _需求: 30.4, 30.5, 30.7_

  - [ ] 34.2 实现推理链 REST API
    - 创建 `packages/server/src/routes/reasoning-chains.ts`
    - 实现 GET/POST /api/reasoning-chains、GET/PUT /api/reasoning-chains/:id
    - _需求: 30.4, 30.5_

  - [ ]* 34.3 编写AI资源选取与JSON往返属性测试
    - **Property 24: AI工具链数据JSON往返一致性**
    - 使用 fast-check 生成任意 FewShotExample 和 ReasoningChain 对象，验证 serialize → deserialize 往返一致
    - **Property 27: AI资源按相关性和评分选取**
    - 使用 fast-check 生成任意示例集合和查询条件，验证选取结果匹配类别/游戏类型且按评分降序
    - **验证需求: 28.6, 29.7, 30.2, 30.5, 30.6, 30.7**

- [ ] 35. 检查点 - AI工具链基础服务验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 36. Token用量追踪服务（TokenTrackingService）
  - [ ] 36.1 实现Token用量记录与统计
    - 创建 `packages/server/src/services/token-tracking.service.ts`
    - 实现 `record()` 方法：创建 TokenUsageRecord，更新 Redis 每日累计
    - 实现 `getStats(startDate, endDate)` 方法：按调用类型、时间段聚合统计
    - 实现 `getDailyUsage()` 和 `checkThresholdAlert()` 方法
    - _需求: 31.1, 31.2, 31.3_

  - [ ] 36.2 集成Token追踪到LLM适配器
    - 更新 `LLMAdapter.send()` 方法：每次调用后自动创建 TokenUsageRecord
    - _需求: 31.1_

  - [ ] 36.3 实现Token用量 REST API
    - 创建 `packages/server/src/routes/token-usage.ts`
    - 实现 GET /api/token-usage/stats、GET /api/token-usage/daily、PUT /api/token-usage/threshold
    - _需求: 31.2, 31.3_

  - [ ]* 36.4 编写Token用量属性测试
    - **Property 28: Token用量记录完整性**
    - 使用 fast-check 生成任意 LLM 调用参数，验证记录包含所有必填字段且 promptTokens + completionTokens = totalTokens
    - **验证需求: 31.1**

- [ ] 37. A/B测试服务（ABTestService）
  - [ ] 37.1 实现A/B测试管理
    - 创建 `packages/server/src/services/ab-test.service.ts`
    - 实现 `create()` 方法：校验变体配置和流量比例（和为100%）
    - 实现 `assignVariant()` 方法：根据流量比例随机分配变体
    - 实现 `linkFeedback()` 方法：将反馈关联到对应变体
    - 实现 `getResult()` 方法：计算各变体统计数据，标注样本不足
    - 实现 `complete()` 和 `cancel()` 方法
    - _需求: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6_

  - [ ] 37.2 集成A/B测试到生成引擎
    - 更新 `GeneratorService.generate()` 方法：检查是否有运行中的 ABTest，按分配结果使用对应变体配置
    - 创建 script_generation_records 记录关联 ABTest 变体
    - _需求: 32.2, 32.3_

  - [ ] 37.3 实现A/B测试 REST API
    - 创建 `packages/server/src/routes/ab-tests.ts`
    - 实现 POST/GET /api/ab-tests、GET /api/ab-tests/:id、GET /api/ab-tests/:id/result、POST /api/ab-tests/:id/complete、POST /api/ab-tests/:id/cancel
    - _需求: 32.1, 32.4, 32.5_

  - [ ]* 37.4 编写A/B测试属性测试
    - **Property 32: A/B测试创建校验**
    - 使用 fast-check 生成任意创建输入，验证流量比例和为100%时成功，否则失败
    - **Property 31: A/B测试流量分配与反馈关联**
    - 使用 fast-check 验证大量分配结果近似指定比例，反馈正确关联到变体
    - **验证需求: 32.1, 32.2, 32.3**

- [ ] 38. 检查点 - Token追踪与A/B测试验证
  - 确保所有测试通过，如有问题请向用户确认。

- [ ] 39. AI预生成访谈服务（InterviewService）
  - [ ] 39.1 实现访谈核心逻辑
    - 创建 `packages/server/src/services/interview.service.ts`
    - 实现 `startInterview(configId)` 方法：通过 RAG 检索匹配的 InterviewTemplate，初始化 InterviewSession，生成第一个问题
    - 实现 `submitAnswer(sessionId, answer)` 方法：调用 LLM 分析回答并生成下一个追问问题；LLM 失败时使用备选问题
    - 实现 `generateSummary(sessionId)` 方法：调用 LLM 将所有问答对汇总为结构化摘要
    - 实现 `confirmSummary()` 和 `cancelInterview()` 方法
    - _需求: 27.1, 27.2, 27.3, 27.4, 27.5, 27.8_

  - [ ] 39.2 集成访谈到生成流程
    - 更新 `GeneratorService.generate()` 方法：接受可选的 interviewSessionId 参数
    - 当存在访谈摘要时，将摘要嵌入 LLM 提示词中，位置在知识条目之前
    - 创建 script_generation_records 记录关联 InterviewSession
    - _需求: 27.6, 27.7, 27.9_

  - [ ] 39.3 实现访谈模板种子数据
    - 创建默认 InterviewTemplate 种子数据（本格、新本格、变格各一套）
    - 作为 Knowledge_Entry 导入 Knowledge_Base，分类为 prompt_templates
    - _需求: 28.1, 28.2_

  - [ ] 39.4 实现访谈 REST API
    - 创建 `packages/server/src/routes/interviews.ts`
    - 实现 POST /api/interviews、POST /api/interviews/:id/answer、POST /api/interviews/:id/summary、PUT /api/interviews/:id/confirm、DELETE /api/interviews/:id、GET /api/interviews/:id
    - _需求: 27.1-27.9_

  - [ ]* 39.5 编写访谈属性测试
    - **Property 22: 访谈会话持久化往返一致性**
    - 使用 fast-check 生成任意 InterviewSession，验证存储后读取等价
    - **Property 23: 访谈模板格式校验**
    - 使用 fast-check 生成任意模板输入，验证必要字段校验正确
    - **Property 21: 访谈摘要提示词优先级**
    - 验证组装的提示词中访谈摘要出现在知识条目之前
    - **验证需求: 27.6, 27.7, 27.9, 28.5**

- [ ] 40. 集成生成引擎与AI工具链
  - [ ] 40.1 更新生成引擎提示词组装
    - 更新 `GeneratorService.generate()` 方法：
      - 从 PromptTemplateService 获取活跃版本的提示词模板
      - 从 FewShotExampleService 选取匹配的少样本示例
      - 从 ReasoningChainService 检索匹配的推理链模式
      - 组装提示词时确保总 token 数不超过上下文窗口的 80%
      - 记录使用的模板 ID 和版本号到 script_generation_records
    - _需求: 29.4, 30.2, 30.5, 31.4_

  - [ ] 40.2 更新反馈处理流程
    - 更新 `LearningPipeline.processFeedback()` 方法：
      - 通过 script_generation_records 查询使用的 FewShotExample，更新其质量评分
      - 通过 script_generation_records 查询使用的 InterviewTemplate，更新其有效性分数
    - _需求: 28.4, 30.3_

  - [ ]* 40.3 编写提示词Token预算属性测试
    - **Property 29: 提示词Token预算合规**
    - 使用 fast-check 生成任意知识条目和示例集合，验证组装的提示词不超过上下文窗口的80%
    - **验证需求: 31.4**

- [ ] 41. 前端页面实现 - AI工具链管理
  - [ ] 41.1 实现访谈页面
    - 创建 `packages/client/src/views/Interview.vue`
    - 实现交互式访谈界面：显示问题、输入回答、展示摘要、确认/修改摘要
    - 集成到剧本创建流程（ScriptCreate.vue 中添加"开始访谈"入口）
    - _需求: 27.1, 27.5_

  - [ ] 41.2 实现提示词模板管理页面
    - 创建 `packages/client/src/views/PromptTemplates.vue`
    - 展示模板列表、版本历史、模板编辑器（支持变量高亮）、渲染预览
    - _需求: 29.1-29.6_

  - [ ] 41.3 实现少样本示例管理页面
    - 创建 `packages/client/src/views/FewShotExamples.vue`
    - 展示示例列表、创建/编辑表单、质量评分展示
    - _需求: 30.1, 30.2_

  - [ ] 41.4 实现Token用量与A/B测试页面
    - 创建 `packages/client/src/views/TokenUsage.vue`：Token消耗统计仪表盘、按类型/时间段图表
    - 创建 `packages/client/src/views/ABTests.vue`：A/B测试列表、创建表单、结果对比展示
    - _需求: 31.2, 32.4_

- [ ] 42. 最终检查点 - 新功能全部测试通过
  - 确保所有新增功能的测试通过，如有问题请向用户确认。

- [ ] 43. 新增共享类型定义（设计师与经济系统）
  - [ ] 43.1 定义设计师与经济系统相关类型
    - 创建 `packages/shared/src/types/skill-card.ts`：SkillCard、CardTier、DesignerDeck、CustomDeck、CARD_TIER_POINT_RANGES
    - 创建 `packages/shared/src/types/designer.ts`：DesignerProfile、HonorTitle、DualIdentityProfile、DESIGNER_LEVEL_XP、PLAYER_LEVEL_XP、DESIGN_POINT_BUDGET
    - 创建 `packages/shared/src/types/economy.ts`：CurrencyType、TransactionType、CurrencyTransaction、UserWallet、GenerationCostEstimate、GAME_COIN_REWARDS
    - 更新 `packages/shared/src/index.ts` 统一导出
    - _需求: 33.1, 34.1, 38.1_

- [ ] 44. 数据库迁移（设计师与经济系统新增表）
  - [ ] 44.1 创建新增表的迁移脚本
    - 创建迁移文件，包含以下新表：designer_profiles、skill_cards、designer_decks、designer_deck_cards、custom_decks、user_wallets、currency_transactions、designer_leaderboard、designer_honors、designer_xp_records
    - 更新 player_accounts 表：添加 player_level、player_xp 字段
    - 更新 script_generation_records 表：添加 selected_card_ids、total_card_cost、generation_cost 字段
    - 更新 Redis 数据结构：设计师排行榜缓存、钱包缓存、设计师等级缓存
    - _需求: 33.1, 34.1, 38.1, 39.3_

- [ ] 45. 技能牌服务（SkillCardService）
  - [ ] 45.1 实现技能牌管理核心逻辑
    - 创建 `packages/server/src/services/skill-card.service.ts`
    - 实现 `getAllCards()`、`getCardById()`、`getCardsByTier()` 方法
    - 实现 `getUnlockedCards(designerLevel)` 方法：返回 requiredDesignerLevel ≤ designerLevel 的牌
    - 实现 `validateCardSelection(designerLevel, cardIds)` 方法：校验总点数不超过预算
    - 实现 `serialize()` 和 `deserialize()` 方法
    - _需求: 34.1, 34.3, 34.4, 34.5_

  - [ ] 45.2 实现 Skill 模板到技能牌迁移
    - 实现 `migrateFromSkillTemplates(templates)` 方法：将现有 SkillTemplate 转换为 SkillCard
    - 基础类别牌设为 basic 等级，高级类别设为对应更高等级
    - 创建初始技能牌种子数据，包含特色牌：打破第四堵墙（expert）、神话设定背景（advanced）、多杀手设定（expert）、时间循环（legendary）、不可靠叙述者（advanced）、密室逃脱机制（basic）
    - _需求: 34.2, 34.6_

  - [ ] 45.3 实现设计师牌库与自定义牌组
    - 实现 `getDesignerDeck()`、`unlockNewCards()` 方法
    - 实现 `createCustomDeck()`、`updateCustomDeck()`、`deleteCustomDeck()`、`getCustomDecks()` 方法
    - 校验每个设计师最多10个自定义牌组
    - _需求: 36.1, 36.2, 36.3, 36.6_

  - [ ] 45.4 实现技能牌 REST API
    - 创建 `packages/server/src/routes/skill-cards.ts`
    - 实现 GET /api/skill-cards、GET /api/skill-cards/:id、GET /api/skill-cards/unlocked、POST /api/skill-cards/validate
    - 创建 `packages/server/src/routes/designer.ts`（牌库部分）
    - 实现 GET /api/designer/deck、GET/POST/PUT/DELETE /api/designer/custom-decks
    - _需求: 34.3, 36.5, 36.7_

  - [ ]* 45.5 编写技能牌属性测试
    - **Property 33: 技能牌JSON往返一致性**
    - **Property 34: 技能牌等级点数约束**
    - **Property 35: 技能牌解锁等级过滤**
    - **Property 36: 设计点数预算计算与选牌校验**
    - 使用 fast-check 生成任意 SkillCard、设计师等级和牌选择组合，验证上述属性
    - **验证需求: 34.3, 34.4, 34.5, 35.1, 35.3, 36.1**

- [ ] 46. 设计师服务（DesignerService）
  - [ ] 46.1 实现设计师身份与双身份系统
    - 创建 `packages/server/src/services/designer.service.ts`
    - 实现 `initializeDesigner()` 方法：首次创建剧本时自动初始化
    - 实现 `getDesignerProfile()`、`getDualIdentityProfile()` 方法
    - 实现 `addDesignerXP()`、`addPlayerXP()` 方法：含自动升级逻辑
    - 实现 `getDesignPointBudget()` 方法
    - _需求: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [ ] 46.2 实现荣誉称号与设计师成就
    - 实现 `calculateHonorTitle(level)` 方法：等级到荣誉称号映射
    - 实现 `checkAndUpdateHonorTitle()` 方法：等级提升时自动更新
    - 实现 `checkDesignerMilestones()` 方法：检查游玩次数里程碑（10/25/50/100次）和特殊里程碑（100/500/1000次）
    - _需求: 39.1, 39.2, 39.7, 37.3_

  - [ ] 46.3 实现设计师奖励逻辑
    - 实现 `processScriptPlayReward()` 方法：剧本被游玩时奖励基础5XP
    - 实现 `processHighRatingReward()` 方法：高评价（≥8分）额外10XP
    - 集成 PlayerRatingWeightService 使用加权平均分计算
    - _需求: 37.1, 37.2, 37.6_

  - [ ] 46.4 实现设计师 REST API
    - 更新 `packages/server/src/routes/designer.ts`
    - 实现 GET /api/designer/profile、POST /api/designer/initialize、GET /api/designer/dual-identity、GET /api/designer/stats
    - _需求: 33.6, 37.5_

  - [ ]* 46.5 编写设计师服务属性测试
    - **Property 37: 等级升级阈值计算**
    - **Property 38: 荣誉称号等级映射**
    - **Property 45: 设计师经验值奖励**
    - 使用 fast-check 生成任意等级和经验值，验证升级逻辑、荣誉称号映射和奖励计算
    - **验证需求: 33.4, 33.5, 37.1, 37.2, 39.1, 39.2**

- [ ] 47. 经济服务（EconomyService）
  - [ ] 47.1 实现钱包与双币管理
    - 创建 `packages/server/src/services/economy.service.ts`
    - 实现 `getWallet()`、`initializeWallet()` 方法
    - 实现 `addGameCoins()` 方法：游玩奖励（基础50 + 高评价加成30）
    - 实现 `recharge()` 方法：真实货币充值
    - 实现 `getTransactions()` 方法：交易记录查询
    - _需求: 38.1, 38.2, 38.3, 38.8_

  - [ ] 47.2 实现生成费用计算与扣费
    - 实现 `calculateGenerationCost(cardIds, config)` 方法：基于牌复杂度和预估Token计算费用
    - 实现 `hasEnoughRealCurrency()` 方法：余额检查
    - 实现 `consumeForGeneration()` 方法：扣除真实货币
    - 实现 `refundGeneration()` 方法：生成失败退还
    - _需求: 38.4, 38.5, 38.7, 38.9_

  - [ ] 47.3 集成经济服务到生成引擎
    - 更新 `GeneratorService.generate()` 方法：生成前检查余额、扣费，失败时退还
    - 更新 `SessionService` 或游戏结束流程：完成游戏后发放游戏币奖励
    - _需求: 38.4, 38.2_

  - [ ] 47.4 实现经济 REST API
    - 创建 `packages/server/src/routes/economy.ts`
    - 实现 GET /api/economy/wallet、POST /api/economy/recharge、GET /api/economy/transactions、POST /api/economy/estimate-cost
    - _需求: 38.3, 38.8_

  - [ ]* 47.5 编写经济服务属性测试
    - **Property 40: 双币分离不变量**
    - **Property 41: 货币交易记录完整性**
    - **Property 42: 生成费用余额校验**
    - **Property 43: 生成失败退还**
    - 使用 fast-check 生成任意钱包状态和交易操作，验证双币分离、交易记录一致性、余额校验和退还逻辑
    - **验证需求: 38.1, 38.4, 38.5, 38.6, 38.7, 38.9**

- [ ] 48. 设计师排行榜服务（DesignerLeaderboardService）
  - [ ] 48.1 实现设计师排行榜
    - 创建 `packages/server/src/services/designer-leaderboard.service.ts`
    - 实现 `getRankings()` 方法：从 Redis Sorted Set 或 MySQL 读取排名
    - 实现 `recalculate()` 方法：计算排名分数 = 游玩次数×0.4 + 平均评分×30×0.4 + 创建数×10×0.2
    - 实现 `recalculateAll()` 和 `getUserRank()` 方法
    - 创建 `packages/server/src/routes/designer.ts`（排行榜部分）
    - 实现 GET /api/designer/leaderboard
    - _需求: 39.3, 39.4, 39.5_

  - [ ]* 48.2 编写设计师排行榜属性测试
    - **Property 39: 设计师排行榜分数计算**
    - 使用 fast-check 生成任意设计师统计数据，验证排名分数公式和排序正确性
    - **验证需求: 39.3**

- [ ] 49. 检查点 - 设计师与经济系统验证
  - 确保所有新增服务的测试通过，如有问题请向用户确认。

- [ ] 50. 集成设计师与经济系统到现有服务
  - [ ] 50.1 更新账户服务支持双身份
    - 更新 `AccountService` 的 `getProfile()` 方法：返回 playerLevel、playerXp 字段
    - 新增 `getDualIdentityProfile()` 方法：聚合玩家和设计师身份信息
    - 更新 `packages/server/src/routes/account.ts`：新增 GET /api/account/dual-identity
    - _需求: 33.1, 33.6_

  - [ ] 50.2 更新生成引擎支持技能牌
    - 更新 `GeneratorService.generate()` 方法：
      - 接受可选的 selectedCardIds 参数
      - 当有选牌时，将牌的 effectContent 嵌入 LLM 提示词，替代按游戏类型自动选择
      - 当无选牌时，回退到原有 SkillService 逻辑
      - 生成前调用 EconomyService 扣费，失败时退还
    - 更新 script_generation_records 记录选牌信息
    - _需求: 35.4, 35.5, 35.6_

  - [ ] 50.3 更新游戏结束流程
    - 更新游戏结束处理逻辑：
      - 为玩家增加玩家经验值（调用 DesignerService.addPlayerXP）
      - 为玩家发放游戏币奖励（调用 EconomyService.addGameCoins）
      - 为剧本设计师发放设计师经验值奖励（调用 DesignerService.processScriptPlayReward）
      - 检查并更新设计师荣誉称号和排行榜
    - _需求: 33.3, 37.1, 38.2_

  - [ ] 50.4 实现玩家到设计师过渡引导
    - 更新 `AccountService` 或创建新的过渡引导逻辑：
      - 游玩次数达到10次时标记"可引导"状态
      - 首次设计完成时发放奖励（50XP + 200游戏币）
    - 更新相关 REST API 返回过渡引导状态
    - _需求: 40.1, 40.3_

- [ ] 51. 前端页面实现 - 设计师与经济系统
  - [ ] 51.1 实现设计师个人页面
    - 创建 `packages/client/src/views/DesignerProfile.vue`
    - 展示设计师等级、经验值进度、荣誉称号、创建剧本数、被游玩次数、平均评分
    - 展示设计师成就徽章
    - _需求: 33.6, 37.5, 39.6_

  - [ ] 51.2 实现技能牌选择页面
    - 创建 `packages/client/src/views/SkillCards.vue`
    - 展示所有技能牌（已解锁/未解锁），支持按等级和类别筛选
    - 集成到剧本创建流程：选牌界面、实时点数显示、预算校验
    - 支持从自定义牌组快速加载
    - _需求: 34.3, 35.2, 36.7_

  - [ ] 51.3 实现钱包页面
    - 创建 `packages/client/src/views/Wallet.vue`
    - 展示游戏币余额和真实货币余额
    - 展示交易记录列表（支持按货币类型筛选）
    - 充值入口
    - _需求: 38.8_

  - [ ] 51.4 实现设计师排行榜页面
    - 创建 `packages/client/src/views/DesignerLeaderboard.vue`
    - 展示设计师排名列表（昵称、荣誉称号、等级、剧本数、游玩次数、评分）
    - _需求: 39.4_

  - [ ] 51.5 更新个人主页支持双身份
    - 更新 `packages/client/src/views/Profile.vue`
    - 分别展示玩家身份信息和设计师身份信息
    - 添加"成为设计师"引导入口（当游玩次数≥10且未激活设计师身份时）
    - _需求: 33.6, 40.1, 40.2_

  - [ ] 51.6 更新剧本创建流程
    - 更新 `packages/client/src/views/ScriptCreate.vue`
    - 在配置表单后添加技能牌选择步骤
    - 添加费用预估显示和余额检查
    - _需求: 35.2, 38.4_

- [ ] 52. 最终检查点 - 设计师与经济系统全部测试通过
  - 确保所有新增功能的测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的子任务为可选测试任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保需求可追溯
- 检查点任务用于增量验证，确保每个阶段的代码质量
- 属性测试验证设计文档中定义的正确性属性（Property 1-45）
- 单元测试覆盖具体示例和边界情况
- 需求 14（AI视频生成）和需求 16（AI多媒体生成）标记为可选功能，任务 17.4 仅创建骨架
- 任务 29-42 为AI工具链功能：AI预生成访谈、提示词模板管理、少样本示例、推理链、Token追踪、A/B测试、玩家评价权重
- 任务 43-52 为新增功能：技能牌系统、设计师双身份系统、双币经济系统、设计师荣誉与排行榜系统、玩家到设计师过渡引导
