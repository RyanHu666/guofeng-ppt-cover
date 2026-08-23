'use client';

import { useState, useCallback, useRef } from 'react';
import { useApp } from '@/lib/store';
import { STYLE_LABELS, STYLE_DESCRIPTIONS, type StyleType } from '@/lib/types';
import { StepHeader, StepActions, Card, SectionTitle } from './step-layout';
import { Upload, X, Image as ImageIcon, Palette, Sparkles, Mountain, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

const styleIcons: Record<StyleType, React.ComponentType<{ className?: string }>> = {
  'ink-wash': Sparkles,
  'neo-chinese': Mountain,
  'light-green': Leaf,
};

const presetColors = [
  { name: '墨绿', value: '#2d4a3f' },
  { name: '赭石', value: '#c45c3b' },
  { name: '藏青', value: '#2a3a5c' },
  { name: '驼色', value: '#a08060' },
  { name: '胭脂', value: '#b84a6a' },
  { name: '竹青', value: '#5a8a6a' },
  { name: '靛蓝', value: '#3a5a8a' },
  { name: '赭黄', value: '#d4a04e' },
];

export function StepInput() {
  const { projectInfo, updateProjectInfo, canGoToStep } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;

      await uploadFiles(files);
    },
    [projectInfo.referenceImages.length],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 压缩图片到最大 800px，减小传输体积同时保证分析质量
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const maxSize = 800;
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          // 输出为 JPEG，质量 0.85
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async (files: File[]) => {
    // 压缩后转 base64，减小体积同时保证分析质量
    const newImages: string[] = [];

    for (const file of files) {
      try {
        const dataUrl = await compressImage(file);
        newImages.push(dataUrl);
      } catch (err) {
        console.error('图片处理失败:', err);
      }
    }

    updateProjectInfo({
      referenceImages: [...projectInfo.referenceImages, ...newImages].slice(0, 9),
    });
  };

  const removeImage = (index: number) => {
    updateProjectInfo({
      referenceImages: projectInfo.referenceImages.filter((_, i) => i !== index),
    });
  };

  const canProceed = canGoToStep('analyze');

  return (
    <div>
      <StepHeader
        stepNumber={1}
        title="需求输入"
        description="填写项目信息，选择风格基调，上传参考图片，开启你的古风封面创作之旅"
      />

      <div className="space-y-6">
        {/* 项目名称 */}
        <Card>
          <SectionTitle title="项目名称" description="这将作为封面的主标题文字" />
          <input
            type="text"
            value={projectInfo.name}
            onChange={(e) => updateProjectInfo({ name: e.target.value })}
            placeholder="请输入PPT项目名称，如：年度工作总结、产品发布会..."
            className="w-full rounded-lg border border-ink-light bg-ink-dark/50 px-4 py-3 text-rice placeholder-mossy transition-all focus:border-cinnabar/50 focus:outline-none focus:ring-2 focus:ring-cinnabar/20"
            maxLength={50}
          />
          <div className="mt-2 text-right text-xs text-mossy">
            {projectInfo.name.length}/50
          </div>
        </Card>

        {/* 副标题 */}
        <Card>
          <SectionTitle title="副标题（选填）" description="封面副标题，用于补充说明" />
          <input
            type="text"
            value={projectInfo.subtitle}
            onChange={(e) => updateProjectInfo({ subtitle: e.target.value })}
            placeholder="请输入副标题，如：2024年度报告、品牌发布会主题..."
            className="w-full rounded-lg border border-ink-light bg-ink-dark/50 px-4 py-3 text-rice placeholder-mossy transition-all focus:border-cinnabar/50 focus:outline-none focus:ring-2 focus:ring-cinnabar/20"
            maxLength={60}
          />
          <div className="mt-2 text-right text-xs text-mossy">
            {projectInfo.subtitle.length}/60
          </div>
        </Card>

        {/* 需求明细 */}
        <Card>
          <SectionTitle
            title="需求明细"
            description="详细描述你的设计需求、内容要点、特殊要求等，AI将根据描述生成更精准的封面"
          />
          <textarea
            value={projectInfo.description}
            onChange={(e) => updateProjectInfo({ description: e.target.value })}
            placeholder={`例如：
• 这是一个年度企业汇报的PPT封面，要体现稳重大气的气质
• 公司名称：XX科技集团
• 汇报人：总经理办公室
• 需要有山水意境，融入建筑元素
• 整体氛围要专业、有气势、有文化底蕴
• 配色以墨色为主，点缀金色`}
            rows={8}
            className="w-full resize-none rounded-lg border border-ink-light bg-ink-dark/50 px-4 py-3 text-rice placeholder-mossy transition-all focus:border-cinnabar/50 focus:outline-none focus:ring-2 focus:ring-cinnabar/20 leading-relaxed"
            maxLength={500}
          />
          <div className="mt-2 text-right text-xs text-mossy">
            {projectInfo.description.length}/500
          </div>
        </Card>

        {/* 风格选择 */}
        <Card>
          <SectionTitle title="风格选择" description="选择你喜欢的古风设计风格" />
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(STYLE_LABELS) as StyleType[]).map((style) => {
              const Icon = styleIcons[style];
              const isSelected = projectInfo.style === style;
              return (
                <button
                  key={style}
                  onClick={() => updateProjectInfo({ style })}
                  className={cn(
                    'group relative rounded-xl border-2 p-5 text-left transition-all duration-300',
                    isSelected
                      ? 'border-cinnabar bg-cinnabar/10 shadow-lg shadow-cinnabar/10'
                      : 'border-ink-light bg-ink-dark/30 hover:border-ink hover:bg-ink-dark/50',
                  )}
                >
                  <div
                    className={cn(
                      'mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      isSelected ? 'bg-cinnabar/20 text-cinnabar' : 'bg-ink text-silver group-hover:text-rice',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4
                    className={cn(
                      'text-base font-semibold mb-1',
                      isSelected ? 'text-rice' : 'text-silver group-hover:text-rice',
                    )}
                  >
                    {STYLE_LABELS[style]}
                  </h4>
                  <p className="text-xs text-mossy leading-relaxed">
                    {STYLE_DESCRIPTIONS[style]}
                  </p>

                  {isSelected && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-cinnabar flex items-center justify-center">
                      <svg className="h-3 w-3 text-rice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 主色调 */}
        <Card>
          <SectionTitle title="主色调" description="选择封面的主导颜色基调" />
          <div className="flex flex-wrap gap-3">
            {presetColors.map((color) => (
              <button
                key={color.value}
                onClick={() => updateProjectInfo({ primaryColor: color.value })}
                className={cn(
                  'group flex flex-col items-center gap-1.5',
                  projectInfo.primaryColor === color.value && 'scale-110',
                )}
                title={color.name}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full border-2 transition-all shadow-lg',
                    projectInfo.primaryColor === color.value
                      ? 'border-rice shadow-rice/20'
                      : 'border-ink-light group-hover:border-silver',
                  )}
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-xs text-mossy">{color.name}</span>
              </button>
            ))}

            {/* 自定义颜色 */}
            <div className="flex flex-col items-center gap-1.5 ml-2">
              <label className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-ink-light hover:border-silver transition-colors">
                <Palette className="absolute inset-0 m-auto h-5 w-5 text-mossy" />
                <input
                  type="color"
                  value={projectInfo.primaryColor}
                  onChange={(e) => updateProjectInfo({ primaryColor: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <span className="text-xs text-mossy">自定义</span>
            </div>
          </div>

          {/* 当前颜色预览 */}
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-ink-light bg-ink-dark/30 p-3">
            <div
              className="h-8 w-8 rounded-md shadow-inner"
              style={{ backgroundColor: projectInfo.primaryColor }}
            />
            <div>
              <div className="text-sm text-rice font-medium">当前主色调</div>
              <div className="text-xs text-mossy font-mono">{projectInfo.primaryColor.toUpperCase()}</div>
            </div>
          </div>
        </Card>

        {/* 参考图上传 */}
        <Card>
          <SectionTitle
            title="参考图上传"
            description="上传你喜欢的参考图片，AI将分析其风格特征（最多9张）"
          />

          {/* 拖拽上传区域 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
              isDragging
                ? 'border-cinnabar bg-cinnabar/5'
                : 'border-ink-light bg-ink-dark/20 hover:border-ink hover:bg-ink-dark/40',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="mx-auto mb-3 h-10 w-10 text-mossy" />
            <p className="text-sm text-silver mb-1">
              拖拽图片到此处，或<span className="text-terracotta">点击上传</span>
            </p>
            <p className="text-xs text-mossy">支持 JPG / PNG / WebP，最多9张</p>
          </div>

          {/* 已上传图片预览 */}
          {projectInfo.referenceImages.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-silver">
                  已上传 {projectInfo.referenceImages.length} 张
                </span>
                <button
                  onClick={() => updateProjectInfo({ referenceImages: [] })}
                  className="text-xs text-mossy hover:text-cinnabar transition-colors"
                >
                  清空全部
                </button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {projectInfo.referenceImages.map((img, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-ink-light bg-ink-dark"
                  >
                    <img
                      src={img}
                      alt={`参考图 ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-darkest/80 text-rice opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cinnabar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-darkest/80 to-transparent py-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-rice">参考图 {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <StepActions
        nextLabel="开始AI分析"
        nextDisabled={!canProceed}
      />
    </div>
  );
}
