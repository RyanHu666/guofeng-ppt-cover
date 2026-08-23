// AI 服务层（统一入口）
// 底层通过 getAIProvider() 切换不同厂商，详见 ai-providers/
import { getAIProvider } from './ai-providers';
import type { ElementItem, StyleAnalysis, StyleType, ColorItem } from './types';
import { STYLE_LABELS, STYLE_DESCRIPTIONS } from './types';

// ============ 图像分析（多模态） ============
export async function analyzeReferenceImages(
  images: string[],
  style: StyleType,
  primaryColor: string,
  projectName: string,
  options: {
    subtitle?: string;
    description?: string;
    signal?: AbortSignal;
    onProgress?: (progress: number, message: string) => void;
  } = {},
): Promise<StyleAnalysis> {
  const provider = getAIProvider();

  const prompt = buildAnalysisPrompt(style, primaryColor, projectName, options);

  const resultText = await provider.analyzeImages({
    images,
    prompt,
    signal: options.signal,
    onProgress: options.onProgress,
  });

  const parsed = extractJSON(resultText);
  return validateStyleAnalysis(parsed);
}

function buildAnalysisPrompt(
  style: StyleType,
  primaryColor: string,
  projectName: string,
  options: { subtitle?: string; description?: string },
): string {
  return `
你是一位资深的中国风视觉设计师。请分析这些参考图片的设计风格，为PPT封面设计提供指导。

请以JSON格式返回分析结果，包含以下字段：
{
  "overallStyle": "整体风格描述，一句话概括设计气质，用画论级语言",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6"],
  "colorPalette": [
    {"name": "颜色名称", "hex": "#颜色代码", "usage": "用途说明，如主色/辅色/点缀色/背景色/文字色"}
  ],
  "elementSuggestions": [
    {"name": "元素名称", "category": "装饰|主体|背景|纹理", "description": "元素描述和设计建议，古风专业表述"}
  ]
}

项目名称：${projectName}
${options.subtitle ? `副标题：${options.subtitle}` : ''}
${options.description ? `需求描述：${options.description}` : ''}
预设风格：${STYLE_LABELS[style]}（${STYLE_DESCRIPTIONS[style]}）
主色调：${primaryColor}

要求：
1. colorPalette 返回5个颜色，包括主色、辅助色、点缀色、背景色、文字色
2. elementSuggestions 返回6个元素建议，涵盖装饰、主体、背景、纹理等类别，每个给出可执行的设计建议
3. 风格描述要用中国古代画论级别的语言，体现东方美学意境
4. 只返回JSON，不要其他解释文字
`;
}

