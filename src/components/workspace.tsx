'use client';

import { useApp } from '@/lib/store';
import { StepSidebar } from './step-sidebar';
import { StepInput } from './steps/step-input';
import { StepAnalyze } from './steps/step-analyze';
import { StepElements } from './steps/step-elements';
import { StepLayouts } from './steps/step-layouts';
import { StepFinal } from './steps/step-final';

export function Workspace() {
  const { currentStep } = useApp();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <StepSidebar />

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">
            {currentStep === 'input' && <StepInput />}
            {currentStep === 'analyze' && <StepAnalyze />}
            {currentStep === 'elements' && <StepElements />}
            {currentStep === 'layouts' && <StepLayouts />}
            {currentStep === 'final' && <StepFinal />}
          </div>
        </div>
      </main>
    </div>
  );
}
