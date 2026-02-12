# 术语表

| 术语 | 说明 |
|------|------|
| Generator（生成引擎） | 核心AI生成模块，调用LLM结合知识库生成剧本杀内容 |
| Skill（技能模板） | 预定义的剧本杀生成辅助模板和规则片段，作为知识库初始种子数据 |
| DM_Handbook（DM手册） | 供主持人使用的完整游戏主持指南 |
| Player_Handbook（玩家手册） | 供每位玩家使用的角色剧本 |
| Material（游戏物料） | 线索卡、道具卡、投票卡等辅助材料（均为电子版） |
| Game_Session（游戏会话） | 一次完整的线上剧本杀游戏实例 |
| Config（配置参数） | 用户定义的剧本生成参数集合 |
| Script（剧本） | 由Generator生成的完整剧本杀内容包 |
| Script_Repository（剧本库） | 存储所有已生成剧本的持久化仓库 |
| Game_Platform（游戏平台） | 线上Web游戏平台 |
| LLM_Adapter（LLM适配器） | 与大语言模型API交互的适配层 |
| AI_DM（AI主持人） | 基于LLM的自动化游戏主持人 |
| TTS_Engine（语音合成引擎） | 文本转语音模块 |
| Leaderboard（排行榜） | 剧本评分排名模块 |
| Live_Suggestion（实时建议） | 游戏中玩家提交的优化建议 |
| Player_Account（玩家账户） | 玩家注册账户 |
| Achievement（成就） | 基于游戏行为解锁的奖励徽章 |
| Collection（收藏） | 玩家通过游玩积累的收藏品 |
| Video_Generator（视频生成器） | AI视频生成模块 |
| Asset_Storage（资源存储） | 统一资源存储抽象层 |
| Plugin_System（插件系统） | 可扩展的插件架构 |
| Tag（标签） | 剧本分类标签 |
| Knowledge_Base（知识库） | 存储所有知识条目的结构化数据集合 |
| Knowledge_Entry（知识条目） | 一条具体的剧本杀设计知识 |
| Embedding（向量嵌入） | 知识条目的高维向量表示 |
| Vector_Store（向量存储） | 存储和检索向量嵌入的数据结构（hnswlib） |
| Effectiveness_Score（有效性分数） | 知识条目质量评分（0.0-1.0） |
| Knowledge_Category（知识分类） | techniques, patterns, examples, anti_patterns, player_preferences, prompt_templates, reasoning_chains |
| Knowledge_Source（知识来源） | seed, manual, article, script_analysis, feedback_extraction, high_rated_script |
| Learning_Pipeline（学习管道） | 摄入→提取→嵌入→应用→评估→精炼 |
| RAG（检索增强生成） | 通过向量搜索检索知识注入提示词 |
| Knowledge_Snapshot（知识快照） | 知识库完整状态快照 |
| Feedback_Knowledge_Link | 记录剧本生成使用了哪些知识条目 |
| Pre_Generation_Interview（预生成访谈） | AI与创作者的交互式访谈 |
| Interview_Template（访谈模板） | 定义访谈问题流程的模板 |
| Prompt_Template（提示词模板） | 可版本化管理的LLM提示词模板 |
| Few_Shot_Example（少样本示例） | LLM提示词中的输入-输出示例对 |
| Reasoning_Chain（推理链模式） | 链式思维推理模板 |
| Token_Usage_Record（Token用量记录） | LLM调用的token消耗记录 |
| AB_Test（A/B测试） | 提示词版本或模型配置对比实验 |
| Player_Rating_Weight（玩家评价权重） | 基于游玩次数的评价权重系数 |
| Designer_Identity（设计师身份） | 用户的剧本设计师身份，与玩家身份独立 |
| Skill_Card（技能牌） | 将Skill模板包装为可选择的"牌" |
| Card_Tier（牌等级） | basic, advanced, expert, legendary |
| Design_Point_Budget（设计点数预算） | 每次创建剧本的可用总点数 |
| Designer_Deck（设计师牌库） | 设计师已解锁的技能牌集合 |
| Custom_Deck（自定义牌组） | 设计师组合的个人牌组 |
| Game_Coin（游戏币） | 虚拟货币，通过游玩获得 |
| Real_Currency（真实货币） | 充值余额，用于支付LLM费用 |
| Designer_Leaderboard（设计师排行榜） | 设计师专属排行榜 |
| Designer_Honor（设计师荣誉） | 荣誉称号系统 |
