# 数据库设计

本文档包含系统的完整数据库设计，包括MySQL表结构和Redis数据结构。

---

## MySQL 表结构

```sql
-- 玩家账户
CREATE TABLE player_accounts (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  player_level INT DEFAULT 1,
  player_xp INT DEFAULT 0,
  total_games_played INT DEFAULT 0,
  total_scripts_played INT DEFAULT 0,
  total_endings_unlocked INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 剧本配置
CREATE TABLE script_configs (
  id VARCHAR(36) PRIMARY KEY,
  player_count INT NOT NULL,
  duration_hours INT NOT NULL,
  game_type ENUM('honkaku', 'shin_honkaku', 'henkaku') NOT NULL,
  age_group ENUM('elementary', 'middle_school', 'college', 'adult') NOT NULL,
  restoration_ratio INT NOT NULL,
  deduction_ratio INT NOT NULL,
  era VARCHAR(100),
  location VARCHAR(100),
  theme VARCHAR(100),
  language VARCHAR(10) DEFAULT 'zh',
  round_structure JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 剧本
CREATE TABLE scripts (
  id VARCHAR(36) PRIMARY KEY,
  config_id VARCHAR(36) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  parent_version_id VARCHAR(36),
  title VARCHAR(200) NOT NULL,
  content JSON NOT NULL,          -- 完整剧本JSON（DM手册、玩家手册、物料、分支结构）
  status ENUM('generating', 'ready', 'optimizing') DEFAULT 'generating',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES script_configs(id)
);

-- 标签
CREATE TABLE tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  category ENUM('game_type', 'age_group', 'player_count', 'era', 'theme', 'custom') NOT NULL,
  UNIQUE KEY unique_tag (name, category)
);

-- 剧本-标签关联
CREATE TABLE script_tags (
  script_id VARCHAR(36) NOT NULL,
  tag_id VARCHAR(36) NOT NULL,
  is_auto_generated BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (script_id, tag_id),
  FOREIGN KEY (script_id) REFERENCES scripts(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 游戏会话
CREATE TABLE game_sessions (
  id VARCHAR(36) PRIMARY KEY,
  script_id VARCHAR(36) NOT NULL,
  creator_user_id VARCHAR(36) NOT NULL,
  status ENUM('waiting', 'selecting', 'playing', 'voting', 'ended') DEFAULT 'waiting',
  current_round INT DEFAULT 0,
  current_phase VARCHAR(50),
  vote_history JSON,
  branch_path JSON,
  ending_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id),
  FOREIGN KEY (creator_user_id) REFERENCES player_accounts(id)
);

-- 会话玩家
CREATE TABLE session_players (
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(36),
  is_ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 评价反馈
CREATE TABLE feedbacks (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  script_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  plot_score INT NOT NULL CHECK (plot_score BETWEEN 1 AND 10),
  difficulty_score INT NOT NULL CHECK (difficulty_score BETWEEN 1 AND 10),
  character_score INT NOT NULL CHECK (character_score BETWEEN 1 AND 10),
  overall_score INT NOT NULL CHECK (overall_score BETWEEN 1 AND 10),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (script_id) REFERENCES scripts(id),
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 实时建议
CREATE TABLE live_suggestions (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  script_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (script_id) REFERENCES scripts(id),
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 成就定义
CREATE TABLE achievements (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required_games INT,
  special_condition VARCHAR(200),
  icon_url VARCHAR(500)
);

-- 玩家成就
CREATE TABLE player_achievements (
  user_id VARCHAR(36) NOT NULL,
  achievement_id VARCHAR(36) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES player_accounts(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- 收藏品
CREATE TABLE collection_items (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('ending_card', 'character_card') NOT NULL,
  script_id VARCHAR(36) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id),
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- 资源文件
CREATE TABLE assets (
  id VARCHAR(36) PRIMARY KEY,
  script_id VARCHAR(36) NOT NULL,
  type ENUM('image', 'video', 'audio', 'tts_audio') NOT NULL,
  filename VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- 知识条目
CREATE TABLE knowledge_entries (
  id VARCHAR(36) PRIMARY KEY,
  content TEXT NOT NULL,
  category ENUM('techniques', 'patterns', 'examples', 'anti_patterns', 'player_preferences', 'prompt_templates', 'reasoning_chains') NOT NULL,
  game_type_tags JSON NOT NULL,
  effectiveness_score DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (effectiveness_score BETWEEN 0.0 AND 1.0),
  source ENUM('seed', 'manual', 'article', 'script_analysis', 'feedback_extraction', 'high_rated_script') NOT NULL,
  source_reference TEXT,
  embedding BLOB,
  usage_count INT DEFAULT 0,
  status ENUM('active', 'deprecated', 'embedding_pending') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_effectiveness (effectiveness_score)
);

-- 权重更新记录
CREATE TABLE weight_update_records (
  id VARCHAR(36) PRIMARY KEY,
  knowledge_entry_id VARCHAR(36) NOT NULL,
  reason ENUM('feedback', 'manual') NOT NULL,
  feedback_id VARCHAR(36),
  previous_score DECIMAL(3,2) NOT NULL,
  new_score DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_entry_id) REFERENCES knowledge_entries(id),
  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
);

-- 反馈-知识关联
CREATE TABLE feedback_knowledge_links (
  id VARCHAR(36) PRIMARY KEY,
  script_id VARCHAR(36) NOT NULL,
  knowledge_entry_ids JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- 知识快照
CREATE TABLE knowledge_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  entries_data LONGTEXT NOT NULL,
  total_entries INT NOT NULL,
  avg_effectiveness_score DECIMAL(3,2) NOT NULL,
  trigger_reason ENUM('manual', 'pre_update', 'rollback') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 访谈会话
CREATE TABLE interview_sessions (
  id VARCHAR(36) PRIMARY KEY,
  config_id VARCHAR(36) NOT NULL,
  qa_history JSON NOT NULL,
  summary TEXT,
  summary_confirmed BOOLEAN DEFAULT FALSE,
  status ENUM('in_progress', 'summarizing', 'confirmed', 'cancelled') DEFAULT 'in_progress',
  template_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES script_configs(id)
);

-- 提示词模板
CREATE TABLE prompt_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category ENUM('script_generation', 'character_generation', 'clue_generation', 'branch_generation', 'interview_question', 'knowledge_extraction', 'feedback_analysis') NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  active_version_id VARCHAR(36),
  variables JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 提示词版本
CREATE TABLE prompt_versions (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  content TEXT NOT NULL,
  changelog TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES prompt_templates(id),
  UNIQUE KEY unique_version (template_id, version)
);

-- 少样本示例
CREATE TABLE few_shot_examples (
  id VARCHAR(36) PRIMARY KEY,
  category ENUM('script_generation', 'character_generation', 'clue_generation', 'branch_generation', 'interview_question', 'knowledge_extraction', 'feedback_analysis') NOT NULL,
  game_types JSON NOT NULL,
  input_description TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  quality_score DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (quality_score BETWEEN 0.0 AND 1.0),
  status ENUM('active', 'deprecated') DEFAULT 'active',
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category_status (category, status),
  INDEX idx_quality (quality_score)
);

-- 推理链模式
CREATE TABLE reasoning_chains (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  game_types JSON NOT NULL,
  steps JSON NOT NULL,
  applicable_scenarios JSON NOT NULL,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Token用量记录
CREATE TABLE token_usage_records (
  id VARCHAR(36) PRIMARY KEY,
  call_type ENUM('generation', 'interview', 'knowledge_extraction', 'feedback_analysis', 'optimization', 'dm_response') NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  response_time_ms INT NOT NULL,
  script_id VARCHAR(36),
  interview_session_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_call_type (call_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- A/B测试
CREATE TABLE ab_tests (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  variant_a JSON NOT NULL,
  variant_b JSON NOT NULL,
  traffic_ratio JSON NOT NULL,
  status ENUM('running', 'completed', 'cancelled') DEFAULT 'running',
  winner_id ENUM('a', 'b'),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- A/B测试反馈关联
CREATE TABLE ab_test_feedbacks (
  id VARCHAR(36) PRIMARY KEY,
  ab_test_id VARCHAR(36) NOT NULL,
  variant ENUM('a', 'b') NOT NULL,
  feedback_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ab_test_id) REFERENCES ab_tests(id),
  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
);

-- 剧本生成记录（关联使用的模板和版本）
CREATE TABLE script_generation_records (
  id VARCHAR(36) PRIMARY KEY,
  script_id VARCHAR(36) NOT NULL,
  prompt_template_id VARCHAR(36),
  prompt_version_id VARCHAR(36),
  interview_session_id VARCHAR(36),
  ab_test_id VARCHAR(36),
  ab_test_variant ENUM('a', 'b'),
  selected_card_ids JSON,
  total_card_cost INT,
  generation_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- 设计师身份
CREATE TABLE designer_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  total_scripts_created INT DEFAULT 0,
  total_scripts_played INT DEFAULT 0,
  avg_script_rating DECIMAL(3,1) DEFAULT 0.0,
  honor_title ENUM('novice', 'intermediate', 'popular', 'master', 'legendary') DEFAULT 'novice',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 技能牌
CREATE TABLE skill_cards (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('character_design', 'clue_design', 'timeline', 'motive', 'trick', 'restoration', 'deduction_chain') NOT NULL,
  game_types JSON NOT NULL,
  tier ENUM('basic', 'advanced', 'expert', 'legendary') NOT NULL,
  point_cost INT NOT NULL,
  effect_content TEXT NOT NULL,
  required_designer_level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tier (tier),
  INDEX idx_required_level (required_designer_level)
);

-- 设计师牌库（已解锁的牌）
CREATE TABLE designer_decks (
  id VARCHAR(36) PRIMARY KEY,
  designer_id VARCHAR(36) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(id)
);

-- 设计师牌库-牌关联
CREATE TABLE designer_deck_cards (
  deck_id VARCHAR(36) NOT NULL,
  card_id VARCHAR(36) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, card_id),
  FOREIGN KEY (deck_id) REFERENCES designer_decks(id),
  FOREIGN KEY (card_id) REFERENCES skill_cards(id)
);

-- 自定义牌组
CREATE TABLE custom_decks (
  id VARCHAR(36) PRIMARY KEY,
  designer_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  card_ids JSON NOT NULL,
  total_point_cost INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(id)
);

-- 用户钱包
CREATE TABLE user_wallets (
  user_id VARCHAR(36) PRIMARY KEY,
  game_coin_balance INT NOT NULL DEFAULT 0,
  real_currency_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 货币交易记录
CREATE TABLE currency_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  currency_type ENUM('game_coin', 'real_currency') NOT NULL,
  transaction_type ENUM('recharge', 'consumption', 'reward', 'refund') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  related_script_id VARCHAR(36),
  related_session_id VARCHAR(36),
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id),
  INDEX idx_user_currency (user_id, currency_type),
  INDEX idx_created_at (created_at)
);

-- 设计师排行榜（缓存表，定期更新）
CREATE TABLE designer_leaderboard (
  user_id VARCHAR(36) PRIMARY KEY,
  nickname VARCHAR(50) NOT NULL,
  honor_title ENUM('novice', 'intermediate', 'popular', 'master', 'legendary') NOT NULL,
  designer_level INT NOT NULL,
  total_scripts_created INT NOT NULL DEFAULT 0,
  total_scripts_played INT NOT NULL DEFAULT 0,
  avg_script_rating DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  ranking_score DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id),
  INDEX idx_ranking_score (ranking_score DESC)
);

-- 设计师荣誉徽章
CREATE TABLE designer_honors (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  honor_type VARCHAR(100) NOT NULL,
  honor_name VARCHAR(200) NOT NULL,
  description TEXT,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);

-- 设计师经验值变动记录
CREATE TABLE designer_xp_records (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  xp_amount INT NOT NULL,
  reason VARCHAR(200) NOT NULL,
  related_script_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES player_accounts(id)
);
```

