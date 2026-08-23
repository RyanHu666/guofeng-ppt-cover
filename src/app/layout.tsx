import type { Metadata } from 'next';
import { AppProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: '古风PPT封面设计工作台',
  description: 'AI驱动的中国传统风格PPT封面设计工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-ink-darkest text-rice antialiased paper-texture">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