// ============ 元素生成 ============
export async function generateElementImage(
  element: ElementItem,
  style: StyleType,
  primaryColor: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number, message: string) => void;
  } = {},
): Promise<string> {
  const provider = getAIProvider();
  const prompt = buildElementPrompt(element, style, primaryColor);

  return provider.generateImage({
    prompt,
    size: '1024x1024',
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

function buildElementPrompt(element: ElementItem, style: StyleType, primaryColor: string): string {
  const styleDesc = STYLE_LABELS[style];
  const styleDetail = STYLE_DESCRIPTIONS[style];

  return `
中国风设计元素插画：${element.name}
风格流派：${styleDesc}（${styleDetail}）
主色调：${primaryColor}
元素描述：${element.description}
元素类别：${element.category}类元素

画面要求：
- 纯透明背景的独立设计元素，元素居中放置
- 精致的中国风笔触细节，层次丰富
- 画面干净，边缘清晰，无多余杂质
- 高分辨率，适合作为PPT封面装饰元素
- 整体气质典雅古朴，符合东方审美
`;
}

// ============ 最终封面背景图生成 ============
// 注意：生成的是纯背景意境图，不含文字，排版和标题由前端代码叠加
export async function generateFinalCover(
  params: {
    projectName: string;
    subtitle?: string;
    description?: string;
    style: StyleType;
    primaryColor: string;
    layoutId: string;
    layoutName: string;
    styleKeywords?: string[];
    colorPalette?: ColorItem[];
    confirmedElements?: ElementItem[];
    referenceImage?: string;
    strength?: number;
  },
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number, message: string) => void;
  } = {},
): Promise<string> {
  const provider = getAIProvider();
  const prompt = buildFinalPrompt(params);

  return provider.generateImage({
    prompt,
    size: '1280x720',
    referenceImage: params.referenceImage,
    strength: params.strength ?? 0.65,
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

function buildFinalPrompt(params: {
  projectName: string;
  subtitle?: string;
  description?: string;
  style: StyleType;
  primaryColor: string;
  layoutId: string;
  layoutName: string;
  styleKeywords?: string[];
  colorPalette?: ColorItem[];
  confirmedElements?: ElementItem[];
}): string {
  const {
    style,
    primaryColor,
    layoutId,
    layoutName,
    styleKeywords = [],
    colorPalette = [],
    confirmedElements = [],
    description,
  } = params;

  const styleDesc = STYLE_LABELS[style];
  const styleDetail = STYLE_DESCRIPTIONS[style];

  // 根据排版布局决定画面的构图倾向（只描述构图感，不含文字）
  const layoutComposition: Record<string, string> = {
    'layout-center': '对称式构图，画面中心区域留白或设置视觉焦点，左右均衡对称，庄重典雅，有仪式感',
    'layout-left': '左虚右实构图，画面右侧为主体视觉重心，左侧大面积留白或淡雅处理，层次分明，呼吸感强',
    'layout-overlay': '满幅构图，整体画面饱满丰富，作为背景图使用，底部区域色调偏深便于叠加文字，意境悠远',
    'layout-frame': '中心留白构图，画面四周有装饰性元素，中心区域相对干净明亮，便于放置内容，典雅精致',
  };

  const parts: string[] = [];

  // 1. 画面定位
  parts.push(`一幅${styleDesc}风格的PPT封面背景图，16:9横版构图，${layoutComposition[layoutId] || '构图优美协调'}`);

  // 2. 风格意境
  parts.push(`整体气质：${styleDetail}`);
  if (styleKeywords.length > 0) {
    parts.push(`风格关键词：${styleKeywords.join('、')}`);
  }

  // 3. 配色
  if (colorPalette.length > 0) {
    const colorStr = colorPalette.map((c) => `${c.hex}(${c.name}·${c.usage})`).join('、');
    parts.push(`配色方案：${colorStr}，主色调为${primaryColor}`);
  } else {
    parts.push(`主色调为${primaryColor}，配色和谐典雅`);
  }

  // 4. 元素
  if (confirmedElements.length > 0) {
    const elemStr = confirmedElements.map((e) => `${e.name}(${e.description})`).join('、');
    const categories = Array.from(new Set(confirmedElements.map((e) => e.category))).join('、');
    parts.push(`画面中自然融入以下${categories}元素：${elemStr}，元素布局得当，与整体意境融为一体`);
  }

  // 5. 用户需求
  if (description) {
    parts.push(`设计要求：${description}`);
  }

  // 6. 品质要求（重要！不含文字是关键）
  parts.push('高清4K分辨率，专业级画质，极致细节，层次感丰富，光影通透，东方美学意境，画面中不出现任何文字或字母，纯画面意境图');

  return parts.join('。') + '。';
}

// ============ 排版方案提示词（保留接口，实际 Step4 已用几何占位） ============
export function generateLayoutPrompts(
  projectName: string,
  style: StyleType,
  primaryColor: string,
  subtitle?: string,
  description?: string,
): Array<{ id: string; name: string; description: string; prompt: string }> {
  const styleDesc = STYLE_LABELS[style];

  const layouts = [
    {
      id: 'layout-center',
      name: '居中对称式',
      description: '标题居中，两侧对称装饰，庄重大气',
      prompt: `${styleDesc}风格PPT封面，${primaryColor}主色调。居中对称式构图，大标题居中排列，左右两侧有对称的中国风装饰纹样，顶部有装饰性线条，底部有落款印章元素。整体庄重大气，具有古典卷轴美感。高分辨率，16:9比例。`,
    },
    {
      id: 'layout-left',
      name: '左文右画式',
      description: '左侧文字标题，右侧主体图案，层次分明',
      prompt: `${styleDesc}风格PPT封面，${primaryColor}主色调。左文右画式构图，左侧是主标题和副标题文字，竖排或横排，右侧是一幅完整的中国风意境插画作为主体视觉。文字区域有精致的边框装饰。层次分明，意境悠远。高分辨率，16:9比例。`,
    },
    {
      id: 'layout-overlay',
      name: '图文叠加式',
      description: '背景大图加文字层叠，意境悠远',
      prompt: `${styleDesc}风格PPT封面，${primaryColor}主色调。图文叠加式构图，整幅中国风水墨/青绿山水画作为背景，前景有半透明的文字排版区域。主标题醒目有力，背景有朦胧晕染效果。意境深远，富有诗意。高分辨率，16:9比例。`,
    },
    {
      id: 'layout-frame',
      name: '边框纹样式',
      description: '四周传统纹样边框，中心标题，典雅精致',
      prompt: `${styleDesc}风格PPT封面，${primaryColor}主色调。边框纹样式构图，四周有精美的中国传统纹样边框（回纹、云纹、缠枝纹等），中央区域留白放置主标题文字。四角有装饰性图案，整体典雅精致，呈现古籍扉页的质感。高分辨率，16:9比例。`,
    },
  ];

  let extraInfo = '';
  if (subtitle) extraInfo += `\n副标题文字：${subtitle}`;
  if (description) extraInfo += `\n设计需求：${description}`;

  return layouts.map((l) => ({
    ...l,
    prompt: `${l.prompt}${extraInfo}\n标题文字位置预留，项目名：${projectName}。`,
  }));
}

// 保留向后兼容：旧接口签名（单 prompt 字符串）
// 新代码请直接用上面的 generateFinalCover(params)
export async function generateFinalCoverLegacy(
  prompt: string,
  options: {
    referenceImage?: string;
    strength?: number;
    signal?: AbortSignal;
    onProgress?: (progress: number, message: string) => void;
  } = {},
): Promise<string> {
  const provider = getAIProvider();
  return provider.generateImage({
    prompt,
    size: '1280x720',
    referenceImage: options.referenceImage,
    strength: options.strength ?? 0.6,
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

// ============ 工具函数 ============
function extractJSON(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('无法解析AI返回的JSON');
  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error('JSON解析失败');
  }
}

function validateStyleAnalysis(data: unknown): StyleAnalysis {
  const d = data as Record<string, unknown>;

  if (!d.overallStyle || typeof d.overallStyle !== 'string') {
    throw new Error('分析结果缺少 overallStyle');
  }

  const keywords = Array.isArray(d.keywords) ? (d.keywords as string[]) : [];
  const colorPalette = Array.isArray(d.colorPalette) ? (d.colorPalette as ColorItem[]) : [];
  const elementSuggestions = Array.isArray(d.elementSuggestions)
    ? (d.elementSuggestions as Array<Record<string, unknown>>)
    : [];

  return {
    overallStyle: d.overallStyle,
    keywords: keywords.slice(0, 6),
    colorPalette: colorPalette.slice(0, 5),
    elementSuggestions: elementSuggestions.slice(0, 6).map((e) => ({
      name: String(e.name || ''),
      category: (e.category as '装饰' | '主体' | '背景' | '纹理') || '装饰',
      description: String(e.description || ''),
    })),
  };
}
