'use client';

import { useApp, type StepId } from '@/lib/store';
import {
  FileText,
  Sparkles,
  Layers,
  LayoutGrid,
  Image as ImageIcon,
  Check,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stepIcons: Record<StepId, React.ComponentType<{ className?: string }>> = {
  input: FileText,
  analyze: Sparkles,
  elements: Layers,
  layouts: LayoutGrid,
  final: ImageIcon,
};

export function StepSidebar() {
  const { currentStep, steps, setCurrentStep, canGoToStep, isAnalyzed, confirmedElementsCount, selectedLayout } = useApp();

  const isStepCompleted = (stepId: StepId): boolean => {
    const stepOrder: StepId[] = ['input', 'analyze', 'elements', 'layouts', 'final'];
    const currentIdx = stepOrder.indexOf(currentStep);
    const stepIdx = stepOrder.indexOf(stepId);
    if (stepIdx < currentIdx) return true;

    // 检查步骤自身完成状态
    switch (stepId) {
      case 'analyze':
        return isAnalyzed;
      case 'elements':
        return confirmedElementsCount > 0;
      case 'layouts':
        return !!selectedLayout;
      default:
        return false;
    }
  };

  return (
    <aside className="w-60 flex-shrink-0 border-r border-ink-light bg-ink-darker/80 backdrop-blur-sm">
      {/* Logo 区域 */}
      <div className="flex h-16 items-center gap-3 border-b border-ink-light px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cinnabar to-ochre text-rice shadow-lg shadow-cinnabar/20">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-rice">墨韵封面</h1>
          <p className="text-xs text-silver">古风PPT设计工作台</p>
        </div>
      </div>

      {/* 步骤列表 */}
      <nav className="p-3">
        <ul className="space-y-1">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.id];
            const isActive = currentStep === step.id;
            const canGo = canGoToStep(step.id);
            const completed = isStepCompleted(step.id);

            return (
              <li key={step.id}>
                <button
                  onClick={() => canGo && setCurrentStep(step.id)}
                  disabled={!canGo && !completed}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200',
                    isActive
                      ? 'bg-ink text-rice shadow-inner'
                      : canGo
                        ? 'hover:bg-ink-dark/50 text-silver hover:text-rice'
                        : 'cursor-not-allowed opacity-50',
                  )}
                >
                  {/* 步骤序号/状态 */}
                  <div
                    className={cn(
                      'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-cinnabar text-rice shadow-md shadow-cinnabar/30'
                        : completed
                          ? 'bg-bamboo/20 text-bamboo'
                          : 'bg-ink-dark text-mossy',
                    )}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : !canGo ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  {/* 步骤信息 */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-rice' : canGo ? 'text-silver group-hover:text-rice' : 'text-mossy',
                      )}
                    >
                      {index + 1}. {step.label}
                    </div>
                    <div className="text-xs text-mossy truncate">{step.description}</div>
                  </div>

                  {/* 激活指示条 */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-l bg-cinnabar" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* 进度提示 */}
        <div className="mt-6 rounded-lg border border-ink-light bg-ink-dark/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-silver">当前进度</span>
            <span className="text-xs font-medium text-terracotta">
              {Math.round(
                (steps.findIndex((s) => s.id === currentStep) / (steps.length - 1)) * 100,
              )}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cinnabar to-ochre transition-all duration-500"
              style={{
                width: `${(steps.findIndex((s) => s.id === currentStep) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </nav>

      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 w-60 p-4 border-t border-ink-light">
        <p className="text-center text-xs text-mossy">
          · 墨韵流转 · 意象天成 ·
        </p>
      </div>
    </aside>
  );
}
