// 多源图片搜索 - Pinterest看板RSS + 必应site限定 + Pixabay
// 按优先级依次尝试，有结果就返回

export interface SearchResultItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  source: string; // pinterest-board / pinterest-bing / bing / pixabay
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

// ========== Pinterest 看板 RSS 搜索（免费不限量）==========
// 精选国风素材看板，关键词匹配时从对应看板拉图
const PINTEREST_BOARDS: { keywords: string[]; url: string; name: string }[] = [
  {
    keywords: ['山水', '水墨', '青绿', '国画', '山水图', '山水画', '水墨画'],
    url: 'https://www.pinterest.com/Mason19991207/%E6%B0%B4%E5%A2%A8%E5%9C%8B%E7%95%AB.rss',
    name: '水墨国画',
  },
  {
    keywords: ['国潮', '新中式', '中国风', '古风', '国风'],
    url: 'https://www.pinterest.com/shipinyin/%E5%9B%BD%E6%BD%AE.rss',
    name: '国潮设计',
  },
  {
    keywords: ['国潮2', '潮流', '现代国风'],
    url: 'https://www.pinterest.com/lillleforest/%E5%9B%BD%E6%BD%AE.rss',
    name: '国潮灵感',
  },
  {
    keywords: ['敦煌', '飞天', '壁画', '丝路'],
    url: 'https://www.pinterest.com/jievan515/%E6%95%A6%E7%85%8C.rss',
    name: '敦煌艺术',
  },
  {
    keywords: ['武侠', '墨色', '侠客', '江湖', '武术', '剑', '特效'],
    url: 'https://www.pinterest.com/150f2554f01cb49/%E7%89%B9%E6%95%88-%E5%A2%A8%E8%89%B2-%E6%AD%A6%E4%BE%A0.rss',
    name: '墨色武侠',
  },
  {
    keywords: ['传统', '中式', '古典', '传统中式', '古代建筑', '古典园林'],
    url: 'https://www.pinterest.com/david5647/%E4%BC%A0%E7%BB%9F%E4%B8%AD%E5%BC%8F.rss',
    name: '传统中式',
  },
  {
    keywords: ['神佛', '造像', '佛像', '菩萨', '观音', '神像', '雕塑'],
    url: 'https://www.pinterest.com/lo2259737/%E7%A5%9E%E4%BD%9B-%E9%80%A0%E5%83%8F.rss',
    name: '神佛造像',
  },
];

function matchBoards(keyword: string): string[] {
  const kw = keyword.toLowerCase();
  const matched: string[] = [];
  for (const board of PINTEREST_BOARDS) {
    for (const k of board.keywords) {
      if (kw.includes(k.toLowerCase())) {
        matched.push(board.url);
        break;
      }
    }
  }
  // 如果没有匹配到，返回所有看板（尽量给结果）
  if (matched.length === 0) {
    return PINTEREST_BOARDS.map(b => b.url);
  }
  return matched;
}

async function fetchBoardRss(url: string): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, text/xml',
      },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const items: SearchResultItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let index = 0;

    while ((match = itemRegex.exec(text)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      let title = titleMatch ? titleMatch[1].trim() : '';
      title = title.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() || 'Pinterest素材';

      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const sourceUrl = linkMatch ? linkMatch[1].trim() : '';

      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
      let imageUrl = '';
      let thumbnailUrl = '';

      if (descMatch) {
        let desc = descMatch[1];
        desc = desc.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
        desc = desc
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'");

        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch) {
          thumbnailUrl = imgMatch[1];
          imageUrl = thumbnailUrl.replace('/236x/', '/originals/');
        }
      }

      if (imageUrl) {
        items.push({
          id: `pbt_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
          title,
          thumbnailUrl,
          imageUrl,
          source: 'pinterest-board',
          sourceUrl,
          width: 0,
          height: 0,
        });
        index++;
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function searchPinterestBoards(
  keyword: string,
  page: number,
  perPage: number,
): Promise<SearchResult | null> {
  const boardUrls = matchBoards(keyword);
  if (boardUrls.length === 0) return null;

  // 并发拉取所有匹配的看板
  const results = await Promise.all(
    boardUrls.map(url => fetchBoardRss(url))
  );

  // 合并所有结果并打乱顺序（让不同看板的图穿插显示）
  const allItems: SearchResultItem[] = [];
  const maxLen = Math.max(...results.map(r => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (const boardItems of results) {
      if (i < boardItems.length) {
        allItems.push(boardItems[i]);
      }
    }
  }

  // 分页
  const total = allItems.length;
  const start = (page - 1) * perPage;
  const pageItems = allItems.slice(start, start + perPage);

  if (pageItems.length === 0) return null;

  return {
    items: pageItems,
    total,
    source: 'pinterest-board',
    keyword,
    page,
  };
}

// ========== Pinterest 必应 site 限定搜索 ==========
async function searchPinterestBing(
  keyword: string,
  page: number,
  perPage: number,
): Promise<SearchResult | null> {
  const apiKey = process.env.BING_SEARCH_KEY;
  if (!apiKey) return null;

  const offset = (page - 1) * perPage;
  const query = encodeURIComponent(`${keyword} chinese style site:pinterest.com`);
  const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${query}&count=${perPage}&offset=${offset}&size=large&mkt=zh-CN&safeSearch=Moderate`;

  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: SearchResultItem[] = (data.value || []).map((img: any, i: number) => ({
      id: `pbin_${img.imageId || offset + i}`,
      title: img.name || keyword,
      thumbnailUrl: img.thumbnailUrl,
      imageUrl: img.contentUrl,
      source: 'pinterest-bing',
      sourceUrl: img.hostPageUrl || img.contentUrl,
      width: img.width || 0,
      height: img.height || 0,
    }));

    if (items.length === 0) return null;
    return { items, total: data.totalEstimatedMatches || items.length, source: 'pinterest-bing', keyword, page };
  } catch {
    return null;
  }
}

// ========== 必应图片搜索 ==========
async function searchBing(keyword: string, page: number, perPage: number): Promise<SearchResult | null> {
  const apiKey = process.env.BING_SEARCH_KEY;
  if (!apiKey) return null;

  const offset = (page - 1) * perPage;
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

    return { items, total: data.totalEstimatedMatches || items.length, source: 'bing', keyword, page };
  } catch {
    return null;
  }
}

// ========== Pixabay 免费图片搜索 ==========
async function searchPixabay(keyword: string, page: number, perPage: number): Promise<SearchResult | null> {
  const apiKey = process.env.PIXABAY_KEY;
  if (!apiKey) return null;

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

    return { items, total: data.totalHits || items.length, source: 'pixabay', keyword, page };
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
    { name: 'Pinterest看板', fn: () => searchPinterestBoards(keyword, page, perPage) },
    { name: 'Pinterest(必应)', fn: () => searchPinterestBing(keyword, page, perPage) },
    { name: '必应图片', fn: () => searchBing(keyword, page, perPage) },
    { name: 'Pixabay', fn: () => searchPixabay(keyword, page, perPage) },
  ];

  const errors: string[] = [];

  for (const src of sources) {
    const result = await src.fn();
    if (result && result.items.length > 0) {
      return result;
    }
    errors.push(`${src.name}无结果或失败`);
  }

  console.warn('[searchImages] 所有搜索源均失败:', errors);
  return { items: [], total: 0, source: 'none', keyword, page };
}
