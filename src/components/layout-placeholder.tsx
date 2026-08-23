'use client';

import type { CSSProperties } from 'react';

interface LayoutPlaceholderProps {
  layoutId: string;
  primaryColor?: string;
}

export function LayoutPlaceholder({ layoutId, primaryColor = '#c45c3b' }: LayoutPlaceholderProps) {
  const bg = '#0a0a0a';
  const accent = primaryColor;
  const accentLight = '#d4754e';
  const accentFaint = `rgba(${hexToRgb(primaryColor)}, 0.15)`;
  const textMain = '#ffffff';
  const textSub = '#999999';
  const deco1 = '#5a8a6a';
  const deco2 = '#4a7a8a';

  const labelStyle = {
    fontSize: '7px',
    fill: textSub,
    fontFamily: 'system-ui, sans-serif',
  } as CSSProperties;

  switch (layoutId) {
    case 'layout-center':
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill={bg} />
          <line x1="60" y1="135" x2="260" y2="135" stroke={accentFaint} strokeWidth="1" />
          {/* 左侧装饰 */}
          <circle cx="75" cy="85" r="25" fill="none" stroke={deco1} strokeWidth="1.5" opacity="0.6" />
          <rect x="63" y="73" width="24" height="24" fill="none" stroke={deco2} strokeWidth="1" opacity="0.5" transform="rotate(45 75 85)" />
          <text x="75" y="130" textAnchor="middle" style={labelStyle}>左侧装饰</text>
          {/* 右侧装饰 */}
          <circle cx="245" cy="85" r="25" fill="none" stroke={deco1} strokeWidth="1.5" opacity="0.6" />
          <rect x="233" y="73" width="24" height="24" fill="none" stroke={deco2} strokeWidth="1" opacity="0.5" transform="rotate(45 245 85)" />
          <text x="245" y="130" textAnchor="middle" style={labelStyle}>右侧装饰</text>
          {/* 主标题 */}
          <rect x="115" y="73" width="90" height="12" rx="2" fill={textMain} opacity="0.9" />
          <text x="160" y="100" textAnchor="middle" style={{ ...labelStyle, fill: accentLight, fontSize: '8px' }}>主标题</text>
          <rect x="125" y="107" width="70" height="5" rx="1" fill={textSub} opacity="0.5" />
          <text x="160" y="122" textAnchor="middle" style={labelStyle}>副标题</text>
          {/* 顶部 */}
          <rect x="155" y="48" width="10" height="2" rx="1" fill={accent} />
          <text x="160" y="40" textAnchor="middle" style={labelStyle}>顶饰</text>
        </svg>
      );

    case 'layout-left':
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill={bg} />
          {/* 右侧主体 */}
          <circle cx="235" cy="90" r="52" fill={accentFaint} />
          <circle cx="235" cy="90" r="38" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" />
          <polygon points="235,58 257,95 213,95" fill={deco1} opacity="0.5" />
          <text x="235" y="158" textAnchor="middle" style={{ ...labelStyle, fill: accentLight }}>主体图案</text>
          {/* 左侧文字 */}
          <rect x="35" y="65" width="100" height="11" rx="2" fill={textMain} opacity="0.9" />
          <text x="35" y="58" style={labelStyle}>主标题</text>
          <rect x="35" y="83" width="80" height="7" rx="1" fill={textSub} opacity="0.5" />
          <text x="35" y="100" style={labelStyle}>副标题</text>
          <rect x="35" y="106" width="60" height="5" rx="1" fill={textSub} opacity="0.4" />
          <text x="35" y="123" style={labelStyle}>说明文字</text>
          {/* 竖线装饰 */}
          <line x1="25" y1="55" x2="25" y2="120" stroke={accent} strokeWidth="2" opacity="0.6" />
          <text x="25" y="48" textAnchor="middle" style={labelStyle}>竖线装饰</text>
        </svg>
      );

    case 'layout-overlay':
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill={bg} />
          {/* 背景 */}
          <ellipse cx="160" cy="80" rx="135" ry="65" fill={deco2} opacity="0.2" />
          <circle cx="225" cy="65" r="40" fill={deco1} opacity="0.25" />
          <circle cx="95" cy="105" r="32" fill={accent} opacity="0.18" />
          <text x="160" y="35" textAnchor="middle" style={{ ...labelStyle, fill: deco2, fontSize: '8px' }}>背景大图</text>
          {/* 渐变遮罩 */}
          <rect x="0" y="95" width="320" height="85" fill="url(#overlayGradFinal)" />
          <defs>
            <linearGradient id="overlayGradFinal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {/* 叠加文字 */}
          <rect x="35" y="112" width="150" height="13" rx="2" fill={textMain} opacity="0.95" />
          <text x="35" y="105" style={labelStyle}>标题叠加</text>
          <rect x="35" y="133" width="95" height="7" rx="1" fill={textSub} opacity="0.7" />
          <text x="35" y="150" style={labelStyle}>副标题</text>
          <rect x="35" y="155" width="55" height="4" rx="1" fill={accentLight} opacity="0.8" />
          <text x="35" y="170" style={labelStyle}>时间/地点</text>
        </svg>
      );

    case 'layout-frame':
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill={bg} />
          {/* 边框 */}
          <rect x="12" y="12" width="296" height="156" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.4" />
          <rect x="20" y="20" width="280" height="140" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.3" />
          <text x="160" y="8" textAnchor="middle" style={{ ...labelStyle, fill: accentLight }}>边框纹样</text>
          {/* 四角 */}
          <path d="M20 20 L35 20 M20 20 L20 35" stroke={accent} strokeWidth="2" />
          <path d="M300 20 L285 20 M300 20 L300 35" stroke={accent} strokeWidth="2" />
          <path d="M20 160 L35 160 M20 160 L20 145" stroke={accent} strokeWidth="2" />
          <path d="M300 160 L285 160 M300 160 L300 145" stroke={accent} strokeWidth="2" />
          {/* 边饰 */}
          {[50, 80, 110, 140, 170, 200, 230, 260].map((x) => (
            <g key={`tf-${x}`}>
              <rect x={x} y="16" width="8" height="8" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.5" />
            </g>
          ))}
          {[50, 80, 110, 140, 170, 200, 230, 260].map((x) => (
            <g key={`bf-${x}`}>
              <rect x={x} y="156" width="8" height="8" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.5" />
            </g>
          ))}
          {/* 中心标题 */}
          <rect x="85" y="75" width="150" height="15" rx="2" fill={textMain} opacity="0.9" />
          <text x="160" y="68" textAnchor="middle" style={{ ...labelStyle, fill: textMain, fontSize: '8px' }}>主标题</text>
          <rect x="105" y="98" width="110" height="7" rx="1" fill={textSub} opacity="0.6" />
          <text x="160" y="118" textAnchor="middle" style={labelStyle}>副标题</text>
          <rect x="150" y="128" width="20" height="2" rx="1" fill={accent} />
          <text x="160" y="142" textAnchor="middle" style={labelStyle}>装饰分隔</text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <rect width="320" height="180" fill={bg} />
        </svg>
      );
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
