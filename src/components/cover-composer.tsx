'use client';

import type { CSSProperties } from 'react';

interface CoverComposerProps {
  layoutId: string;
  title: string;
  subtitle?: string;
  primaryColor?: string;
  backgroundImage?: string;
  /** 古风字体族 */
  fontSerif?: string;
}

/**
 * 封面排版合成器
 * AI 生成背景图，前端用 CSS 精确叠加文字和装饰
 * 4 种版式对应 4 套布局方案
 */
export function CoverComposer({
  layoutId,
  title,
  subtitle,
  primaryColor = '#c45c3b',
  backgroundImage,
  fontSerif = '"Noto Serif SC", "Songti SC", "SimSun", "STSong", serif',
}: CoverComposerProps) {
  const titleStyle: CSSProperties = {
    fontFamily: fontSerif,
    color: '#ffffff',
    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
  };

  return (
    <div
      className="relative w-full aspect-video overflow-hidden select-none"
      style={{ background: '#0a0a0a' }}
    >
      {/* 背景图 */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="封面背景"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* 按版式渲染前景内容 */}
      {layoutId === 'layout-center' && (
        <LayoutCenter
          title={title}
          subtitle={subtitle}
          primaryColor={primaryColor}
          titleStyle={titleStyle}
        />
      )}

      {layoutId === 'layout-left' && (
        <LayoutLeft
          title={title}
          subtitle={subtitle}
          primaryColor={primaryColor}
          titleStyle={titleStyle}
        />
      )}

      {layoutId === 'layout-overlay' && (
        <LayoutOverlay
          title={title}
          subtitle={subtitle}
          primaryColor={primaryColor}
          titleStyle={titleStyle}
        />
      )}

      {layoutId === 'layout-frame' && (
        <LayoutFrame
          title={title}
          subtitle={subtitle}
          primaryColor={primaryColor}
          titleStyle={titleStyle}
        />
      )}
    </div>
  );
}

// ======================== 1. 居中对称式 ========================
function LayoutCenter({
  title,
  subtitle,
  primaryColor,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  primaryColor: string;
  titleStyle: CSSProperties;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* 顶部装饰线 */}
      <div
        className="mb-6 flex items-center gap-4"
        style={{ color: primaryColor }}
      >
        <div className="h-px w-16" style={{ background: `linear-gradient(to right, transparent, ${primaryColor})` }} />
        <div
          className="h-2 w-2 rotate-45"
          style={{ background: primaryColor, opacity: 0.8 }}
        />
        <div className="h-px w-16" style={{ background: `linear-gradient(to left, transparent, ${primaryColor})` }} />
      </div>

      {/* 主标题 */}
      <h1
        className="text-center font-bold tracking-widest leading-tight"
        style={{
          ...titleStyle,
          fontSize: 'clamp(28px, 5vw, 56px)',
          letterSpacing: '0.15em',
        }}
      >
        {title}
      </h1>

      {/* 副标题 */}
      {subtitle && (
        <p
          className="mt-4 text-center tracking-wider opacity-90"
          style={{
            ...titleStyle,
            fontSize: 'clamp(12px, 1.8vw, 18px)',
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.25em',
          }}
        >
          {subtitle}
        </p>
      )}

      {/* 底部装饰 */}
      <div className="mt-8 flex items-center gap-3" style={{ color: primaryColor }}>
        <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${primaryColor})` }} />
        {/* 印章感 */}
        <div
          className="flex items-center justify-center text-xs font-bold"
          style={{
            width: '36px',
            height: '36px',
            background: primaryColor,
            color: '#fff',
            borderRadius: '4px',
            fontFamily: 'serif',
            letterSpacing: '0',
            opacity: 0.9,
          }}
        >
          印
        </div>
        <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${primaryColor})` }} />
      </div>
    </div>
  );
}

