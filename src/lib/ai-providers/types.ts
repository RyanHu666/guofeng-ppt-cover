// AI 服务商统一接口定义
// 新增厂商只需实现此接口，在 index.ts 中注册即可

export interface ImageGenerateOptions {
  prompt: string;
  size?: string; // 如 '1920x1080' '1024x1024'
  referenceImage?: string; // base64 或 URL，用于图生图
  strength?: number; // 图生图强度 0-1
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => void;
}

export interface VisionAnalyzeOptions {
  images: string[]; // base64 dataUrl 或 URL
  prompt: string;
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => void;
}

export interface AIProvider {
  /** 服务商标识 */
  id: string;
  /** 名称 */
  name: string;

  /** 文生图 / 图生图，返回图片 URL */
  generateImage(options: ImageGenerateOptions): Promise<string>;

  /** 多模态图像分析，返回文本结果（通常是 JSON） */
  analyzeImages(options: VisionAnalyzeOptions): Promise<string>;
}
