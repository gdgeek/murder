# progression-service（用户成长）

## 职责

聚焦"用户成长"这一个关注点：双身份等级、经验值、成就、收藏、排行榜、经济系统、设计师荣誉。

## 数据库表

- `player_progression` — 玩家等级与经验值
- `designer_profiles` — 设计师身份（等级、经验值）
- `achievements` / `player_achievements` — 成就系统
- `collection_items` — 收藏品
- `user_wallets` / `currency_transactions` — 双币经济
- `designer_leaderboard` / `designer_honors` — 设计师荣誉
- `designer_xp_records` — 设计师经验记录

## REST API

### 双身份
```
GET    /api/progression/dual-identity      — 双身份信息（玩家+设计师等级、经验值）
```

### 设计师
```
POST   /api/progression/designer/initialize — 初始化设计师身份
GET    /api/progression/designer/profile    — 设计师资料
GET    /api/progression/designer/stats      — 设计师统计
GET    /api/progression/designer/leaderboard — 设计师排行榜
```

### 成就与收藏
```
GET    /api/progression/achievements        — 成就列表
GET    /api/progression/collection          — 收藏品列表
GET    /api/progression/history             — 游戏历史
```

### 经济
```
GET    /api/progression/wallet              — 钱包余额（游戏币+真实货币）
POST   /api/progression/recharge            — 充值
GET    /api/progression/transactions        — 交易记录
```

### 排行榜
```
GET    /api/progression/leaderboard         — 剧本排行榜（支持标签筛选）
```

### 内部API
```
GET    /api/internal/users/:id/designer-level — 获取设计师等级（creation调用）
POST   /api/internal/economy/consume          — 扣费（creation调用）
POST   /api/internal/economy/refund           — 退费（creation调用）
GET    /api/internal/users/:id/games-played   — 获取游玩次数（feedback调用）
POST   /api/internal/achievements/check       — 检查并解锁成就
POST   /api/internal/collection/unlock        — 解锁收藏品
POST   /api/internal/rewards/game-complete    — 游戏完成奖励（经验+游戏币）
POST   /api/internal/rewards/script-played    — 剧本被游玩奖励（设计师XP）
```

## 事件订阅
- `events:game:completed` → 发放游戏币奖励、更新玩家 XP、检查成就、解锁收藏
- `events:game:evaluation-ready` → 检查特殊成就（高评价成就）
- `events:script:played` → 更新设计师 XP
- `events:feedback:submitted` → 高评价时给设计师额外 XP
- `events:script:generated` → 记录设计师创建剧本

## 事件发布
- `events:designer:level-up` — 设计师等级提升
- `events:player:level-up` — 玩家等级提升
