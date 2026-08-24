'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/lib/store';
import { StepHeader, StepActions, Card, SectionTitle } from './step-layout';
import { cn } from '@/lib/utils';
import { Upload, Search, Heart, Trash2, Grid, List, Image as ImageIcon, Loader2, X, Check } from 'lucide-react';
import { MATERIAL_CATEGORIES } from '@/lib/material-types';
import type { MaterialItem } from '@/lib/material-types';

// 外部图片走代理，解决防盗链和跨域问题
const proxyImage = (url: string) => {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  return `/api/materials/proxy?url=${encodeURIComponent(url)}`;
};

type TabType = 'search' | 'library';

export function StepElements() {
  const {
    projectInfo,
    styleAnalysis,
    currentStep,
    setCurrentStep,
    elements,
    setElements,
    updateProjectInfo,
    steps,
  } = useApp();

  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  const prevStep = () => {
    if (currentIdx > 0) setCurrentStep(steps[currentIdx - 1].id);
  };
  const nextStep = () => {
    if (currentIdx < steps.length - 1) setCurrentStep(steps[currentIdx + 1].id);
  };

  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchKeyword, setSearchKeyword] = useState('古风山水');
  const [searchCategory, setSearchCategory] = useState('all');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<MaterialItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<MaterialItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchSource, setSearchSource] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 选中的素材列表
  const selectedItems = (activeTab === 'search' ? searchResults : libraryItems).filter((it) =>
    selectedIds.has(it.id)
  );

  // 执行搜索
  const doSearch = useCallback(
    async (kw: string, cat: string, pg: number) => {
      if (!kw.trim()) return;
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch('/api/materials/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw, category: cat, page: pg, perPage: 24 }),
        });
        const data = await res.json();
        if (data.error) {
          setErrorMsg(data.error);
        }
        const items: MaterialItem[] = data.items || [];
        setSearchSource(data.source || '');
        if (pg === 1) {
          setSearchResults(items);
        } else {
          setSearchResults((prev) => [...prev, ...items]);
        }
        setSearchTotal(data.total || 0);
      } catch (e: any) {
        setErrorMsg(e.message || '搜索失败');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 加载素材库
  const loadLibrary = useCallback(async (cat: string) => {
    setLibraryLoading(true);
    try {
      const res = await fetch(`/api/materials/list?category=${cat}&limit=40`);
      const data = await res.json();
      setLibraryItems(data.items || []);
      setLibraryTotal(data.total || 0);
    } catch (e: any) {
      console.error('加载素材库失败', e);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  // 初始加载：根据风格分析自动生成搜索关键词
  useEffect(() => {
    if (currentStep !== 'elements') return;

    // 如果有风格分析结果，自动生成搜索词
    if (styleAnalysis && styleAnalysis.keywords && styleAnalysis.keywords.length > 0) {
      const kw = styleAnalysis.keywords.slice(0, 2).join(' ');
      setSearchKeyword(kw);
      doSearch(kw, searchCategory, 1);
    } else {
      // 默认关键词
      const defaultKw =
        projectInfo.style === 'ink-wash'
          ? '水墨山水'
          : projectInfo.style === 'light-green'
            ? '青绿山水'
            : '国风插画';
      setSearchKeyword(defaultKw);
      doSearch(defaultKw, searchCategory, 1);
    }

    loadLibrary(libraryCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleSearch = () => {
    setPage(1);
    doSearch(searchKeyword, searchCategory, 1);
  };

  const handleSearchCategoryChange = (cat: string) => {
    setSearchCategory(cat);
    setPage(1);
    doSearch(searchKeyword, cat, 1);
  };

  const handleLibraryCategoryChange = (cat: string) => {
    setLibraryCategory(cat);
    loadLibrary(cat);
  };

  const loadMore = useCallback(() => {
    if (loading) return;
    if (searchResults.length >= searchTotal && searchTotal > 0) return;
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(searchKeyword, searchCategory, nextPage);
  }, [loading, page, searchKeyword, searchCategory, searchResults.length, searchTotal, doSearch]);

  // 收藏到素材库
  const saveToLibrary = async (item: MaterialItem) => {
    setSavingId(item.id);
    try {
      const res = await fetch('/api/materials/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          category: searchCategory === 'all' ? 'other' : searchCategory,
        }),
      });
      const data = await res.json();
      if (data.item) {
        // 收藏成功，刷新素材库
        loadLibrary(libraryCategory);
      }
    } catch (e: any) {
      console.error('收藏失败', e);
      alert('收藏失败: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  // 删除素材
  const deleteItem = async (id: string) => {
    if (!confirm('确定删除这个素材吗？')) return;
    try {
      const res = await fetch(`/api/materials/delete?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadLibrary(libraryCategory);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (e) {
      console.error('删除失败', e);
    }
  };

  // 切换选中状态
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 上传处理
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    formData.append('category', libraryCategory === 'all' ? 'other' : libraryCategory);

    try {
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.items) {
        loadLibrary(libraryCategory);
      }
    } catch (err: any) {
      alert('上传失败: ' + err.message);
    }

    // 清空 input 允许重复上传
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 把选中素材同步到全局状态（用于最终封面生成）
  const handleNext = () => {
    const allItems = [...searchResults, ...libraryItems];
    const selected = allItems.filter((it) => selectedIds.has(it.id));

    // 转换成 ElementItem 格式存到全局
    const elementList = selected.map((m, idx) => ({
      id: `mat_${m.id}`,
      name: m.title || `素材${idx + 1}`,
      description: m.description || m.title || '',
      category: '主体',
      status: 'succeeded',
      imageUrl: m.midUrl || m.thumbUrl,
      confirmed: true,
      prompt: m.title,
    }));

    setElements(elementList as any);

    // 同时把素材描述附加到 projectInfo.description，方便最终提示词使用
    if (elementList.length > 0) {
      const materialDesc = elementList
        .map((m) => `- ${m.name}${m.description ? '：' + m.description : ''}`)
        .join('\n');
      updateProjectInfo({
        description: (projectInfo.description || '') + '\n\n【参考素材】\n' + materialDesc,
      });
    }

    nextStep();
  };

  const items = activeTab === 'search' ? searchResults : libraryItems;
  const isSearchTab = activeTab === 'search';

  // 滚动到底部自动加载更多
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSearchTab) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loading) return;
      if (searchResults.length >= searchTotal && searchTotal > 0) return;
      if (searchResults.length === 0) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isSearchTab, loading, searchResults.length, searchTotal, loadMore]);

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        stepNumber={3}
        title="素材库"
        description="搜索或上传古风素材，选择要融入封面的元素"
      />

      {/* Tab 切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            isSearchTab
              ? 'bg-[var(--cinnabar)] text-white shadow-lg shadow-[var(--cinnabar)]/20'
              : 'bg-[var(--ink-mid)] text-[var(--silver)] hover:bg-[var(--bamboo)]/20'
          )}
        >
          <Search className="w-4 h-4 inline mr-2" />
          花瓣搜索
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            !isSearchTab
              ? 'bg-[var(--cinnabar)] text-white shadow-lg shadow-[var(--cinnabar)]/20'
              : 'bg-[var(--ink-mid)] text-[var(--silver)] hover:bg-[var(--bamboo)]/20'
          )}
        >
          <Grid className="w-4 h-4 inline mr-2" />
          我的素材库
          <span className="ml-2 text-xs opacity-70">({libraryTotal})</span>
        </button>
      </div>

      {/* 搜索栏 & 上传按钮 */}
      <Card className="p-4">
        {isSearchTab ? (
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索素材，如：水墨山水、古风花鸟、云纹..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--ink-dark)] border border-[#333] text-white text-sm focus:outline-none focus:border-[var(--cinnabar)] transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-5 py-2.5 bg-[var(--cinnabar)] text-white rounded-lg text-sm font-medium hover:bg-[var(--ochre)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                搜索
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="text-sm text-[var(--silver)]">
              共 {libraryTotal} 个素材 · 收藏的素材都在这里
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--bamboo)] text-white rounded-lg text-sm font-medium hover:bg-[var(--mossy)] transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                上传素材
              </button>
            </div>
          </div>
        )}

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {MATERIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                isSearchTab
                  ? handleSearchCategoryChange(cat.id)
                  : handleLibraryCategoryChange(cat.id)
              }
              className={cn(
                'px-3 py-1.5 rounded-full text-xs transition-all',
                (isSearchTab ? searchCategory : libraryCategory) === cat.id
                  ? 'bg-[var(--cinnabar)]/20 text-[var(--terracotta)] border border-[var(--cinnabar)]/40'
                  : 'bg-[var(--ink-mid)] text-[var(--silver)] border border-transparent hover:border-[#333]'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </Card>

      {/* 搜索来源提示 */}
      {activeTab === 'search' && searchSource && items.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--silver)]/70">
          <span>
            搜索来源：
            <span className="text-[var(--ochre)] font-medium">
              {searchSource === 'bing'
                ? '必应图片搜索'
                : searchSource === 'pixabay'
                  ? 'Pixabay 免费图库'
                  : searchSource === 'huaban'
                    ? '花瓣网'
                    : searchSource}
            </span>
          </span>
          {searchSource !== 'bing' && (
            <span className="text-[var(--silver)]/50">
              （配置 BING_SEARCH_KEY 可获得更精准的搜索结果）
            </span>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {errorMsg && (
        <div className="px-4 py-3 bg-[var(--cinnabar)]/10 border border-[var(--cinnabar)]/30 rounded-lg text-sm text-[var(--terracotta)]">
          {errorMsg}
        </div>
      )}

      {/* 素材网格 */}
      <div className="relative">
        {loading && items.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--cinnabar)] mb-3" />
            <p className="text-[var(--silver)] text-sm">搜索中...</p>
          </div>
        ) : libraryLoading && items.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--cinnabar)] mb-3" />
            <p className="text-[var(--silver)] text-sm">加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-[var(--jade)]/30 mb-3" />
            <p className="text-[var(--silver)] text-sm mb-2">
              {isSearchTab ? '暂无搜索结果，换个关键词试试' : '素材库还是空的'}
            </p>
            {!isSearchTab && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[var(--terracotta)] text-sm hover:underline"
              >
                上传第一批素材
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {items.map((item) => (
                <MaterialCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  saving={savingId === item.id}
                  onToggle={() => toggleSelect(item.id)}
                  onPreview={() => {
                    setPreviewItem(item);
                    setPreviewImage(item.midUrl || item.originalUrl || item.thumbUrl);
                  }}
                  onSave={isSearchTab ? () => saveToLibrary(item) : undefined}
                  onDelete={!isSearchTab ? () => deleteItem(item.id) : undefined}
                />
              ))}
            </div>

            {/* 加载更多 / 没有更多了 */}
            {isSearchTab && searchResults.length > 0 && (
              <div className="text-center mt-6 mb-4">
                {searchResults.length >= searchTotal ? (
                  <p className="text-sm text-[var(--ink-light)]">—— 没有更多了 ——</p>
                ) : loading ? (
                  <p className="text-sm text-[var(--silver)]">加载中...</p>
                ) : (
                  <button
                    onClick={loadMore}
                    className="px-6 py-2 bg-[var(--ink-mid)] text-[var(--silver)] rounded-lg text-sm hover:bg-[var(--ink-mid)]/80 transition-colors"
                  >
                    加载更多
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部已选提示 */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-5 py-3 bg-[var(--ink-dark)] border border-[var(--cinnabar)]/40 rounded-full shadow-2xl flex items-center gap-4">
            <span className="text-sm text-[var(--silver)]">
              已选 <span className="text-[var(--terracotta)] font-semibold">{selectedIds.size}</span> 个素材
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-[var(--silver)] hover:text-white"
            >
              清空
            </button>
          </div>
        </div>
      )}

      {/* 大图预览 */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewItem(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={proxyImage(previewImage)}
              alt={previewItem.title}
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
            />
            <div className="mt-3 text-white text-sm">
              <p className="font-medium">{previewItem.title}</p>
              {previewItem.description && (
                <p className="text-white/60 text-xs mt-1">{previewItem.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <StepActions
        canBack={true}
        canNext={true}
        nextLabel={selectedIds.size > 0 ? `下一步（已选 ${selectedIds.size} 个）` : '下一步（跳过）'}
        onBack={prevStep}
        onNext={handleNext}
        nextDisabled={false}
      />
    </div>
  );
}

// 素材卡片组件
function MaterialCard({
  item,
  selected,
  saving,
  onToggle,
  onPreview,
  onSave,
  onDelete,
}: {
  item: MaterialItem;
  selected: boolean;
  saving: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={cn(
        'group relative rounded-lg overflow-hidden bg-[var(--ink-mid)] cursor-pointer transition-all',
        'border-2',
        selected ? 'border-[var(--cinnabar)]' : 'border-transparent hover:border-[#444]'
      )}
      onClick={onToggle}
    >
      {/* 图片区 */}
      <div className="aspect-square relative bg-[var(--ink-dark)]">
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--silver)]/30" />
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[var(--silver)]/20" />
          </div>
        ) : (
          <img
            src={proxyImage(item.thumbUrl)}
            alt={item.title}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* 选中标记 */}
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--cinnabar)] rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* 悬浮操作栏 */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
            title="预览大图"
          >
            <List className="w-4 h-4 text-white" />
          </button>
          {onSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              disabled={saving}
              className="p-1.5 bg-white/20 rounded hover:bg-[var(--cinnabar)]/60 transition-colors disabled:opacity-50"
              title="收藏到素材库"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Heart className="w-4 h-4 text-white" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 bg-white/20 rounded hover:bg-red-500/60 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div className="p-2">
        <p className="text-xs text-[var(--rice)] truncate">{item.title || '未命名素材'}</p>
        <p className="text-[10px] text-[var(--silver)]/50 mt-0.5">
          {item.source === 'huaban' ? '花瓣网' : item.source === 'upload' ? '本地上传' : '素材库'}
        </p>
      </div>
    </div>
  );
}
