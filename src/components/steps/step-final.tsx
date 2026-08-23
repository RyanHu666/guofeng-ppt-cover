'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useSSE } from '@/hooks/use-sse';
import { StepHeader, StepActions, Card, SectionTitle } from './step-layout';
import { CoverComposer } from '@/components/cover-composer';
import { LayoutPlaceholder } from '@/components/layout-placeholder';
import { cn } from '@/lib/utils';
import { STYLE_LABELS } from '@/lib/types';
import type { StyleType, ColorItem, ElementItem, GenerationProgress } from '@/lib/types';

export function StepFinal() {
  const {
    projectInfo,
    selectedLayout,
    styleAnalysis,
    elements,
    finalCover,
    updateFinalCover,
    setCurrentStep,
  } = useApp();

  const [error, setError] = useState<string | null>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  const confirmedElements = elements.filter((e) => e.confirmed);
  const imgStrength = finalCover.imageToImageStrength;
  const backgroundImage = finalCover.imageUrl;

  const { connect, disconnect, progress, taskId, isConnected } = useSSE({
    onProgress: (prog: GenerationProgress) => {
      if (prog.status === 'completed') {
        // 完成
        const payload = prog as unknown as { imageUrl?: string };
        if (payload.imageUrl) {
          updateFinalCover({ imageUrl: payload.imageUrl, status: 'completed' });
        }
        setError(null);
      } else if (prog.status === 'failed') {
        const payload = prog as unknown as { error?: string; message?: string };
        setError(payload.error || payload.message || '生成失败');
        updateFinalCover({ status: 'failed' });
      } else if (prog.status === 'cancelled') {
        updateFinalCover({ status: 'cancelled' });
      }
    },
    onCompleted: (data: unknown) => {
      const payload = data as { imageUrl?: string };
      if (payload?.imageUrl) {
        updateFinalCover({ imageUrl: payload.imageUrl, status: 'completed' });
      }
      setError(null);
    },
    onError: (errMsg: string) => {
      setError(errMsg || '生成失败');
      updateFinalCover({ status: 'failed' });
    },
  });

  const isGenerating = isConnected && finalCover.status !== 'completed' && finalCover.status !== 'failed';

  const handleGenerate = useCallback(() => {
    if (!selectedLayout || !projectInfo.name) return;

    setError(null);
    updateFinalCover({ imageUrl: undefined, status: 'generating' });

    connect('/api/generate/final', {
      projectName: projectInfo.name,
      subtitle: projectInfo.subtitle,
      description: projectInfo.description,
      style: projectInfo.style,
      primaryColor: projectInfo.primaryColor,
      layoutId: selectedLayout.id,
      layoutName: selectedLayout.name,
      strength: imgStrength,
      styleKeywords: styleAnalysis?.keywords || [],
      colorPalette: (styleAnalysis?.colorPalette || []) as ColorItem[],
      confirmedElements: confirmedElements as ElementItem[],
      referenceImages: projectInfo.referenceImages,
    });
  }, [
    projectInfo,
    selectedLayout,
    styleAnalysis,
    confirmedElements,
    imgStrength,
    updateFinalCover,
    connect,
  ]);

  const handleStop = useCallback(async () => {
    if (!taskId) return;
    try {
      await fetch('/api/generate/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, type: 'final' }),
      });
    } catch {
      /* ignore */
    }
    disconnect();
    updateFinalCover({ status: 'cancelled' });
  }, [taskId, disconnect, updateFinalCover]);

  // 下载背景图
  const handleDownload = useCallback(() => {
    if (!backgroundImage) return;
    const link = document.createElement('a');
    link.download = `${projectInfo.name || '封面'}-${selectedLayout?.name || '方案'}.png`;
    link.href = backgroundImage;
    link.target = '_blank';
    link.click();
  }, [backgroundImage, projectInfo.name, selectedLayout?.name]);

  const handleStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFinalCover({ imageToImageStrength: parseFloat(e.target.value) });
    },
    [updateFinalCover],
  );

  const canGenerate = !!projectInfo.name && !!selectedLayout;
  const progressPct = progress?.progress ?? 0;
  const progressMsg = progress?.message || '准备开始';

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <>
      <StepHeader
        title="封面出图"
        description="AI 生成高质量背景意境图，排版和文字用代码精确叠加"
        stepNumber={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* 左侧：封面预览区 */}
        <Card className="mb-6">
          <SectionTitle
            title="封面预览"
            description={`基于「${selectedLayout?.name || '未选择'}」方案${
              styleAnalysis?.keywords?.length
                ? ` · ${styleAnalysis.keywords.slice(0, 3).join('、')}`
                : ''
            }`}
          />

          <div
            ref={coverRef}
            className="w-full relative rounded-lg overflow-hidden"
          >
            {backgroundImage ? (
              <CoverComposer
                layoutId={selectedLayout?.id || 'layout-center'}
                title={projectInfo.name}
                subtitle={projectInfo.subtitle}
                primaryColor={projectInfo.primaryColor}
                backgroundImage={backgroundImage}
              />
            ) : error ? (
              <div className="aspect-video flex flex-col items-center justify-center bg-[#0f0f0f] border border-[#b84a4a30] rounded-lg">
                <div className="text-[#b84a4a] text-4xl mb-3">✕</div>
                <div className="text-[#e0e0e0] text-base mb-1">生成失败</div>
                <div className="text-[#999999] text-sm">{error}</div>
              </div>
            ) : isGenerating ? (
              <div className="aspect-video flex flex-col items-center justify-center bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg">
                <div className="relative w-16 h-16 mb-5">
                  <div
                    className="absolute inset-0 border-2 border-transparent border-t-[#c45c3b] rounded-full"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <div
                    className="absolute inset-1 border-2 border-transparent border-t-[#d4754e] rounded-full opacity-70"
                    style={{ animation: 'spin 1.5s linear infinite reverse' }}
                  />
                </div>
                <div className="text-[#e0e0e0] text-base mb-2">{progressMsg}</div>
                <div className="w-48 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#c45c3b] rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="text-[#999999] text-xs mt-2">{Math.round(progressPct)}%</div>
                <button
                  onClick={handleStop}
                  className="mt-5 px-4 py-1.5 text-sm text-[#b84a4a] border border-[#b84a4a30] rounded-md hover:bg-[#b84a4a15] transition-colors"
                >
                  终止生成
                </button>
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-[#0f0f0f] border border-dashed border-[#333333] rounded-lg">
                <div className="text-[#666666] text-5xl mb-3">🖼</div>
                <div className="text-[#999999] text-base mb-1">封面图预览区</div>
                <div className="text-[#666666] text-sm">AI 生成背景意境图 + 代码精确排版叠加</div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[#999999] text-sm">
              {backgroundImage
                ? '生成完成，可下载背景图'
                : canGenerate
                  ? '准备就绪，点击开始生成背景意境图'
                  : '请先完善项目信息和选择排版方案'}
            </p>
            <div className="flex items-center gap-3">
              {backgroundImage && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm text-[#e0e0e0] border border-[#333333] rounded-md hover:bg-[#1a1a1a] transition-colors"
                >
                  下载背景图
                </button>
              )}
              <button
                onClick={isGenerating ? handleStop : handleGenerate}
                disabled={!canGenerate && !isGenerating}
                className={cn(
                  'px-5 py-2 rounded-md text-sm font-medium transition-all',
                  isGenerating
                    ? 'bg-[#b84a4a] text-white hover:bg-[#a83a3a]'
                    : 'bg-[#c45c3b] text-white hover:bg-[#d4754e] shadow-lg shadow-[#c45c3b]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                )}
              >
                {isGenerating ? '终止生成' : backgroundImage ? '重新生成' : '▶ 生成背景图'}
              </button>
            </div>
          </div>
        </Card>

        {/* 右侧：配置信息 */}
        <div className="space-y-5">
          {/* 已选方案 */}
          <Card>
            <SectionTitle title="已选方案" />
            {selectedLayout ? (
              <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
                <LayoutPlaceholder
                  layoutId={selectedLayout.id}
                  primaryColor={projectInfo.primaryColor}
                />
                <div className="p-3 border-t border-[#222222]">
                  <div className="text-[#e0e0e0] text-sm font-medium">{selectedLayout.name}</div>
                  <div className="text-[#999999] text-xs mt-1">{selectedLayout.description}</div>
                </div>
              </div>
            ) : (
              <div className="text-[#666666] text-sm">请先在排版方案页选择一个方案</div>
            )}
          </Card>

          {/* 图生图强度 */}
          <Card>
            <SectionTitle
              title="图生图强度"
              description="控制参考图对最终结果的影响程度"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#999999] text-xs">参考强度</span>
                <span className="text-[#d4754e] text-sm font-medium">
                  {Math.round(imgStrength * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={imgStrength}
                onChange={handleStrengthChange}
                disabled={isGenerating}
                className="w-full accent-[#c45c3b]"
              />
              <div className="flex items-center justify-between">
                <span className="text-[#666666] text-xs">创意优先</span>
                <span className="text-[#666666] text-xs">忠实参考</span>
              </div>
            </div>
          </Card>

          {/* 项目信息 */}
          <Card>
            <SectionTitle title="项目信息" />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#999999]">项目名称</span>
                <span className="text-[#e0e0e0] text-right max-w-[60%] truncate">
                  {projectInfo.name || '-'}
                </span>
              </div>
              {projectInfo.subtitle && (
                <div className="flex justify-between">
                  <span className="text-[#999999]">副标题</span>
                  <span className="text-[#e0e0e0] text-right max-w-[60%] truncate">
                    {projectInfo.subtitle}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#999999]">设计风格</span>
                <span className="text-[#e0e0e0]">
                  {STYLE_LABELS[projectInfo.style as StyleType] || projectInfo.style}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#999999]">主色调</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: projectInfo.primaryColor }}
                  />
                  <span className="text-[#e0e0e0] font-mono text-xs">
                    {projectInfo.primaryColor.toUpperCase()}
                  </span>
                </div>
              </div>
              {styleAnalysis?.keywords?.length ? (
                <div className="flex justify-between gap-2">
                  <span className="text-[#999999] whitespace-nowrap">风格关键词</span>
                  <span className="text-[#e0e0e0] text-right text-xs">
                    {styleAnalysis.keywords.slice(0, 3).join('·')}
                  </span>
                </div>
              ) : null}
              {confirmedElements.length > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#999999] whitespace-nowrap">确认元素</span>
                  <span className="text-[#e0e0e0] text-right text-xs">
                    {confirmedElements.length} 个
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <StepActions
        onBack={() => setCurrentStep('layouts')}
        onNext={() => setCurrentStep('input')}
        nextLabel="完成"
        nextDisabled={!backgroundImage}
      />
    </>
  );
}
