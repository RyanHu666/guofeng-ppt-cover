'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { useSSE, stopGeneration } from '@/hooks/use-sse';
import { StepHeader, StepActions, Card, SectionTitle } from './step-layout';
import type { StyleAnalysis, ElementItem } from '@/lib/types';
import {
  Sparkles,
  Palette,
  Layers,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepAnalyze() {
  const { projectInfo, styleAnalysis, setStyleAnalysis, setElements, canGoToStep } = useApp();
  const [taskId, setTaskId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { connect } = useSSE({
    onProgress: (prog) => {
      setProgress(prog.progress);
      setMessage(prog.message);
      if (prog.taskId) setTaskId(prog.taskId);
    },
    onCompleted: (data) => {
      const analysis = data as StyleAnalysis;
      setStyleAnalysis(analysis);
      // 同时初始化元素列表
      const elements: ElementItem[] = analysis.elementSuggestions.map((suggestion, index) => ({
        id: `elem_${Date.now()}_${index}`,
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
        status: 'idle',
        confirmed: false,
      }));
      setElements(elements);
      setIsAnalyzing(false);
    },
    onError: (err) => {
      setError(err);
      setIsAnalyzing(false);
    },
    onCancelled: () => {
      setIsAnalyzing(false);
      setMessage('已终止分析');
    },
  });

  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    setMessage('正在启动分析...');

    connect('/api/analyze', {
      projectName: projectInfo.name,
      subtitle: projectInfo.subtitle,
      description: projectInfo.description,
      style: projectInfo.style,
      primaryColor: projectInfo.primaryColor,
      referenceImages: projectInfo.referenceImages,
    });
  }, [connect, projectInfo]);

  const handleStop = async () => {
    if (taskId) {
      await stopGeneration(taskId);
    }
  };

  // 进入此步骤时自动开始分析
  useEffect(() => {
    if (
      projectInfo.referenceImages.length > 0 &&
      !styleAnalysis &&
      !isAnalyzing &&
      !error
    ) {
      const timer = setTimeout(() => {
        startAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [projectInfo.referenceImages.length, styleAnalysis, isAnalyzing, error, startAnalysis]);

  const canProceed = canGoToStep('elements');

  return (
    <div>
      <StepHeader
        stepNumber={2}
        title="AI 风格分析"
        description="AI将深度分析参考图片，提取风格关键词、配色方案和元素建议"
      />

      {/* 分析控制区 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cinnabar/20 text-cinnabar">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rice">AI视觉分析</h3>
              <p className="text-xs text-silver">
                {projectInfo.referenceImages.length} 张参考图待分析
              </p>
            </div>
          </div>

          {!isAnalyzing && !styleAnalysis && (
            <button
              onClick={startAnalysis}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cinnabar to-ochre px-5 py-2.5 text-sm font-medium text-rice shadow-lg shadow-cinnabar/20 transition-all hover:shadow-xl hover:shadow-cinnabar/30"
            >
              <Play className="h-4 w-4" />
              开始分析
            </button>
          )}

          {isAnalyzing && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg border border-cinnabar/30 bg-cinnabar/10 px-5 py-2.5 text-sm font-medium text-cinnabar transition-all hover:bg-cinnabar/20"
            >
              <Square className="h-4 w-4" />
              终止分析
            </button>
          )}

          {styleAnalysis && !isAnalyzing && (
            <button
              onClick={startAnalysis}
              className="flex items-center gap-2 rounded-lg border border-ink-light bg-ink-dark/50 px-5 py-2.5 text-sm text-silver transition-all hover:border-ink hover:text-rice"
            >
              <RefreshCw className="h-4 w-4" />
              重新分析
            </button>
          )}
        </div>

        {/* 进度条 */}
        {(isAnalyzing || (progress > 0 && progress < 100)) && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-silver">{message}</span>
              <span className="text-terracotta font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-dark">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cinnabar to-ochre transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-cinnabar-dark/30 bg-cinnabar-dark/10 p-4">
            <AlertCircle className="h-5 w-5 text-cinnabar-dark flex-shrink-0" />
            <div>
              <p className="text-sm text-rice">分析失败</p>
              <p className="text-xs text-silver mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </Card>

      {/* 分析结果 */}
      {styleAnalysis && (
        <div className="space-y-6 animate-ink-spread">
          {/* 整体风格描述 */}
          <Card glow>
            <SectionTitle title="整体风格" />
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-bamboo" />
              </div>
              <p className="text-base text-rice leading-relaxed font-serif">
                {styleAnalysis.overallStyle}
              </p>
            </div>
          </Card>

          {/* 风格关键词 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-ochre" />
              <SectionTitle title="风格关键词" description="AI提取的风格特征词" />
            </div>
            <div className="flex flex-wrap gap-2">
              {styleAnalysis.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full border border-ink-light bg-ink-dark/50 px-3 py-1.5 text-sm text-silver transition-all hover:border-cinnabar/30 hover:text-rice"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Card>

          {/* 配色方案 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-terracotta" />
              <SectionTitle title="配色方案" description="从参考图中提取的主色调" />
            </div>
            <div className="grid grid-cols-5 gap-4">
              {styleAnalysis.colorPalette.map((color, index) => (
                <div
                  key={index}
                  className="group rounded-lg border border-ink-light bg-ink-dark/30 p-3 transition-all hover:border-ink"
                >
                  <div
                    className="mb-3 aspect-square w-full rounded-md shadow-inner"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-sm font-medium text-rice">{color.name}</div>
                  <div className="text-xs text-mossy font-mono mt-0.5">{color.hex}</div>
                  <div className="text-xs text-silver mt-1 line-clamp-2">{color.usage}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 元素建议 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-celadon" />
              <SectionTitle
                title="元素建议"
                description="AI推荐的封面设计元素，下一步可生成这些元素"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {styleAnalysis.elementSuggestions.map((element, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-ink-light bg-ink-dark/30 p-4 transition-all hover:border-ink"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-medium',
                      element.category === '装饰' && 'bg-cinnabar/20 text-cinnabar',
                      element.category === '主体' && 'bg-ochre/20 text-ochre',
                      element.category === '背景' && 'bg-celadon/20 text-celadon',
                      element.category === '纹理' && 'bg-bamboo/20 text-bamboo',
                    )}
                  >
                    {element.category.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-rice">{element.name}</div>
                    <div className="text-xs text-silver mt-1 leading-relaxed">
                      {element.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 空状态 */}
      {!styleAnalysis && !isAnalyzing && (
        <Card className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-dark">
            <Sparkles className="h-8 w-8 text-mossy" />
          </div>
          <h3 className="text-lg font-medium text-silver mb-2">等待分析结果将展示在这里</h3>
          <p className="text-sm text-mossy max-w-md mx-auto">
            点击上方「开始分析」按钮，AI将为你深度解析参考图片的风格特征</p>
        </Card>
      )}

      <StepActions
        nextLabel="去生成元素"
        nextDisabled={!canProceed}
      />
    </div>
  );
}