---

## Redis 数据结构

```
# 会话实时状态
session:{sessionId}:status     -> Hash { status, currentRound, currentPhase }
session:{sessionId}:players    -> Set { userId1, userId2, ... }
session:{sessionId}:chat       -> List [ { userId, content, timestamp }, ... ]

# 投票状态
vote:{sessionId}:{roundIndex}  -> Hash { optionId -> count }

# 用户会话Token
auth:token:{token}             -> String userId (TTL: 24h)

# 排行榜缓存
leaderboard:overall            -> Sorted Set { scriptId -> avgScore }

# TTS实时延迟监控
tts:latency:avg                -> String latencyMs (TTL: 60s)

# 知识库统计缓存
knowledge:stats                -> Hash { totalEntries, avgScore, ... } (TTL: 300s)
knowledge:entry:{entryId}:consecutive_negative -> String count (连续负向调整计数)

# 访谈会话状态
interview:{sessionId}:status   -> Hash { status, questionCount, currentDimension } (TTL: 2h)

# A/B测试流量分配计数
abtest:{testId}:counts         -> Hash { a: count, b: count }

# Token用量每日累计
token:daily:{date}             -> String totalTokens (TTL: 48h)
token:threshold                -> String thresholdValue

# 设计师排行榜缓存
designer:leaderboard           -> Sorted Set { userId -> rankingScore }

# 用户钱包缓存
wallet:{userId}                -> Hash { gameCoinBalance, realCurrencyBalance } (TTL: 300s)

# 设计师等级缓存
designer:{userId}:level        -> String level (TTL: 600s)
designer:{userId}:budget       -> String pointBudget (TTL: 600s)
```
