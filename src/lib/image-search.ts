// 多源图片搜索 - 必应图片搜索 + Pixabay + Pinterest（必应 site 限定）
// 按优先级依次尝试，有结果就返回

export interface SearchResultItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  source: string; // bing / pixabay / huaban
  sourceUrl: string;
  width: number;
  height: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  source: string;
  keyword: string;
  page: number;
}

// ========== 必应图片搜索 ==========
async function searchBing(keyword: string, page: number, perPage: number): Promise<SearchResult | null> {
  const apiKey = process.env.BING_SEARCH_KEY;
  if (!apiKey) return null;

  const offset = (page - 1) * perPage;
  // 优先搜透明 PNG + 大尺寸
  const query = encodeURIComponent(`${keyword} PNG transparent`);
  const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${query}&count=${perPage}&offset=${offset}&size=large&color=transparent&mkt=zh-CN&safeSearch=Moderate`;

  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: SearchResultItem[] = (data.value || []).map((img: any, i: number) => ({
      id: `bing_${img.imageId || offset + i}`,
      title: img.name || keyword,
      thumbnailUrl: img.thumbnailUrl,
      imageUrl: img.contentUrl,
      source: 'bing',
      sourceUrl: img.hostPageUrl || img.contentUrl,
      width: img.width || 0,
      height: img.height || 0,
    }));

    return {
      items,
      total: data.totalEstimatedMatches || items.length,
      source: 'bing',
      keyword,
      page,
    };
  } catch {
    return null;
  }
}

// ========== Pixabay 免费图片搜索 ==========
async function searchPixabay(keyword: string, page: number, perPage: number): Promise<SearchResult | null> {
  const apiKey = process.env.PIXABAY_KEY;
  if (!apiKey) return null;

  // Pixabay 中文搜索效果一般，加英文补充
  const enKeywordMap: Record<string, string> = {
    '山水': 'chinese landscape',
    '花鸟': 'chinese flowers birds',
    '云纹': 'cloud pattern chinese',
    '建筑': 'chinese architecture ancient',
    '人物': 'chinese ancient figure',
    '器物': 'chinese antique object',
    '水墨': 'ink wash painting',
    '古风': 'ancient chinese style',
    '国潮': 'chinese trendy',
    '青绿': 'blue green landscape',
  };

  let searchKw = keyword;
  for (const [cn, en] of Object.entries(enKeywordMap)) {
    if (keyword.includes(cn)) {
      searchKw = en;
      break;
    }
  }

  const query = encodeURIComponent(searchKw);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&image_type=illustration&per_page=${perPage}&page=${page}&orientation=horizontal&lang=zh`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const items: SearchResultItem[] = (data.hits || []).map((img: any) => ({
      id: `pixabay_${img.id}`,
      title: img.tags || keyword,
      thumbnailUrl: img.webformatURL || img.previewURL,
      imageUrl: img.largeImageURL || img.webformatURL,
      source: 'pixabay',
      sourceUrl: img.pageURL,
      width: img.imageWidth || 0,
      height: img.imageHeight || 0,
    }));

    return {
      items,
      total: data.totalHits || items.length,
      source: 'pixabay',
      keyword,
      page,
    };
  } catch {
    return null;
  }
}

// ========== Pinterest 搜索（通过必应图片 site 限定） ==========
async function searchPinterest(keyword: string, page: number, perPage: number): Promise<SearchResult | null> {
  const apiKey = process.env.BING_SEARCH_KEY;
  if (!apiKey) return null;

  const offset = (page - 1) * perPage;
  // 用必应图片搜索限定站点为 pinterest.com，获取古风素材
  const query = encodeURIComponent(`${keyword} chinese style site:pinterest.com`);
  const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${query}&count=${perPage}&offset=${offset}&size=large&mkt=zh-CN&safeSearch=Moderate`;

  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: SearchResultItem[] = (data.value || []).map((img: any, i: number) => ({
      id: `pinterest_${img.imageId || offset + i}`,
      title: img.name || keyword,
      thumbnailUrl: img.thumbnailUrl,
      imageUrl: img.contentUrl,
      source: 'pinterest',
      sourceUrl: img.hostPageUrl || img.contentUrl,
      width: img.width || 0,
      height: img.height || 0,
    }));

    if (items.length === 0) return null;

    return {
      items,
      total: data.totalEstimatedMatches || items.length,
      source: 'pinterest',
      keyword,
      page,
    };
  } catch {
    return null;
  }
}

// ========== 多源调度：按优先级依次尝试 ==========
export async function searchImages(
  keyword: string,
  page: number = 1,
  perPage: number = 20,
): Promise<SearchResult> {
  if (!keyword.trim()) {
    return { items: [], total: 0, source: 'none', keyword, page };
  }

  const sources = [
    { name: '必应图片', fn: () => searchBing(keyword, page, perPage) },
    { name: 'Pixabay', fn: () => searchPixabay(keyword, page, perPage) },
    { name: 'Pinterest', fn: () => searchPinterest(keyword, page, perPage) },
  ];

  const errors: string[] = [];

  for (const src of sources) {
    const result = await src.fn();
    if (result && result.items.length > 0) {
      return result;
    }
    errors.push(`${src.name}无结果或失败`);
  }

  // 全部失败
  console.warn('[searchImages] 所有搜索源均失败:', errors);
  return { items: [], total: 0, source: 'none', keyword, page };
}
