import { NextRequest } from 'next/server';

// 图片代理 - 解决Pixabay等外部图片访问不稳定/防盗链问题
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: '缺少 url 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 安全校验：只允许信任的域名
  const allowedHosts = [
    'pixabay.com',
    'cdn.pixabay.com',
    'huaban.com',
    'gd-hbimg.huaban.com',
  ];

  try {
    const parsedUrl = new URL(url);
    const isAllowed = allowedHosts.some(
      (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
    );

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: '不允许的域名' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: '无效的 URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://pixabay.com/',
      },
      cache: 'force-cache',
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `图片加载失败: ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 缓存 1 天
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '代理请求失败' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
