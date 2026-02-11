export interface Feedback {
  id: string;
  sessionId: string;
  scriptId: string;
  userId: string;
  plotScore: number;           // 剧情评分 1-10
  difficultyScore: number;     // 推理难度评分 1-10
  characterScore: number;      // 角色体验评分 1-10
  overallScore: number;        // 整体满意度 1-10
  comment: string;
  createdAt: Date;
}

export interface LiveSuggestion {
  id: string;
  sessionId: string;
  scriptId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface AggregatedFeedback {
  scriptId: string;
  totalFeedbacks: number;
  avgPlotScore: number;
  avgDifficultyScore: number;
  avgCharacterScore: number;
  avgOverallScore: number;
  lowScoreDimensions: string[];  // 平均分<6的维度
  topSuggestions: string[];
}
