# 策略配置外置

## 设计原则

所有业务策略（公式、阈值、权重系数）从代码中抽离，集中到 `policy.json` 配置文件。各服务启动时加载策略配置，策略变更只需修改配置文件并重启服务，不需要改代码。

## policy.json

```json
{
  "ratingWeights": {
    "description": "玩家评价权重，基于游玩次数",
    "thresholds": [
      { "minGames": 25, "weight": 1.5 },
      { "minGames": 10, "weight": 1.2 },
      { "minGames": 5, "weight": 1.0 },
      { "minGames": 0, "weight": 0.7 }
    ]
  },
  "compositeScore": {
    "description": "综合反馈分数计算权重",
    "weights": {
      "plotScore": 0.3,
      "difficultyScore": 0.2,
      "characterScore": 0.3,
      "overallScore": 0.2
    }
  },
  "effectivenessAdjustment": {
    "description": "知识条目有效性分数调整参数",
    "positiveThreshold": 7,
    "negativeThreshold": 5,
    "positiveDeltaFactor": 0.02,
    "negativeDeltaFactor": 0.02,
    "autoDeprecateThreshold": 0.1,
    "autoDeprecateConsecutive": 5
  },
  "playerXP": {
    "description": "玩家经验值系统",
    "baseXPPerGame": 10,
    "levelFormula": "level * 100"
  },
  "designerXP": {
    "description": "设计师经验值系统",
    "levelFormula": "level * 150",
    "baseXPPerPlay": 5,
    "highRatingBonus": 10,
    "highRatingThreshold": 8,
    "firstDesignBonus": 50
  },
  "pointBudget": {
    "description": "设计点数预算",
    "levels": { "1": 10, "2": 13, "3": 16, "4": 20, "5": 25 },
    "incrementPerLevel": 3
  },
  "cardTierCosts": {
    "description": "技能牌等级对应点数消耗范围",
    "basic": [1, 2],
    "advanced": [3, 4],
    "expert": [5, 7],
    "legendary": [8, 10]
  },
  "economy": {
    "description": "双币经济参数",
    "gameCoinPerGame": 50,
    "gameCoinHighRatingBonus": 30,
    "gameCoinHighRatingThreshold": 8,
    "firstDesignGameCoinBonus": 200
  },
  "leaderboard": {
    "description": "排行榜排名公式",
    "scriptLeaderboard": {
      "minPlaysForRanking": 3
    },
    "designerLeaderboard": {
      "formula": "totalPlays * 0.4 + avgScore * 30 * 0.4 + scriptCount * 10 * 0.2"
    }
  },
  "designerHonors": {
    "description": "设计师荣誉称号",
    "titles": [
      { "title": "新手设计师", "minLevel": 1, "maxLevel": 2 },
      { "title": "进阶设计师", "minLevel": 3, "maxLevel": 4 },
      { "title": "人气设计师", "minLevel": 5, "maxLevel": 7 },
      { "title": "大师设计师", "minLevel": 8, "maxLevel": 10 },
      { "title": "传奇设计师", "minLevel": 11, "maxLevel": null }
    ],
    "milestones": [
      { "plays": 100, "badge": "百人剧作家" },
      { "plays": 500, "badge": "五百人剧作家" },
      { "plays": 1000, "badge": "千人剧作家" }
    ]
  },
  "achievements": {
    "description": "成就里程碑",
    "gameCountMilestones": [
      { "count": 1, "name": "首次游玩" },
      { "count": 5, "name": "初入江湖" },
      { "count": 10, "name": "推理达人" },
      { "count": 25, "name": "侦探大师" },
      { "count": 50, "name": "传奇侦探" }
    ],
    "specialAchievements": {
      "highDeductionThreshold": 8,
      "badges": ["明察秋毫", "逻辑之王"]
    }
  },
  "feedbackTriggers": {
    "description": "反馈触发阈值",
    "autoOptimizeMinFeedbacks": 5,
    "autoOptimizeLowScoreThreshold": 6,
    "knowledgeExtractionMinTexts": 10,
    "highRatedScriptMinScore": 8,
    "highRatedScriptMinPlays": 5
  },
  "rag": {
    "description": "RAG检索配置",
    "defaultTopK": 20,
    "maxContextTokens": 4000,
    "minEffectivenessScore": 0.2,
    "cacheTimeoutSeconds": 600,
    "retrieveTimeoutMs": 3000
  },
  "transitionGuide": {
    "description": "玩家到设计师过渡引导",
    "showDesignerEntryMinGames": 10,
    "showDesignerHintMinGames": 5,
    "inviteNotificationPlayerLevel": 5
  },
  "degradation": {
    "description": "服务降级策略配置",
    "knowledgeService": {
      "fallbackMode": "local_skills",
      "markField": "ragFallback"
    },
    "aiToolchainService": {
      "promptFallbackMode": "default_template",
      "ttsFallbackMode": "text_only"
    },
    "progressionService": {
      "fallbackMode": "outbox_replay"
    },
    "feedbackService": {
      "fallbackMode": "client_cache"
    }
  }
}
```

## 策略加载方式

```typescript
// 策略提供者接口（DIP：依赖抽象而非具体文件路径）
interface IPolicyProvider {
  load(): Policy;
}

// 默认实现：从本地 JSON 文件加载
class FilePolicyProvider implements IPolicyProvider {
  constructor(private filePath: string = '../policy.json') {}
  load(): Policy {
    return require(this.filePath);
  }
}

// 各服务共用的策略服务
class PolicyService {
  private policy: Policy;

  constructor(provider: IPolicyProvider = new FilePolicyProvider()) {
    this.policy = provider.load();
  }

  getRatingWeight(gamesPlayed: number): number {
    const threshold = this.policy.ratingWeights.thresholds
      .find(t => gamesPlayed >= t.minGames);
    return threshold?.weight ?? 0.7;
  }

  getDesignPointBudget(level: number): number {
    const specific = this.policy.pointBudget.levels[String(level)];
    if (specific) return specific;
    const maxDefined = Math.max(...Object.keys(this.policy.pointBudget.levels).map(Number));
    return this.policy.pointBudget.levels[String(maxDefined)]
      + (level - maxDefined) * this.policy.pointBudget.incrementPerLevel;
  }

  getDegradationConfig(serviceName: string): DegradationConfig | undefined {
    return this.policy.degradation?.[serviceName];
  }

  // ... 其他策略查询方法
}
```

`policy.json` 放在共享类型包 `@murder-mystery/shared` 中，各服务通过 `IPolicyProvider` 接口加载。
