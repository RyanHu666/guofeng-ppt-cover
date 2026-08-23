'use client';

import { useApp } from '@/lib/store';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepHeaderProps {
  title: string;
  description: string;
  stepNumber: number;
}

export function StepHeader({ title, description, stepNumber }: StepHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cinnabar/20 text-xs font-semibold text-cinnabar">
          {stepNumber}
        </span>
        <span className="text-xs text-silver uppercase tracking-wider">Step {stepNumber}</span>
      </div>
      <h2 className="text-2xl font-semibold text-rice mb-2 font-serif">{title}</h2>
      <p className="text-silver">{description}</p>
    </div>
  );
}

interface StepActionsProps {
  canBack?: boolean;
  canNext?: boolean;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLoading?: boolean;
  nextDisabled?: boolean;
}

export function StepActions({
  canBack = true,
  canNext = true,
  nextLabel = '下一步',
  onBack,
  onNext,
  nextLoading = false,
  nextDisabled = false,
}: StepActionsProps) {
  const { setCurrentStep, currentStep, steps, canGoToStep } = useApp();

  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1].id : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1].id : null;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (nextStep && canGoToStep(nextStep)) {
      setCurrentStep(nextStep);
    }
  };

  const showBack = canBack && prevStep;
  const showNext = canNext && nextStep;

  if (!showBack && !showNext && !onNext) return null;

  return (
    <div className="mt-10 flex items-center justify-between border-t border-ink-light pt-6">
      <div>
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg border border-ink-light bg-ink-dark/50 px-5 py-2.5 text-sm text-silver transition-all hover:border-ink hover:bg-ink-dark hover:text-rice"
          >
            <ArrowLeft className="h-4 w-4" />
            上一步
          </button>
        )}
      </div>

      <div>
        {(showNext || onNext) && (
          <button
            onClick={handleNext}
            disabled={nextDisabled || nextLoading || Boolean(showNext && !canGoToStep(nextStep!))}
            className={cn(
              'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all',
              nextDisabled || nextLoading
                ? 'cursor-not-allowed bg-ink-dark text-mossy'
                : 'bg-gradient-to-r from-cinnabar to-ochre text-rice shadow-lg shadow-cinnabar/20 hover:shadow-cinnabar/30 hover:shadow-xl',
            )}
          >
            {nextLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-rice/30 border-t-rice" />
            )}
            {nextLabel}
            {!nextLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className, glow = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-light bg-ink-darker/60 backdrop-blur-sm p-6',
        glow && 'glow-border',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-rice">{title}</h3>
      {description && <p className="mt-1 text-sm text-silver">{description}</p>}
    </div>
  );
}
