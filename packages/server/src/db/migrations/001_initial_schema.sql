-- Initial database schema migration
-- Creates all tables for the Murder Mystery AI Generator

-- 玩家账户
CREATE TABLE IF NOT EXISTS player_accounts (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  total_games_played INT DEFAULT 0,
  total_scripts_played INT DEFAULT 0,
  total_endings_unlocked INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 剧本配置
CREATE TABLE IF NOT EXISTS script_configs (
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
CREATE TABLE IF NOT EXISTS scripts (
  id VARCHAR(36) PRIMARY KEY,
  config_id VARCHAR(36) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  parent_version_id VARCHAR(36),
  title VARCHAR(200) NOT NULL,
  content JSON NOT NULL,
  status ENUM('generating', 'ready', 'optimizing') DEFAULT 'generating',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES script_configs(id)
);

-- 标签
CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  category ENUM('game_type', 'age_group', 'player_count', 'era', 'theme', 'custom') NOT NULL,
  UNIQUE KEY unique_tag (name, category)
);

-- 剧本-标签关联
CREATE TABLE IF NOT EXISTS script_tags (
  script_id VARCHAR(36) NOT NULL,
  tag_id VARCHAR(36) NOT NULL,
  is_auto_generated BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (script_id, tag_id),
  FOREIGN KEY (script_id) REFERENCES scripts(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 游戏会话
CREATE TABLE IF NOT EXISTS game_sessions (
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
CREATE TABLE IF NOT EXISTS session_players (
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
CREATE TABLE IF NOT EXISTS feedbacks (
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
CREATE TABLE IF NOT EXISTS live_suggestions (
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
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required_games INT,
  special_condition VARCHAR(200),
  icon_url VARCHAR(500)
);

-- 玩家成就
CREATE TABLE IF NOT EXISTS player_achievements (
  user_id VARCHAR(36) NOT NULL,
  achievement_id VARCHAR(36) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES player_accounts(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- 收藏品
CREATE TABLE IF NOT EXISTS collection_items (
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
CREATE TABLE IF NOT EXISTS assets (
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
