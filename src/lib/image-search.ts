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
];

function matchBoard(keyword: string): string | null {
  const kw = keyword.toLowerCase();
  for (const board of PINTEREST_BOARDS) {
    for (const k of board.keywords) {
      if (kw.includes(k.toLowerCase())) {
        return board.url;
      }
    }
  }
  return null;
}

async function searchPinterestBoards(
  keyword: string,
  page: number,
  perPage: number,
): Promise<SearchResult | null> {
  const boardUrl = matchBoard(keyword);
  if (!boardUrl) return null;

  try {
    const res = await fetch(boardUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, text/xml',
      },
    });
    if (!res.ok) return null;

    const text = await res.text();
    // 解析 RSS，提取图片URL和链接
    const items: SearchResultItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let index = 0;

    while ((match = itemRegex.exec(text)) !== null && items.length < page * perPage) {
      const itemXml = match[1];
      
      // 提取 title
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      let title = titleMatch ? titleMatch[1].trim() : keyword;
      // 去掉 CDATA 包裹
      title = title.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() || keyword;

      // 提取 link
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const sourceUrl = linkMatch ? linkMatch[1].trim() : '';

      // 从 description 中提取图片（HTML 可能被转义）
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
      let imageUrl = '';
      let thumbnailUrl = '';
      
      if (descMatch) {
        let desc = descMatch[1];
        // 去掉 CDATA
        desc = desc.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
        // 反转义 HTML 实体
        desc = desc
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'");
        
        // 提取第一个 img 的 src
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch) {
          thumbnailUrl = imgMatch[1];
          // Pinterest 图片 URL 格式：https://i.pinimg.com/236x/xx/xx/xx/xxx.jpg
          // 把 236x 换成 originals 获取原图
          imageUrl = thumbnailUrl.replace('/236x/', '/originals/');
        }
      }

      if (imageUrl) {
        items.push({
          id: `pbt_${Date.now()}_${index}`,
          title: title || keyword,
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

    // 分页
    const start = (page - 1) * perPage;
    const pageItems = items.slice(start, start + perPage);

    if (pageItems.length === 0) return null;

    return {
      items: pageItems,
      total: items.length,
      source: 'pinterest-board',
      keyword,
      page,
    };
  } catch {
    return null;
  }
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