// ======================== 2. 左文右画式 ========================
function LayoutLeft({
  title,
  subtitle,
  primaryColor,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  primaryColor: string;
  titleStyle: CSSProperties;
}) {
  return (
    <>
      {/* 右半区暗化蒙版（保证左侧文字可读） */}
      <div
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.1), transparent)',
        }}
      />
      {/* 左侧文字区 */}
      <div className="absolute inset-y-0 left-0 w-1/2 flex flex-col justify-center pl-[8%]">
        {/* 竖线装饰 */}
        <div
          className="mb-6"
          style={{
            width: '3px',
            height: '48px',
            background: primaryColor,
            boxShadow: `0 0 8px ${primaryColor}50`,
          }}
        />

        {/* 主标题 */}
        <h1
          className="font-bold leading-tight text-left"
          style={{
            ...titleStyle,
            fontSize: 'clamp(24px, 4.2vw, 48px)',
            letterSpacing: '0.12em',
          }}
        >
          {title}
        </h1>

        {/* 副标题 */}
        {subtitle && (
          <p
            className="mt-3 text-left"
            style={{
              fontSize: 'clamp(11px, 1.6vw, 16px)',
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.2em',
              fontFamily: titleStyle.fontFamily as string,
              textShadow: titleStyle.textShadow,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* 分隔装饰 */}
        <div
          className="mt-5"
          style={{
            width: '60px',
            height: '2px',
            background: `linear-gradient(to right, ${primaryColor}, transparent)`,
          }}
        />
      </div>
    </>
  );
}

// ======================== 3. 图文叠加式 ========================
function LayoutOverlay({
  title,
  subtitle,
  primaryColor,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  primaryColor: string;
  titleStyle: CSSProperties;
}) {
  return (
    <>
      {/* 底部暗渐变蒙版 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent)',
        }}
      />
      {/* 底部文字区 */}
      <div className="absolute inset-x-0 bottom-[8%] px-[6%]">
        <h1
          className="font-bold leading-tight"
          style={{
            ...titleStyle,
            fontSize: 'clamp(28px, 5vw, 56px)',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="mt-3"
            style={{
              fontSize: 'clamp(12px, 1.7vw, 17px)',
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.18em',
              fontFamily: titleStyle.fontFamily as string,
              textShadow: titleStyle.textShadow,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* 底部装饰 */}
        <div className="mt-5 flex items-center gap-3">
          <div
            style={{
              width: '40px',
              height: '3px',
              background: primaryColor,
              borderRadius: '2px',
            }}
          />
          <span
            style={{
              fontSize: 'clamp(10px, 1.2vw, 13px)',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.3em',
            }}
          >
            {primaryColor.toUpperCase()}
          </span>
        </div>
      </div>
    </>
  );
}

// ======================== 4. 边框纹样式 ========================
function LayoutFrame({
  title,
  subtitle,
  primaryColor,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  primaryColor: string;
  titleStyle: CSSProperties;
}) {
  return (
    <div className="absolute inset-[4%] flex flex-col items-center justify-center">
      {/* 外边框 */}
      <div
        className="absolute inset-0"
        style={{
          border: `2px solid ${primaryColor}80`,
          boxShadow: `inset 0 0 30px ${primaryColor}15`,
        }}
      />
      {/* 内边框 */}
      <div
        className="absolute inset-[3%]"
        style={{
          border: `1px solid ${primaryColor}40`,
        }}
      />

      {/* 四角装饰 */}
      <div className="absolute top-[1%] left-[1%] flex">
        <div style={{ width: '20px', height: '3px', background: primaryColor }} />
        <div style={{ width: '3px', height: '20px', background: primaryColor, marginTop: '-17px' }} />
      </div>
      <div className="absolute top-[1%] right-[1%] flex flex-col items-end">
        <div style={{ width: '20px', height: '3px', background: primaryColor }} />
        <div style={{ width: '3px', height: '20px', background: primaryColor, marginTop: '-17px' }} />
      </div>
      <div className="absolute bottom-[1%] left-[1%] flex flex-col">
        <div style={{ width: '3px', height: '20px', background: primaryColor }} />
        <div style={{ width: '20px', height: '3px', background: primaryColor }} />
      </div>
      <div className="absolute bottom-[1%] right-[1%] flex flex-col items-end">
        <div style={{ width: '3px', height: '20px', background: primaryColor }} />
        <div style={{ width: '20px', height: '3px', background: primaryColor }} />
      </div>

      {/* 顶部边饰（回纹感短横线） */}
      <div className="absolute top-[4.5%] left-0 right-0 flex justify-center gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              border: `1px solid ${primaryColor}60`,
              transform: 'rotate(45deg)',
            }}
          />
        ))}
      </div>

      {/* 主标题 */}
      <h1
        className="text-center font-bold tracking-widest"
        style={{
          ...titleStyle,
          fontSize: 'clamp(26px, 4.5vw, 50px)',
          letterSpacing: '0.2em',
        }}
      >
        {title}
      </h1>

      {/* 副标题 */}
      {subtitle && (
        <p
          className="mt-4 text-center"
          style={{
            fontSize: 'clamp(11px, 1.6vw, 16px)',
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.25em',
            fontFamily: titleStyle.fontFamily as string,
            textShadow: titleStyle.textShadow,
          }}
        >
          {subtitle}
        </p>
      )}

      {/* 底部分隔 + 印章 */}
      <div className="mt-7 flex items-center gap-4">
        <div
          className="h-px w-20"
          style={{ background: `linear-gradient(to right, transparent, ${primaryColor})` }}
        />
        <div
          className="flex items-center justify-center text-xs font-bold"
          style={{
            width: '32px',
            height: '32px',
            background: primaryColor,
            color: '#fff',
            borderRadius: '3px',
            fontFamily: 'serif',
          }}
        >
          印
        </div>
        <div
          className="h-px w-20"
          style={{ background: `linear-gradient(to left, transparent, ${primaryColor})` }}
        />
      </div>

      {/* 底部边饰 */}
      <div className="absolute bottom-[4.5%] left-0 right-0 flex justify-center gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              border: `1px solid ${primaryColor}60`,
              transform: 'rotate(45deg)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
