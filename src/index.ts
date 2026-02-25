#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://api.stackexchange.com/2.3";
const RATE_LIMIT_MS = 500;
let last = 0;

async function seFetch(path: string): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`StackExchange ${res.status}`);
  // Response is gzipped by default, fetch handles decompression
  return res.json();
}

function decodeHtml(s: string): string { return s?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") || ""; }

const server = new McpServer({ name: "mcp-stackexchange", version: "1.0.0" });

server.tool("search", "Search questions on Stack Exchange sites.", {
  query: z.string(), site: z.string().default("stackoverflow").describe("Site (stackoverflow, serverfault, superuser, askubuntu, etc.)"),
  tagged: z.string().optional().describe("Semicolon-separated tags (e.g. 'javascript;node.js')"),
  sort: z.enum(["activity", "votes", "creation", "relevance"]).default("relevance"),
  pageSize: z.number().min(1).max(100).default(10),
}, async ({ query, site, tagged, sort, pageSize }) => {
  const p = new URLSearchParams({ intitle: query, site, sort, pagesize: String(pageSize), order: "desc", filter: "withbody" });
  if (tagged) p.set("tagged", tagged);
  const d = await seFetch(`/search/advanced?${p}`);
  const items = d.items?.map((q: any) => ({
    id: q.question_id, title: decodeHtml(q.title), score: q.score, answers: q.answer_count,
    tags: q.tags, accepted: q.is_answered, views: q.view_count,
    link: q.link, asked: new Date(q.creation_date * 1000).toISOString(),
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.total, items }, null, 2) }] };
});

server.tool("get_question", "Get a question with its body and answers.", {
  questionId: z.number(), site: z.string().default("stackoverflow"),
}, async ({ questionId, site }) => {
  const d = await seFetch(`/questions/${questionId}?site=${site}&filter=withbody`);
  const q = d.items?.[0];
  const answers = await seFetch(`/questions/${questionId}/answers?site=${site}&filter=withbody&sort=votes&order=desc`);
  return { content: [{ type: "text" as const, text: JSON.stringify({
    title: decodeHtml(q?.title), score: q?.score, body: q?.body?.slice(0, 3000), tags: q?.tags,
    answers: answers.items?.map((a: any) => ({
      score: a.score, accepted: a.is_accepted, body: a.body?.slice(0, 2000),
    })),
  }, null, 2) }] };
});

server.tool("get_tags", "Get popular tags on a site.", {
  site: z.string().default("stackoverflow"),
  pageSize: z.number().min(1).max(100).default(20),
  inname: z.string().optional().describe("Filter by tag name fragment"),
}, async ({ site, pageSize, inname }) => {
  const p = new URLSearchParams({ site, pagesize: String(pageSize), sort: "popular", order: "desc" });
  if (inname) p.set("inname", inname);
  const d = await seFetch(`/tags?${p}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(d.items?.map((t: any) => ({ name: t.name, count: t.count })), null, 2) }] };
});

server.tool("get_user", "Get a user profile.", {
  userId: z.number(), site: z.string().default("stackoverflow"),
}, async ({ userId, site }) => {
  const d = await seFetch(`/users/${userId}?site=${site}`);
  const u = d.items?.[0];
  return { content: [{ type: "text" as const, text: JSON.stringify({
    name: decodeHtml(u?.display_name), reputation: u?.reputation, badges: u?.badge_counts,
    link: u?.link, questionCount: u?.question_count, answerCount: u?.answer_count,
  }, null, 2) }] };
});

server.tool("list_sites", "List all Stack Exchange network sites.", {}, async () => {
  const d = await seFetch("/sites?pagesize=100");
  const sites = d.items?.map((s: any) => ({ name: s.name, apiSite: s.api_site_parameter, audience: s.audience }));
  return { content: [{ type: "text" as const, text: JSON.stringify(sites, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
