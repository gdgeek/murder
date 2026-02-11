// 游戏类型枚举
export enum GameType {
  HONKAKU = 'honkaku',             // 本格
  SHIN_HONKAKU = 'shin_honkaku',   // 新本格
  HENKAKU = 'henkaku',             // 变格
}

// 目标年龄段枚举
export enum AgeGroup {
  ELEMENTARY = 'elementary',       // 小学生
  MIDDLE_SCHOOL = 'middle_school', // 中学生
  COLLEGE = 'college',             // 大学生
  ADULT = 'adult',                 // 成年人
}

// 轮次阶段
export interface RoundPhase {
  reading: number;        // 阅读时间（分钟）
  investigation: number;  // 搜证时间（分钟）
  discussion: number;     // 推证/讨论时间（分钟）
}

// 轮次结构
export interface RoundStructure {
  totalRounds: number;
  phases: RoundPhase[];
  finalVoteMinutes: number;
  revealMinutes: number;
}

// 配置参数
export interface ScriptConfig {
  id: string;
  playerCount: number;            // 1-6
  durationHours: number;          // 2-6
  gameType: GameType;
  ageGroup: AgeGroup;
  restorationRatio: number;       // 还原比例 0-100
  deductionRatio: number;         // 推理比例 0-100, 与还原比例之和=100
  era: string;                    // 时代背景
  location: string;               // 地点设定
  theme: string;                  // 主题风格
  language: string;               // 生成语言
  roundStructure: RoundStructure; // 自动计算
}

// 创建配置输入（不含自动生成的 id 和 roundStructure）
export interface CreateConfigInput {
  playerCount: number;
  durationHours: number;
  gameType: GameType;
  ageGroup: AgeGroup;
  restorationRatio: number;
  deductionRatio: number;
  era: string;
  location: string;
  theme: string;
  language?: string;
}

// 校验结果
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  constraint: string;
}
