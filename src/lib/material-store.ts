import { promises as fs } from 'fs';
import path from 'path';
import type { MaterialItem } from './material-types';

export { MATERIAL_CATEGORIES } from './material-types';
export type { MaterialItem };

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'materials.json');
const MATERIALS_DIR = path.join(process.cwd(), 'public', 'materials');

let writeLock = Promise.resolve();

async function ensureDirs() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(MATERIALS_DIR, { recursive: true });
  } catch {}
}

async function readAll(): Promise<MaterialItem[]> {
  await ensureDirs();
  try {
    const text = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeAll(items: MaterialItem[]) {
  await ensureDirs();
  // 简单的串行写入锁
  const currentLock = writeLock;
  writeLock = currentLock.then(async () => {
    await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  });
  await writeLock;
}

export async function getMaterials(params?: {
  category?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: MaterialItem[]; total: number }> {
  let items = await readAll();

  // 按创建时间倒序
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (params?.category && params.category !== 'all') {
    items = items.filter((it) => it.category === params.category);
  }

  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    items = items.filter(
      (it) =>
        it.title.toLowerCase().includes(kw) ||
        it.description.toLowerCase().includes(kw) ||
        it.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }

  const total = items.length;

  const offset = params?.offset || 0;
  const limit = params?.limit || 40;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

export async function addMaterial(item: Omit<MaterialItem, 'id' | 'createdAt' | 'source'> & { source?: MaterialItem['source'] }): Promise<MaterialItem> {
  const items = await readAll();
  const newItem: MaterialItem = {
    ...item,
    id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: item.source || 'library',
    createdAt: Date.now(),
  };
  items.push(newItem);
  await writeAll(items);
  return newItem;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const items = await readAll();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return false;

  const item = items[idx];
  // 如果是本地存储的素材，删除文件
  if (item.localPath) {
    try {
      await fs.unlink(path.join(process.cwd(), 'public', item.localPath));
    } catch {}
  }

  items.splice(idx, 1);
  await writeAll(items);
  return true;
}

export async function updateMaterial(id: string, patch: Partial<MaterialItem>): Promise<MaterialItem | null> {
  const items = await readAll();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, updatedAt: Date.now() };
  await writeAll(items);
  return items[idx];
}
