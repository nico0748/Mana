#!/usr/bin/env node
/**
 * 同人++ MCP サーバ（stdio）。
 *
 * Claude から蔵書・買い物リスト・MAP を操作するためのツール群を公開する。
 * 認証は設定 → 連携 で発行した API キー（環境変数 MANA_API_KEY）。
 *
 * ツールはドメインごとに tools/ 配下へ分けてある。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ManaClient } from './client.js';
import { registerEventTools } from './tools/events.js';
import { registerCircleTools } from './tools/circles.js';
import { registerItemTools } from './tools/items.js';
import { registerBookTools } from './tools/books.js';
import { registerMapTools } from './tools/maps.js';
import { registerAccountTools } from './tools/account.js';

const BASE_URL = (process.env.MANA_BASE_URL ?? 'https://doujin-pp.com').replace(/\/+$/, '');
const API_KEY = process.env.MANA_API_KEY;

if (!API_KEY) {
  console.error(
    '[doujin-pp-mcp] 環境変数 MANA_API_KEY が未設定です。\n' +
    '同人++ の 設定 → 連携 → API キー から発行して設定してください。\n' +
    '（API キーの発行は現在、管理者アカウントのみです）',
  );
  process.exit(1);
}

const client = new ManaClient(BASE_URL, API_KEY);
const server = new McpServer({ name: 'doujin-pp', version: '1.1.0' });

for (const register of [
  registerEventTools,
  registerCircleTools,
  registerItemTools,
  registerBookTools,
  registerMapTools,
  registerAccountTools,
]) {
  register(server, client);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout は MCP の通信路なので、ログは必ず stderr に出す
  console.error(`[doujin-pp-mcp] connected (base: ${BASE_URL})`);
}

main().catch(err => {
  console.error('[doujin-pp-mcp] fatal', err);
  process.exit(1);
});
