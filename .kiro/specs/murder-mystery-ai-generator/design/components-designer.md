# 设计师与经济系统组件

本文档包含设计师与经济系统的组件接口定义：SkillCardService、DesignerService、EconomyService、DesignerLeaderboardService，以及相关的REST API端点。

---

## 31. 技能牌服务 (SkillCardService)

管理技能牌的定义、解锁和选取，替代原有的按游戏类型自动选择Skill模板的逻辑。

```typescript
// 牌等级
enum CardTier {
  BASIC = 'basic',           // 基础
  ADVANCED = 'advanced',     // 进阶
  EXPERT = 'expert',         // 专家
  LEGENDARY = 'legendary'    // 传奇
}

// 技能牌
interface SkillCard {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  gameTypes: GameType[];
  tier: CardTier;
  pointCost: number;                // 点数消耗
  effectContent: string;            // Prompt片段（效果内容）
  requiredDesignerLevel: number;    // 解锁所需设计师等级
  createdAt: Date;
  updatedAt: Date;
}

// 牌等级对应点数范围
const CARD_TIER_POINT_RANGES: Record<CardTier, { min: number; max: number }> = {
  [CardTier.BASIC]: { min: 1, max: 2 },
  [CardTier.ADVANCED]: { min: 3, max: 4 },
  [CardTier.EXPERT]: { min: 5, max: 7 },
  [CardTier.LEGENDARY]: { min: 8, max: 10 }
};

// 设计师牌库
interface DesignerDeck {
  id: string;
  designerId: string;
  unlockedCardIds: string[];        // 已解锁的牌ID列表
  updatedAt: Date;
}

// 自定义牌组
interface CustomDeck {
  id: string;
  designerId: string;
  name: string;
  cardIds: string[];
  totalPointCost: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ISkillCardService {
  // 牌管理
  getAllCards(): Promise<SkillCard[]>;
  getCardById(id: string): Promise<SkillCard | null>;
  getUnlockedCards(designerLevel: number): Promise<SkillCard[]>;
  getCardsByTier(tier: CardTier): Promise<SkillCard[]>;

  // 牌库管理
  getDesignerDeck(designerId: string): Promise<DesignerDeck>;
  unlockNewCards(designerId: string, newLevel: number): Promise<SkillCard[]>;

  // 自定义牌组
  createCustomDeck(designerId: string, name: string, cardIds: string[]): Promise<CustomDeck>;
  updateCustomDeck(deckId: string, name: string, cardIds: string[]): Promise<CustomDeck>;
  deleteCustomDeck(deckId: string): Promise<void>;
  getCustomDecks(designerId: string): Promise<CustomDeck[]>;

  // 选牌校验
  validateCardSelection(designerLevel: number, cardIds: string[]): Promise<{
    valid: boolean;
    totalCost: number;
    budget: number;
    errors: string[];
  }>;

  // 序列化
  serialize(card: SkillCard): string;
  deserialize(json: string): SkillCard;

  // 初始化：将现有Skill模板转换为SkillCard
  migrateFromSkillTemplates(templates: SkillTemplate[]): Promise<SkillCard[]>;
}
```

---

## 32. 设计师服务 (DesignerService)

管理设计师身份、等级、经验值和双身份系统。

```typescript
// 设计师身份
interface DesignerProfile {
  id: string;
  userId: string;
  level: number;
  xp: number;
  totalScriptsCreated: number;
  totalScriptsPlayed: number;       // 剧本被游玩总次数
  avgScriptRating: number;
  honorTitle: HonorTitle;
  createdAt: Date;
  updatedAt: Date;
}

// 荣誉称号
enum HonorTitle {
  NOVICE = 'novice',               // 新手设计师 (等级1-2)
  INTERMEDIATE = 'intermediate',    // 进阶设计师 (等级3-4)
  POPULAR = 'popular',             // 人气设计师 (等级5-7)
  MASTER = 'master',               // 大师设计师 (等级8-10)
  LEGENDARY = 'legendary'          // 传奇设计师 (等级11+)
}

// 设计师等级升级阈值
const DESIGNER_LEVEL_XP = (level: number) => level * 150;

// 玩家等级升级阈值
const PLAYER_LEVEL_XP = (level: number) => level * 100;

// 设计点数预算
const DESIGN_POINT_BUDGET: Record<number, number> = {
  1: 10, 2: 13, 3: 16, 4: 20, 5: 25
  // 等级6+: 25 + (level - 5) * 3
};

function getDesignPointBudget(level: number): number {
  if (level <= 5) return DESIGN_POINT_BUDGET[level] || 10;
  return 25 + (level - 5) * 3;
}

// 双身份用户信息
interface DualIdentityProfile {
  userId: string;
  // 玩家身份
  playerLevel: number;
  playerXp: number;
  totalGamesPlayed: number;
  // 设计师身份
  designerProfile: DesignerProfile | null;  // null表示尚未激活设计师身份
}

interface IDesignerService {
  // 设计师身份管理
  initializeDesigner(userId: string): Promise<DesignerProfile>;
  getDesignerProfile(userId: string): Promise<DesignerProfile | null>;
  getDualIdentityProfile(userId: string): Promise<DualIdentityProfile>;

  // 经验值与等级
  addDesignerXP(userId: string, xp: number, reason: string): Promise<{ leveledUp: boolean; newLevel: number }>;
  addPlayerXP(userId: string, xp: number, reason: string): Promise<{ leveledUp: boolean; newLevel: number }>;
  getDesignPointBudget(userId: string): Promise<number>;

  // 荣誉称号
  calculateHonorTitle(level: number): HonorTitle;
  checkAndUpdateHonorTitle(userId: string): Promise<HonorTitle | null>;

  // 设计师奖励
  processScriptPlayReward(scriptId: string, designerUserId: string): Promise<void>;
  processHighRatingReward(scriptId: string, designerUserId: string, avgScore: number): Promise<void>;

  // 设计师成就
  checkDesignerMilestones(userId: string): Promise<Achievement[]>;
}
```

