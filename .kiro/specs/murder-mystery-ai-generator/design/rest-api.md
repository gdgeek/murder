# REST API 端点

本文档汇总了系统的所有REST API端点定义。

---

## 基础 REST API 端点

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
  POST   /api/scripts/generate       - 生成剧本（支持 tokenMode 参数：optimized|unlimited）
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

标签:
  GET    /api/tags                   - 获取所有标签（支持按category筛选）
  GET    /api/tags/popular           - 热门标签
  POST   /api/scripts/:id/tags      - 为剧本添加自定义标签
  DELETE /api/scripts/:id/tags/:tagId - 移除标签

剧本搜索:
  GET    /api/scripts/search?tags=tag1,tag2&gameType=honkaku&ageGroup=adult
```

---

## 扩展 REST API 端点

```
访谈:
  POST   /api/interviews                    - 开始访谈（传入configId）
  POST   /api/interviews/:id/answer         - 提交回答
  POST   /api/interviews/:id/summary        - 生成摘要
  PUT    /api/interviews/:id/confirm        - 确认摘要
  DELETE /api/interviews/:id                - 取消访谈
  GET    /api/interviews/:id                - 获取访谈会话

提示词模板:
  GET    /api/prompt-templates              - 模板列表
  POST   /api/prompt-templates              - 创建模板
  GET    /api/prompt-templates/:id          - 获取模板详情
  PUT    /api/prompt-templates/:id          - 更新模板内容（创建新版本）
  GET    /api/prompt-templates/:id/versions - 版本历史
  POST   /api/prompt-templates/:id/rollback - 回滚到指定版本
  POST   /api/prompt-templates/:id/render   - 渲染模板（传入变量）

少样本示例:
  GET    /api/few-shot-examples             - 示例列表
  POST   /api/few-shot-examples             - 创建示例
  GET    /api/few-shot-examples/:id         - 获取示例详情
  PUT    /api/few-shot-examples/:id         - 更新示例
  DELETE /api/few-shot-examples/:id         - 弃用示例

推理链:
  GET    /api/reasoning-chains              - 推理链列表
  POST   /api/reasoning-chains              - 创建推理链
  GET    /api/reasoning-chains/:id          - 获取推理链详情
  PUT    /api/reasoning-chains/:id          - 更新推理链

Token用量:
  GET    /api/token-usage/stats             - Token用量统计
  GET    /api/token-usage/daily             - 每日用量
  PUT    /api/token-usage/threshold         - 设置预警阈值

Token节省模式:
  GET    /api/token-mode                    - 获取当前全局 Token 节省模式配置
  PUT    /api/token-mode                    - 切换全局模式（optimized|unlimited）
  PUT    /api/token-mode/features           - 细粒度开关单个策略
  POST   /api/token-mode/estimate           - 对比两种模式的预估成本（传入 config）

Token模式A/B测试:
  POST   /api/token-mode/ab-tests           - 创建 Token 模式 A/B 测试
  GET    /api/token-mode/ab-tests/:id/result - 获取 Token 模式对比报告（含质量+成本+性价比）

A/B测试:
  POST   /api/ab-tests                      - 创建A/B测试
  GET    /api/ab-tests                      - 测试列表
  GET    /api/ab-tests/:id                  - 获取测试详情
  GET    /api/ab-tests/:id/result           - 获取测试结果
  POST   /api/ab-tests/:id/complete         - 结束测试（选择优胜）
  POST   /api/ab-tests/:id/cancel           - 取消测试

技能牌:
  GET    /api/skill-cards                   - 获取所有技能牌（支持按等级、类别筛选）
  GET    /api/skill-cards/:id               - 获取技能牌详情
  GET    /api/skill-cards/unlocked          - 获取当前设计师已解锁的牌
  POST   /api/skill-cards/validate          - 校验选牌（传入cardIds，返回点数消耗和预算）

设计师牌库:
  GET    /api/designer/deck                 - 获取设计师牌库
  GET    /api/designer/custom-decks         - 获取自定义牌组列表
  POST   /api/designer/custom-decks         - 创建自定义牌组
  PUT    /api/designer/custom-decks/:id     - 更新自定义牌组
  DELETE /api/designer/custom-decks/:id     - 删除自定义牌组

设计师:
  GET    /api/designer/profile              - 获取设计师身份信息
  POST   /api/designer/initialize           - 初始化设计师身份
  GET    /api/designer/dual-identity        - 获取双身份信息（玩家+设计师）
  GET    /api/designer/leaderboard          - 设计师排行榜
  GET    /api/designer/stats                - 设计师统计数据

经济:
  GET    /api/economy/wallet                - 获取钱包信息（游戏币+真实货币余额）
  POST   /api/economy/recharge              - 充值真实货币
  GET    /api/economy/transactions          - 获取交易记录（支持按货币类型筛选）
  POST   /api/economy/estimate-cost         - 预估剧本生成费用（传入cardIds和config）
```
