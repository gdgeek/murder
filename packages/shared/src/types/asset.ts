export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',             // 音乐/音效
  TTS_AUDIO = 'tts_audio',    // TTS语音文件
}

export interface Asset {
  id: string;
  scriptId: string;
  type: AssetType;
  filename: string;
  url: string;                 // 访问URL（本地路径或CDN地址）
  size: number;
  mimeType: string;
  metadata: Record<string, unknown>; // 关联的剧情节点ID等
  createdAt: Date;
}
