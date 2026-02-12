# 项目结构与测试框架

本文档包含项目的目录结构和测试框架配置。

---

## 项目结构

```
murder-mystery-ai/
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── packages/
│   ├── shared/                    # 共享类型定义
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── config.ts      # ScriptConfig, GameType, AgeGroup
│   │       │   ├── script.ts      # Script, DMHandbook, PlayerHandbook, Material
│   │       │   ├── session.ts     # GameSession, SessionPlayer
│   │       │   ├── feedback.ts    # Feedback, LiveSuggestion
│   │       │   ├── account.ts     # PlayerAccount, Achievement, CollectionItem
│   │       │   ├── knowledge.ts   # KnowledgeEntry, KnowledgeCategory, KnowledgeSnapshot, FeedbackKnowledgeLink
│   │       │   ├── tag.ts         # Tag, TagCategory, ScriptTag
│   │       │   ├── asset.ts       # Asset, AssetType
│   │       │   ├── plugin.ts      # IPlugin, PluginType, PluginConfig
│   │       │   ├── websocket.ts   # ClientEvent, ServerEvent
│   │       │   ├── interview.ts   # InterviewSession, InterviewQA, InterviewDimension
│   │       │   ├── prompt-template.ts # PromptTemplate, PromptVersion, PromptCategory
│   │       │   ├── few-shot.ts    # FewShotExample
│   │       │   ├── reasoning-chain.ts # ReasoningChain, ReasoningStep
│   │       │   ├── token-usage.ts # TokenUsageRecord, LLMCallType
│   │       │   └── ab-test.ts     # ABTest, ABTestVariant, ABTestResult
│   │       │   ├── skill-card.ts  # SkillCard, CardTier, DesignerDeck, CustomDeck
│   │       │   ├── designer.ts    # DesignerProfile, HonorTitle, DualIdentityProfile
│   │       │   └── economy.ts     # CurrencyType, CurrencyTransaction, UserWallet
│   │       └── index.ts
│   ├── server/                    # 后端
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts             # Express应用入口
│   │       ├── config/
│   │       │   └── index.ts       # 环境变量配置
│   │       ├── routes/
│   │       │   ├── auth.ts
│   │       │   ├── account.ts
│   │       │   ├── configs.ts
│   │       │   ├── scripts.ts
│   │       │   ├── sessions.ts
│   │       │   ├── feedback.ts
│   │       │   ├── leaderboard.ts
│   │       │   ├── tags.ts
│   │       │   ├── i18n.ts
│   │       │   ├── interviews.ts
│   │       │   ├── prompt-templates.ts
│   │       │   ├── few-shot-examples.ts
│   │       │   ├── reasoning-chains.ts
│   │       │   ├── token-usage.ts
│   │       │   ├── ab-tests.ts
│   │       │   ├── knowledge.ts
│   │       │   ├── skill-cards.ts
│   │       │   ├── designer.ts
│   │       │   └── economy.ts
│   │       ├── services/
│   │       │   ├── config.service.ts
│   │       │   ├── skill.service.ts
│   │       │   ├── generator.service.ts
│   │       │   ├── knowledge-base.service.ts
│   │       │   ├── rag.service.ts
│   │       │   ├── learning-pipeline.service.ts
│   │       │   ├── session.service.ts
│   │       │   ├── ai-dm.service.ts
│   │       │   ├── feedback.service.ts
│   │       │   ├── account.service.ts
│   │       │   ├── achievement.service.ts
│   │       │   ├── collection.service.ts
│   │       │   ├── leaderboard.service.ts
│   │       │   ├── tag.service.ts
│   │       │   ├── asset-storage.service.ts
│   │       │   ├── tts.service.ts
│   │       │   ├── media-generation.service.ts
│   │       │   ├── interview.service.ts
│   │       │   ├── prompt-template.service.ts
│   │       │   ├── few-shot-example.service.ts
│   │       │   ├── reasoning-chain.service.ts
│   │       │   ├── token-tracking.service.ts
│   │       │   ├── ab-test.service.ts
│   │       │   ├── player-rating-weight.service.ts
│   │       │   ├── skill-card.service.ts
│   │       │   ├── designer.service.ts
│   │       │   ├── economy.service.ts
│   │       │   └── designer-leaderboard.service.ts
│   │       ├── adapters/
│   │       │   ├── llm-adapter.ts
│   │       │   ├── llm-adapter.interface.ts
│   │       │   ├── embedding-adapter.ts
│   │       │   └── embedding-adapter.interface.ts
│   │       ├── knowledge/
│   │       │   └── vector-store.ts
│   │       ├── plugins/
│   │       │   ├── plugin-manager.ts
│   │       │   ├── storage/
│   │       │   │   ├── local-storage.plugin.ts
│   │       │   │   └── tencent-cos.plugin.ts
│   │       │   ├── image-gen/
│   │       │   │   └── placeholder.plugin.ts
│   │       │   ├── music-gen/
│   │       │   │   └── placeholder.plugin.ts
│   │       │   ├── video-gen/
│   │       │   │   └── placeholder.plugin.ts
│   │       │   └── tts/
│   │       │       └── placeholder.plugin.ts
│   │       ├── websocket/
│   │       │   ├── handler.ts
│   │       │   └── events.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   └── i18n.ts
│   │       ├── db/
│   │       │   ├── mysql.ts
│   │       │   ├── redis.ts
│   │       │   └── migrations/
│   │       ├── skills/            # Skill模板JSON文件
│   │       │   ├── honkaku/
│   │       │   ├── shin-honkaku/
│   │       │   └── henkaku/
│   │       ├── i18n/
│   │       │   ├── zh.json
│   │       │   └── en.json
│   │       └── plugins.json       # 插件配置文件
│   └── client/                    # 前端
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── router/
│           │   └── index.ts
│           ├── stores/
│           │   ├── auth.ts
│           │   ├── game.ts
│           │   ├── script.ts
│           │   └── account.ts
│           ├── views/
│           │   ├── Home.vue
│           │   ├── Login.vue
│           │   ├── Register.vue
│           │   ├── Profile.vue
│           │   ├── ScriptCreate.vue
│           │   ├── ScriptList.vue
│           │   ├── ScriptDetail.vue
│           │   ├── GameRoom.vue
│           │   ├── GamePlay.vue
│           │   ├── GameResult.vue
│           │   ├── Leaderboard.vue
│           │   ├── Achievements.vue
│           │   ├── KnowledgeBase.vue
│           │   ├── Interview.vue
│           │   ├── PromptTemplates.vue
│           │   ├── FewShotExamples.vue
│           │   ├── TokenUsage.vue
│           │   ├── ABTests.vue
│           │   ├── DesignerProfile.vue
│           │   ├── SkillCards.vue
│           │   ├── Wallet.vue
│           │   └── DesignerLeaderboard.vue
│           ├── components/
│           │   ├── ConfigForm.vue
│           │   ├── CharacterSelect.vue
│           │   ├── ChatPanel.vue
│           │   ├── VotePanel.vue
│           │   ├── ClueCard.vue
│           │   ├── PlayerHandbook.vue
│           │   ├── QRCode.vue
│           │   ├── FeedbackForm.vue
│           │   ├── TagFilter.vue
│           │   └── VideoPlayer.vue
│           ├── composables/
│           │   ├── useWebSocket.ts
│           │   ├── useAudio.ts
│           │   └── useI18n.ts
│           ├── i18n/
│           │   ├── index.ts
│           │   ├── zh.json
│           │   └── en.json
│           └── styles/
│               └── main.css
```

---

## 测试框架

- **单元测试**: Vitest
- **Property-Based Testing**: fast-check + Vitest
- **E2E测试**: Playwright（前端）
- **API测试**: Supertest
- **向量存储**: hnswlib-node（进程内向量搜索）
- **Embedding**: 通过适配器接入（OpenAI text-embedding-3-small 或本地模型）
