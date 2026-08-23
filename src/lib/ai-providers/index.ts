// AI 服务商工厂 & 单例
// 通过环境变量 AI_PROVIDER 切换服务商，默认自动检测

import type { AIProvider } from './types';
import { DashScopeProvider } from './dashscope';

let _provider: AIProvider | null = null;

/**
 * 获取当前 AI 服务商实例（单例）
 *
 * 选择优先级：
 * 1. 环境变量 AI_PROVIDER 指定的厂商
 * 2. DASHSCOPE_API_KEY 存在 → dashscope
 */
export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const preferred = process.env.AI_PROVIDER;

  // 1. 显式指定
  if (preferred === 'dashscope') {
    _provider = new DashScopeProvider();
    return _provider;
  }

  // 2. 自动检测：有 DASHSCOPE_API_KEY 就用
  if (process.env.DASHSCOPE_API_KEY) {
    _provider = new DashScopeProvider();
    return _provider;
  }

  throw new Error('No AI provider available. Please set DASHSCOPE_API_KEY environment variable.');
}

/** 重置单例（测试用） */
export function resetAIProvider() {
  _provider = null;
}

/** 注册自定义服务商（扩展用，运行时注入） */
export function registerAIProvider(provider: AIProvider) {
  _provider = provider;
}

export * from './types';