---

## 33. 经济服务 (EconomyService)

管理双币经济系统，包括游戏币和真实货币的余额管理、交易记录和生成费用计算。

```typescript
// 货币类型
enum CurrencyType {
  GAME_COIN = 'game_coin',
  REAL_CURRENCY = 'real_currency'
}

// 交易类型
enum TransactionType {
  RECHARGE = 'recharge',           // 充值（仅真实货币）
  CONSUMPTION = 'consumption',     // 消费（仅真实货币，用于生成）
  REWARD = 'reward',               // 奖励（游戏币：游玩奖励；真实货币：退还）
  REFUND = 'refund'                // 退还（生成失败退还真实货币）
}

// 货币交易记录
interface CurrencyTransaction {
  id: string;
  userId: string;
  currencyType: CurrencyType;
  transactionType: TransactionType;
  amount: number;                   // 正数表示增加，负数表示减少
  balanceBefore: number;
  balanceAfter: number;
  relatedScriptId: string | null;
  relatedSessionId: string | null;
  description: string;
  createdAt: Date;
}

// 用户钱包
interface UserWallet {
  userId: string;
  gameCoinBalance: number;
  realCurrencyBalance: number;
  updatedAt: Date;
}

// 生成费用计算结果
interface GenerationCostEstimate {
  baseCost: number;                 // 基础费用
  cardComplexityCost: number;       // 技能牌复杂度附加费用
  totalCost: number;
  estimatedTokens: number;
}

interface IEconomyService {
  // 钱包管理
  getWallet(userId: string): Promise<UserWallet>;
  initializeWallet(userId: string): Promise<UserWallet>;

  // 游戏币操作
  addGameCoins(userId: string, amount: number, sessionId: string, description: string): Promise<CurrencyTransaction>;

  // 真实货币操作
  recharge(userId: string, amount: number, paymentReference: string): Promise<CurrencyTransaction>;
  consumeForGeneration(userId: string, cost: GenerationCostEstimate, scriptId: string): Promise<CurrencyTransaction>;
  refundGeneration(userId: string, amount: number, scriptId: string): Promise<CurrencyTransaction>;

  // 费用计算
  calculateGenerationCost(cardIds: string[], config: ScriptConfig): Promise<GenerationCostEstimate>;

  // 余额检查
  hasEnoughRealCurrency(userId: string, amount: number): Promise<boolean>;

  // 交易记录
  getTransactions(userId: string, currencyType?: CurrencyType, limit?: number, offset?: number): Promise<CurrencyTransaction[]>;
}

// 游戏币奖励配置
const GAME_COIN_REWARDS = {
  basePlayReward: 50,              // 完成一局基础奖励
  highRatingBonus: 30,             // 整体满意度≥8额外奖励
  firstDesignBonus: 200            // 首次设计奖励
};
```

---

## 34. 设计师排行榜服务 (DesignerLeaderboardService)

管理设计师专属排行榜，独立于剧本排行榜。

```typescript
// 设计师排行榜条目
interface DesignerLeaderboardEntry {
  userId: string;
  nickname: string;
  honorTitle: HonorTitle;
  designerLevel: number;
  totalScriptsCreated: number;
  totalScriptsPlayed: number;
  avgScriptRating: number;
  rankingScore: number;
}

interface IDesignerLeaderboardService {
  getRankings(limit: number, offset: number): Promise<DesignerLeaderboardEntry[]>;
  recalculate(userId: string): Promise<void>;
  recalculateAll(): Promise<void>;
  getUserRank(userId: string): Promise<number | null>;
}

// 排名分数计算公式
// rankingScore = totalScriptsPlayed * 0.4 + avgScriptRating * 30 * 0.4 + totalScriptsCreated * 10 * 0.2
```

---

## 新增 REST API 端点

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
