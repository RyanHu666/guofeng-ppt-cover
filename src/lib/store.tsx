'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type {
  ProjectInfo,
  StyleAnalysis,
  ElementItem,
  LayoutOption,
  FinalCover,
  CoverHistoryItem,
  StyleType,
} from '@/lib/types';

export type StepId = 'input' | 'analyze' | 'elements' | 'layouts' | 'final';

interface AppState {
  // 步骤
  currentStep: StepId;
  steps: Array<{ id: StepId; label: string; description: string }>;
  setCurrentStep: (step: StepId) => void;
  canGoToStep: (step: StepId) => boolean;

  // 项目信息（步骤1）
  projectInfo: ProjectInfo;
  updateProjectInfo: (info: Partial<ProjectInfo>) => void;

  // 风格分析（步骤2）
  styleAnalysis: StyleAnalysis | null;
  setStyleAnalysis: (analysis: StyleAnalysis | null) => void;
  isAnalyzed: boolean;

  // 元素列表（步骤3）
  elements: ElementItem[];
  setElements: (elements: ElementItem[]) => void;
  updateElement: (id: string, updates: Partial<ElementItem>) => void;
  addElement: (element: Omit<ElementItem, 'id' | 'status' | 'confirmed'>) => void;
  removeElement: (id: string) => void;
  toggleElementConfirm: (id: string) => void;
  confirmedElementsCount: number;

  // 排版方案（步骤4）
  layouts: LayoutOption[];
  setLayouts: (layouts: LayoutOption[] | ((prev: LayoutOption[]) => LayoutOption[])) => void;
  updateLayout: (id: string, updates: Partial<LayoutOption>) => void;
  selectLayout: (id: string) => void;
  selectedLayout: LayoutOption | null;

  // 最终封面（步骤5）
  finalCover: FinalCover;
  updateFinalCover: (updates: Partial<FinalCover>) => void;
  addCoverHistory: (item: Omit<CoverHistoryItem, 'id' | 'timestamp'>) => void;
}

const AppContext = createContext<AppState | null>(null);

const STEPS: Array<{ id: StepId; label: string; description: string }> = [
  { id: 'input', label: '需求输入', description: '项目信息与参考图' },
  { id: 'analyze', label: 'AI分析', description: '提取风格与元素建议' },
  { id: 'elements', label: '元素生成', description: 'AI生成设计元素' },
  { id: 'layouts', label: '排版方案', description: '多版布局选择' },
  { id: 'final', label: '封面出图', description: '最终高清封面' },
];

const initialProjectInfo: ProjectInfo = {
  name: '',
  subtitle: '',
  description: '',
  style: 'ink-wash',
  primaryColor: '#2d4a3f',
  referenceImages: [],
};

const initialFinalCover: FinalCover = {
  status: 'idle',
  imageToImageStrength: 0.5,
  history: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStepState] = useState<StepId>('input');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(initialProjectInfo);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null);
  const [elements, setElements] = useState<ElementItem[]>([]);
  const [layouts, setLayouts] = useState<LayoutOption[]>([]);
  const [finalCover, setFinalCover] = useState<FinalCover>(initialFinalCover);

  // 是否可以跳转到某步骤
  const canGoToStep = useCallback(
    (step: StepId): boolean => {
      const stepOrder: StepId[] = ['input', 'analyze', 'elements', 'layouts', 'final'];
      const currentIdx = stepOrder.indexOf(currentStep);
      const targetIdx = stepOrder.indexOf(step);

      // 可以回退
      if (targetIdx < currentIdx) return true;

      // 下一步需要满足前置条件
      switch (step) {
        case 'input':
          return true;
        case 'analyze':
          return projectInfo.name.length > 0 && projectInfo.referenceImages.length > 0;
        case 'elements':
          return !!styleAnalysis;
        case 'layouts':
          return elements.some((e) => e.confirmed) || elements.length > 0;
        case 'final':
          return layouts.some((l) => l.selected);
        default:
          return false;
      }
    },
    [currentStep, projectInfo, styleAnalysis, elements, layouts],
  );

  const setCurrentStep = useCallback((step: StepId) => {
    setCurrentStepState(step);
  }, []);

  const updateProjectInfo = useCallback((info: Partial<ProjectInfo>) => {
    setProjectInfo((prev) => ({ ...prev, ...info }));
  }, []);

  const isAnalyzed = !!styleAnalysis;

  const updateElement = useCallback((id: string, updates: Partial<ElementItem>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    );
  }, []);

  const addElement = useCallback(
    (element: Omit<ElementItem, 'id' | 'status' | 'confirmed'>) => {
      const newElement: ElementItem = {
        ...element,
        id: `elem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        status: 'idle',
        confirmed: false,
      };
      setElements((prev) => [...prev, newElement]);
    },
    [],
  );

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
  }, []);

  const toggleElementConfirm = useCallback((id: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, confirmed: !el.confirmed } : el)),
    );
  }, []);

  const confirmedElementsCount = useMemo(
    () => elements.filter((e) => e.confirmed && e.imageUrl).length,
    [elements],
  );

  const updateLayout = useCallback((id: string, updates: Partial<LayoutOption>) => {
    setLayouts((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    );
  }, []);

  const selectLayout = useCallback((id: string) => {
    setLayouts((prev) =>
      prev.map((l) => ({ ...l, selected: l.id === id })),
    );
  }, []);

  const selectedLayout = useMemo(
    () => layouts.find((l) => l.selected) || null,
    [layouts],
  );

  const updateFinalCover = useCallback((updates: Partial<FinalCover>) => {
    setFinalCover((prev) => ({ ...prev, ...updates }));
  }, []);

  const addCoverHistory = useCallback((item: Omit<CoverHistoryItem, 'id' | 'timestamp'>) => {
    setFinalCover((prev) => {
      const newItem: CoverHistoryItem = {
        ...item,
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      return {
        ...prev,
        history: [newItem, ...prev.history].slice(0, 20), // 最多保留20张
      };
    });
  }, []);

  const value: AppState = {
    currentStep,
    steps: STEPS,
    setCurrentStep,
    canGoToStep,
    projectInfo,
    updateProjectInfo,
    styleAnalysis,
    setStyleAnalysis,
    isAnalyzed,
    elements,
    setElements,
    updateElement,
    addElement,
    removeElement,
    toggleElementConfirm,
    confirmedElementsCount,
    layouts,
    setLayouts,
    updateLayout,
    selectLayout,
    selectedLayout,
    finalCover,
    updateFinalCover,
    addCoverHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
