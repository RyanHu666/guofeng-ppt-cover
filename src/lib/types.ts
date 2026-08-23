// 项目类型定义

export type StyleType = 'ink-wash' | 'neo-chinese' | 'light-green';

export const STYLE_LABELS: Record<StyleType, string> = {
  'ink-wash': '水墨风',
  'neo-chinese': '新中式国潮',
  'light-green': '淡彩青绿',
};

export const STYLE_DESCRIPTIONS: Record<StyleType, string> = {
  'ink-wash': '笔墨晕染、意境悠远、典雅禅意',
  'neo-chinese': '传统纹样、现代构图、潮流国风',
  'light-green': '青山绿水、清新雅致、诗意盎然',
};

export type GenerationStatus = 'idle' | 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';

export interface ProjectInfo {
  name: string;
  subtitle: string;
  description: string;
  style: StyleType;
  primaryColor: string;
  referenceImages: string[];
}

export interface ColorItem {
  name: string;
  hex: string;
  usage: string;
}

export interface ElementSuggestion {
  name: string;
  description: string;
  category: '装饰' | '主体' | '背景' | '纹理';
}

export interface StyleAnalysis {
  overallStyle: string;
  keywords: string[];
  colorPalette: ColorItem[];
  elementSuggestions: ElementSuggestion[];
}

export interface ElementItem {
  id: string;
  name: string;
  description: string;
  category: '装饰' | '主体' | '背景' | '纹理';
  status: GenerationStatus;
  imageUrl?: string;
  confirmed: boolean;
  prompt?: string;
  error?: string;
}

export interface LayoutOption {
  id: string;
  name: string;
  description: string;
  thumbnailPrompt: string;
  status: GenerationStatus;
  imageUrl?: string;
  selected: boolean;
}

export interface FinalCover {
  status: GenerationStatus;
  imageUrl?: string;
  imageToImageStrength: number;
}

export interface GenerationProgress {
  taskId: string;
  type: 'analyze' | 'element' | 'elements-batch' | 'layouts' | 'final';
  status: string;
  progress: number;
  message: string;
  currentIndex?: number;
  totalCount?: number;
  [key: string]: unknown;
}

export type SSEEventType = 'connected' | 'progress' | 'complete' | 'error' | 'cancelled';

export interface SSEEventData {
  event: SSEEventType;
  data: unknown;
}

export type StepId = 'input' | 'analyze' | 'elements' | 'layouts' | 'final';

export const STEPS: Array<{ id: StepId; label: string; stepNumber: number }> = [
  { id: 'input', label: '需求输入', stepNumber: 1 },
  { id: 'analyze', label: 'AI分析', stepNumber: 2 },
  { id: 'elements', label: '元素生成', stepNumber: 3 },
  { id: 'layouts', label: '排版方案', stepNumber: 4 },
  { id: 'final', label: '封面出图', stepNumber: 5 },
];
