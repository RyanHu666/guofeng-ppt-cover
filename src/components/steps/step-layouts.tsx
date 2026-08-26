'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { StepHeader, StepActions, Card, SectionTitle } from './step-layout';
import { LayoutPlaceholder } from '../layout-placeholder';
import type { LayoutOption } from '@/lib/types';
import {
  LayoutGrid,
  Check,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const layoutTemplates = [
  {
    id: 'layout-center',
    name: '居中对称式',
    description: '标题居中，两侧对称装饰，庄重大气',
  },
  {
    id: 'layout-left',
    name: '左文右画式',
    description: '左侧文字标题，右侧主体图案，层次分明',
  },
  {
    id: 'layout-overlay',
    name: '图文叠加式',
    description: '背景大图加文字层叠，意境悠远',
  },
  {
    id: 'layout-frame',
    name: '边框纹样式',
    description: '四周传统纹样边框，中心标题，典雅精致',
  },
];

export function StepLayouts() {
  const {
    projectInfo,
    layouts,
    setLayouts,
    selectLayout,
    selectedLayout,
    canGoToStep,
    setCurrentStep,
  } = useApp();

  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [previewLayout, setPreviewLayout] = useState<LayoutOption | null>(null);

  // 初始化布局列表
  const initializeLayouts = useCallback(() => {
    if (layouts.length > 0) return;
    const initialLayouts: LayoutOption[] = layoutTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      thumbnailPrompt: '',
      status: 'completed',
      imageUrl: `layout-${template.id}-placeholder`,
      selected: false,
    }));
    setLayouts(initialLayouts);
  }, [layouts.length, setLayouts]);



  const handlePreview = (layout: LayoutOption) => {
    setPreviewLayout(layout);
    setShowPreview('preview');
  };

  // 初始化一次
  useEffect(() => {
    if (layouts.length === 0) {
      initializeLayouts();
    }
  }, [layouts.length, initializeLayouts]);

  const canProceed = canGoToStep('final');

  return (
    <div>
      <StepHeader
        stepNumber={4}
        title="排版方案"
        description="选择一种你喜欢的封面排版结构，基于此生成最终封面"
      />

      {/* 操作栏 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cinnabar/20 text-cinnabar">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rice">4 版预设排版方案</h3>
              <p className="text-xs text-silver">
                {selectedLayout ? `已选择：${selectedLayout.name}` : '几何结构示意，选择一个版式开始生成封面'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 方案网格 */}
      <div className="grid grid-cols-2 gap-6">
        {layouts.map((layout, index) => (
          <div
            key={layout.id}
            className={cn(
              'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
              layout.selected
                ? 'border-cinnabar shadow-xl shadow-cinnabar/20'
                : 'border-ink-light bg-ink-darker/60 hover:border-ink',
            )}
          >
            {/* 图片区 */}
            <div className="relative aspect-video bg-ink-dark overflow-hidden">
                <LayoutPlaceholder layoutId={layout.id} primaryColor={projectInfo.primaryColor} />
                {/* 悬浮遮罩 */}
                <div className="absolute inset-0 bg-ink-darkest/60 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-4">
                  <button
                    onClick={() => handlePreview(layout)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-rice/20 text-rice hover:bg-rice/30 transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => selectLayout(layout.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-cinnabar/80 text-rice hover:bg-cinnabar transition-colors"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>

                {/* 选中标记 */}
                {layout.selected && (
                  <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-cinnabar shadow-lg shadow-cinnabar/30">
                    <Check className="h-5 w-5 text-rice" />
                  </div>
                )}

              {/* 编号 */}
              <div className="absolute top-4 left-4 flex h-7 w-7 items-center justify-center rounded-md bg-ink-darkest/70 text-xs font-semibold text-rice backdrop-blur-sm">
                {index + 1}
              </div>
            </div>

            {/* 信息区 */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-base font-semibold text-rice">{layout.name}</h4>
              </div>
              <p className="text-sm text-silver leading-relaxed mb-4">{layout.description}</p>

              <button
                onClick={() => selectLayout(layout.id)}
                className={cn(
                  'w-full rounded-lg py-2.5 text-sm font-medium transition-all',
                  layout.selected
                    ? 'bg-cinnabar text-rice'
                    : 'border border-ink-light text-silver hover:border-cinnabar/50 hover:text-cinnabar',
                )}
              >
                {layout.selected ? '✓ 已选择此方案' : '选择此方案'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 大图预览 */}
      {showPreview && previewLayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-darkest/90 p-8"
          onClick={() => setShowPreview(null)}
        >
          <button
            onClick={() => setShowPreview(null)}
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-ink-dark/80 text-rice hover:bg-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <LayoutPlaceholder layoutId={previewLayout.id} primaryColor={projectInfo.primaryColor} />
          </div>
        </div>
      )}

      <StepActions
        nextLabel="去生成封面"
        nextDisabled={!canProceed}
        onNext={() => canProceed && setCurrentStep('final')}
      />
    </div>
  );
}
