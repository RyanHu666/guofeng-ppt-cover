// 素材相关类型定义和常量（客户端安全，不含 fs/path 等服务端模块）

export interface MaterialItem {
  id: string;
  title: string;
  description: string;
  thumbUrl: string;
  midUrl: string;
  originalUrl: string;
  sourceUrl?: string;
  localPath?: string;
  width: number;
  height: number;
  source: 'huaban' | 'upload' | 'library';
  category: string;
  tags: string[];
  createdAt?: number;
  updatedAt?: number;
  selected?: boolean;
}

export const MATERIAL_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'landscape', name: '山水' },
  { id: 'flower-bird', name: '花鸟' },
  { id: 'cloud-pattern', name: '云纹' },
  { id: 'architecture', name: '建筑' },
  { id: 'figure', name: '人物' },
  { id: 'object', name: '器物' },
  { id: 'other', name: '其他' },
];
