// 插件类型
export enum PluginType {
  STORAGE = 'storage',         // 存储插件（本地/腾讯COS/AWS S3）
  IMAGE_GEN = 'image_gen',    // 图片生成插件
  MUSIC_GEN = 'music_gen',    // 音乐生成插件
  VIDEO_GEN = 'video_gen',    // 视频生成插件
  TTS_GEN = 'tts_gen',        // TTS语音插件
}

// 插件基础接口
export interface IPlugin {
  name: string;
  type: PluginType;
  version: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  destroy(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

// 插件注册表配置（plugins.json）
export interface PluginConfig {
  plugins: {
    name: string;
    type: PluginType;
    enabled: boolean;
    module: string;            // 模块路径
    config: Record<string, unknown>;
  }[];
}

// 存储插件接口
export interface IStoragePlugin extends IPlugin {
  type: PluginType.STORAGE;
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>; // 返回URL
  download(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
  getPublicUrl(filename: string): string;
}

// TTS插件接口
export interface ITTSPlugin extends IPlugin {
  type: PluginType.TTS_GEN;
  synthesize(text: string, voice?: string, language?: string): Promise<Buffer>;
  synthesizeStream(text: string, voice?: string, language?: string): AsyncIterable<Buffer>;
  estimateLatency(): Promise<number>; // 预估延迟（毫秒）
}

// TTS预生成语音节点类型
export enum TTSNodeType {
  OPENING = 'opening',                       // 开场白
  ROUND_TRANSITION = 'round_transition',     // 轮次过渡
  CLUE_NARRATION = 'clue_narration',         // 线索叙述
  VOTE_PROMPT = 'vote_prompt',               // 投票提示
  BRANCH_NARRATIVE = 'branch_narrative',     // 分支叙述
  ENDING_REVEAL = 'ending_reveal',           // 结局揭示
  TRUTH_REVEAL = 'truth_reveal',             // 真相还原
}
