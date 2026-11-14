import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadSharp } from "./sharp-loader.js";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_ROOT = path.resolve(process.env.HEISS_PROMPT_CACHE_DIR || path.join(PROJECT_ROOT, "prompt-library-cache"));
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const JSON_LIMIT = 30 * 1024 * 1024;

const CATEGORY_LABELS = {
  photography: "摄影",
  "portrait-selfie": "人像 / 自拍",
  "social-media-post": "社交媒体帖子",
  "social-ads": "社媒广告",
  "character-design": "角色设计",
  poster: "海报",
  "product-marketing": "产品营销",
  "ecommerce-image": "电商主图",
  "ui-mockup": "界面稿",
  anime: "动漫",
  illustration: "插画",
  "text-poster-infographic-social-card": "文字海报 / 信息图 / 社媒图卡"
};

const SOURCES = [
  {
    id: "youmind",
    title: "YouMind",
    label: "YouMind GPT Image 2",
    url: "https://youmind.com/zh-CN/gpt-image-2-prompts/explore",
    note: "公开 API 抓取，提示词优先使用站内中文译文。"
  },
  {
    id: "image2studio",
    title: "Image2Studio",
    label: "Image2Studio",
    url: "https://image2studio.com/zh/prompts",
    note: "公开提示词库 API 抓取，保留原图、分类和中文内容。"
  },
  {
    id: "promptsref",
    title: "PromptsRef",
    label: "PromptsRef 照片提示词",
    url: "https://promptsref.com/zh/library/photo-prompt",
    note: "公开照片提示词库，详情页按需抓取完整提示词。"
  }
];

const PROMPTSREF_PRESETS = [
  { id: "all", label: "全部" },
  { id: "portrait", label: "人像" },
  { id: "men", label: "男性" },
  { id: "couple", label: "情侣" },
  { id: "family", label: "家庭" },
  { id: "birthday", label: "生日" }
];

let proxyPromise = null;

function sourceOf(id) {
  return SOURCES.find((source) => source.id === String(id || ""));
}

function text(value) {
  return String(value || "").trim();
}

function first(...values) {
  return values.map(text).find(Boolean) || "";
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function categoryLabel(value) {
  const raw = text(value);
  return CATEGORY_LABELS[raw] || raw;
}

function safeId(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function itemFile(source, id) {
  return path.join(CACHE_ROOT, "sources", source, "items", `${safeId(id)}.json`);
}

function metaFile(source) {
  return path.join(CACHE_ROOT, "sources", source, "meta.json");
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await ensureDir(path.dirname(file));
  await fs.promises.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

async function saveItem(item) {
  await writeJson(itemFile(item.source, item.sourceItemId), item);
}

async function loadItem(source, sourceItemId) {
  return readJson(itemFile(source, sourceItemId));
}

async function saveMeta(source, changes) {
  const file = metaFile(source);
  const previous = await readJson(file, {});
  await writeJson(file, { ...previous, ...changes, updatedAt: new Date().toISOString() });
}

async function cacheStats(source) {
  const dir = path.join(CACHE_ROOT, "sources", source, "items");
  try {
    const names = await fs.promises.readdir(dir);
    return { count: names.filter((name) => name.endsWith(".json")).length };
  } catch {
    return { count: 0 };
  }
}

async function cachedItems(source) {
  const dir = path.join(CACHE_ROOT, "sources", source, "items");
  const names = await fs.promises.readdir(dir).catch(() => []);
  const items = [];
  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    const item = await readJson(path.join(dir, name));
    if (item) items.push(item);
  }
  return items;
}

async function systemProxy() {
  if (proxyPromise) return proxyPromise;
  proxyPromise = (async () => {
    const fromEnv = first(process.env.HTTPS_PROXY, process.env.HTTP_PROXY, process.env.ALL_PROXY);
    if (fromEnv) return fromEnv;
    if (process.platform !== "win32") return "";
    try {
      const { stdout } = await execFileAsync("reg.exe", [
        "query",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
      ], { encoding: "utf8", timeout: 5000 });
      const enabled = /ProxyEnable\s+REG_DWORD\s+0x1/i.test(stdout);
      const server = stdout.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim() || "";
      if (!enabled || !server) return "";
      return /^[a-z]+:\/\//i.test(server) ? server : `http://${server}`;
    } catch {
      return "";
    }
  })();
  return proxyPromise;
}

async function curlRequest(url, { method = "GET", headers = {}, body = "", binary = false } = {}) {
  const proxy = await systemProxy();
  const args = ["-sS", "-L", "--connect-timeout", "15", "--max-time", "45"];
  if (proxy) args.push("--proxy", proxy);
  args.push("-X", method, url, "-H", "User-Agent: Mozilla/5.0");
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null && value !== "") args.push("-H", `${name}: ${value}`);
  }
  if (body) args.push("--data-binary", body);
  const { stdout } = await execFileAsync("curl.exe", args, {
    encoding: binary ? "buffer" : "utf8",
    maxBuffer: Math.max(JSON_LIMIT, MAX_IMAGE_BYTES + 1024 * 1024),
    timeout: 50000
  });
  return stdout;
}

async function requestJson(url, options = {}) {
  if (options.forceCurl) {
    return JSON.parse(await curlRequest(url, options));
  }
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { "user-agent": "Mozilla/5.0", ...(options.headers || {}) },
      body: options.body,
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    try {
      return JSON.parse(await curlRequest(url, options));
    } catch {
      throw error;
    }
  }
}

async function requestText(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0", ...(options.headers || {}) },
      redirect: "follow",
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { html: await response.text(), url: response.url || url };
  } catch (error) {
    try {
      return { html: await curlRequest(url, options), url };
    } catch {
      throw error;
    }
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'");
}

function htmlToText(value) {
  return decodeHtml(String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")).trim();
}

function publicItem(item) {
  return {
    ...item,
    imageUrl: `/api/prompt-library/remote/image?source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.sourceItemId)}&size=full`,
    thumbUrl: `/api/prompt-library/remote/image?source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.sourceItemId)}&size=thumb`
  };
}

function youmindItem(record) {
  const id = String(record.id);
  const prompt = first(record.translatedContent, record.content);
  const categories = array(record.promptCategories).map((category) => first(category.title, category.slug)).filter(Boolean);
  const image = first(array(record.mediaLarge)[0], array(record.media)[0]);
  const thumb = first(array(record.mediaThumbnails)[0], image);
  return {
    id: `youmind:${id}`,
    source: "youmind",
    sourceItemId: id,
    title: first(record.title, record.description, `YouMind ${id}`),
    description: text(record.description),
    prompt,
    promptPreview: text(prompt).slice(0, 280),
    category: categories[0] || "gpt-image-2",
    categoryLabel: categoryLabel(categories[0] || "GPT Image 2"),
    styles: [],
    styleLabels: [],
    scenes: [],
    sceneLabels: [],
    tags: categories,
    sourceLabel: first(record.author?.name, record.sourcePlatform),
    sourceUrl: `https://youmind.com/zh-CN/prompts/${encodeURIComponent(record.slug)}-${id}`,
    originalSourceUrl: text(record.sourceLink),
    remoteImageUrl: image,
    remoteThumbUrl: thumb,
    needsDetail: false,
    cachedAt: new Date().toISOString()
  };
}

function image2Item(record) {
  const id = String(record.id);
  const translation = array(record.translations).find((entry) => /^zh/i.test(String(entry.locale || "")));
  const prompt = first(translation?.promptText, record.promptText, record.prompt);
  const categories = array(record.categories).map((category) => first(category.title, category.slug)).filter(Boolean);
  const styles = array(record.styleTags);
  const image = first(
    record.primaryAsset?.publicUrl,
    record.primaryAsset?.contentUrl,
    record.primaryAsset?.originalUrl,
    array(record.media)[0]?.publicUrl,
    array(record.media)[0]?.url
  );
  const fullImage = image && image.startsWith("/") ? `https://api.image2studio.com${image}` : image;
  const thumb = fullImage
    ? `https://image2studio.com/cdn-cgi/image/width=380,quality=72,format=auto,fit=scale-down/${fullImage}`
    : "";
  return {
    id: `image2studio:${id}`,
    source: "image2studio",
    sourceItemId: id,
    title: first(translation?.title, record.title, `Image2Studio ${id}`),
    description: first(translation?.description, record.description),
    prompt,
    promptPreview: text(prompt).slice(0, 280),
    category: first(categories[0], record.primaryUseCase, "gpt-image-2"),
    categoryLabel: categoryLabel(first(categories[0], record.primaryUseCase, "GPT Image 2")),
    styles,
    styleLabels: styles.map(categoryLabel),
    scenes: record.scene?.useCases || [],
    sceneLabels: array(record.scene?.useCases).slice(0, 4),
    tags: [...categories, ...styles].slice(0, 10),
    sourceLabel: first(record.authorName, record.sourcePlatform),
    sourceUrl: `https://image2studio.com/zh${record.detailPath || `/prompts/${record.slug || id}`}`,
    originalSourceUrl: text(record.sourceUrl),
    remoteImageUrl: fullImage,
    remoteThumbUrl: thumb || fullImage,
    needsDetail: false,
    cachedAt: new Date().toISOString()
  };
}

function promptsRefThumb(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "aitool.promptsref.com") return url;
    return `${parsed.origin}/thumbs/card/${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function allowedImageUrl(source, value) {
  let url;
  try {
    url = new URL(text(value));
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const hosts = {
    youmind: ["cms-assets.youmind.com"],
    image2studio: ["api.image2studio.com", "image2studio.com"],
    promptsref: ["aitool.promptsref.com"]
  }[source] || [];
  return hosts.includes(url.hostname);
}

function promptsRefItem(record, preset = "all") {
  const id = String(record.id);
  const image = text(record.output_image_url || record.output_video_url);
  const shareId = text(record.share_id);
  return {
    id: `promptsref:${id}`,
    source: "promptsref",
    sourceItemId: id,
    shareId,
    title: first(record.title_i18n?.zh, record.title_i18n?.en, `PromptsRef ${id}`),
    description: text(record.prompt_excerpt),
    prompt: "",
    promptPreview: text(record.prompt_excerpt),
    category: preset,
    categoryLabel: PROMPTSREF_PRESETS.find((entry) => entry.id === preset)?.label || "照片提示词",
    styles: [text(record.model)].filter(Boolean),
    styleLabels: [text(record.model)].filter(Boolean),
    scenes: [],
    sceneLabels: [],
    tags: [text(record.model), text(record.user_name)].filter(Boolean),
    sourceLabel: first(record.user_name, record.user_handle),
    sourceUrl: shareId ? `https://promptsref.com/zh/prompt/${encodeURIComponent(shareId)}` : "https://promptsref.com/zh/library/photo-prompt",
    originalSourceUrl: "https://promptsref.com/zh/library/photo-prompt",
    remoteImageUrl: image,
    remoteThumbUrl: promptsRefThumb(image),
    needsDetail: true,
    cachedAt: new Date().toISOString()
  };
}

async function listYouMind({ q, page, limit }) {
  const body = JSON.stringify({
    model: "gpt-image-2",
    page,
    limit,
    id: "",
    locale: "zh-CN",
    q,
    categories: "",
    campaign: "",
    filterMode: "",
    searchMode: "",
    sortBy: "",
    sortOrder: ""
  });
  const payload = await requestJson("https://youmind.com/youmarketing-api/prompts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://youmind.com",
      referer: "https://youmind.com/zh-CN/gpt-image-2-prompts/explore"
    },
    body,
    forceCurl: true
  });
  return {
    source: "youmind",
    total: Number(payload.total || 0),
    page,
    limit,
    hasMore: Boolean(payload.hasMore),
    items: array(payload.prompts).map(youmindItem)
  };
}

async function listImage2Studio({ q, page, limit }) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), language: "zh" });
  if (q) params.set("q", q);
  const payload = await requestJson(`https://api.image2studio.com/prompt-library/items?${params}`, {
    headers: {
      origin: "https://image2studio.com",
      referer: "https://image2studio.com/zh/prompts"
    }
  });
  return {
    source: "image2studio",
    total: Number(payload.data?.total || 0),
    page,
    limit,
    hasMore: page * limit < Number(payload.data?.total || 0),
    items: array(payload.data?.items).map(image2Item)
  };
}

async function listPromptsRef({ q, page, limit, preset }) {
  const offset = Math.max(0, (page - 1) * limit);
  if (q) {
    const needle = q.toLowerCase();
    const filtered = (await cachedItems("promptsref"))
      .filter((item) => item.category === preset || preset === "all")
      .filter((item) => [item.title, item.description, item.prompt, item.promptPreview, ...(item.tags || [])].join(" ").toLowerCase().includes(needle))
      .sort((left, right) => String(right.cachedAt).localeCompare(String(left.cachedAt)));
    return {
      source: "promptsref",
      total: filtered.length,
      page,
      limit,
      hasMore: page * limit < filtered.length,
      warning: "PromptsRef 站内搜索需要登录，当前只搜索已经缓存的提示词。",
      items: filtered.slice(offset, offset + limit)
    };
  }
  const params = new URLSearchParams({
    preset: preset || "all",
    offset: String(offset),
    limit: String(limit),
    sort: "latest"
  });
  if (q) {
    params.set("q", q);
    params.set("scope", "image");
  }
  const payload = await requestJson(`https://promptsref.com/api/library/photo-prompts?${params}`, {
    headers: { referer: "https://promptsref.com/zh/library/photo-prompt" }
  });
  return {
    source: "promptsref",
    total: Number(payload.totalMatches || 0),
    page,
    limit,
    hasMore: Boolean(payload.hasMore),
    items: array(payload.items).map((record) => promptsRefItem(record, preset))
  };
}

export async function remotePromptCatalog() {
  const sources = [];
  for (const source of SOURCES) {
    const stats = await cacheStats(source.id);
    sources.push({ ...source, cachedCount: stats.count });
  }
  return {
    ok: true,
    cacheRoot: CACHE_ROOT,
    sources,
    promptsrefPresets: PROMPTSREF_PRESETS
  };
}

export async function listRemotePrompts({ source = "youmind", q = "", page = 1, limit = 24, preset = "all" } = {}) {
  if (!sourceOf(source)) throw new Error("未知的在线提示词来源。");
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(36, Number(limit) || 24));
  const query = text(q);
  let result;
  if (source === "youmind") result = await listYouMind({ q: query, page: safePage, limit: safeLimit });
  else if (source === "image2studio") result = await listImage2Studio({ q: query, page: safePage, limit: safeLimit });
  else result = await listPromptsRef({ q: query, page: safePage, limit: safeLimit, preset });

  await Promise.all(result.items.map((item) => saveItem(item)));
  await saveMeta(source, { total: result.total, page: safePage, query, preset });
  return { ok: true, ...result, items: result.items.map(publicItem), cacheRoot: CACHE_ROOT };
}

export async function readRemotePromptDetail(source, sourceItemId) {
  if (!sourceOf(source)) throw new Error("未知的在线提示词来源。");
  const cached = await loadItem(source, sourceItemId);
  if (!cached) throw new Error("这条在线提示词还没有缓存，请先浏览列表。");
  if (cached.prompt || !cached.needsDetail) return { ok: true, item: publicItem(cached) };
  if (source !== "promptsref" || !cached.shareId) throw new Error("这条提示词没有可用的详情地址。");
  const { html, url } = await requestText(`https://promptsref.com/zh/prompt/${encodeURIComponent(cached.shareId)}`);
  const match = html.match(/<div[^>]+id=["']prompt-full-text["'][^>]*>([\s\S]*?)<\/div>/i);
  const prompt = match ? htmlToText(match[1]) : "";
  if (!prompt) throw new Error("没有从详情页读取到完整提示词。");
  const next = {
    ...cached,
    prompt,
    promptPreview: prompt.slice(0, 280),
    description: cached.description || prompt.slice(0, 280),
    sourceUrl: url || cached.sourceUrl,
    needsDetail: false,
    detailCachedAt: new Date().toISOString()
  };
  await saveItem(next);
  return { ok: true, item: publicItem(next) };
}

async function downloadRemoteImage(item, size) {
  const remoteUrl = size === "thumb" ? first(item.remoteThumbUrl, item.remoteImageUrl) : first(item.remoteImageUrl, item.remoteThumbUrl);
  if (!remoteUrl) throw new Error("这条提示词没有参考图。");
  if (!allowedImageUrl(item.source, remoteUrl)) throw new Error("参考图地址不在允许的来源域内。");
  const hash = safeId(`${item.source}:${item.sourceItemId}:${size}:${remoteUrl}`);
  const directory = path.join(CACHE_ROOT, "images", item.source);
  const existing = (await fs.promises.readdir(directory).catch(() => []))
    .find((name) => name.startsWith(`${hash}.`));
  if (existing) {
    const file = path.join(directory, existing);
    return { buffer: await fs.promises.readFile(file), contentType: mimeFromExtension(existing), file };
  }

  let response;
  try {
    response = await fetch(remoteUrl, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
  } catch {
    response = null;
  }
  let buffer;
  let contentType = "image/jpeg";
  if (response?.ok) {
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_IMAGE_BYTES) throw new Error("远程参考图超过 30 MiB，已拒绝缓存。");
    contentType = text(response.headers.get("content-type")) || contentType;
    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    buffer = await curlRequest(remoteUrl, { binary: true });
  }
  if (!buffer?.length) throw new Error("远程参考图为空。");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("远程参考图超过 30 MiB，已拒绝缓存。");
  const extension = extensionFromMime(contentType, remoteUrl);
  await ensureDir(directory);
  const file = path.join(directory, `${hash}.${extension}`);
  await fs.promises.writeFile(file, buffer);
  return { buffer, contentType: mimeFromExtension(file) || contentType, file };
}

function extensionFromMime(mime, url) {
  const type = text(mime).toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  const ext = path.extname(new URL(url, "https://example.com").pathname).slice(1).toLowerCase();
  return ["png", "webp", "gif", "jpg", "jpeg"].includes(ext) ? ext.replace("jpeg", "jpg") : "jpg";
}

function mimeFromExtension(file) {
  const ext = path.extname(file).toLowerCase();
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
}

export async function readRemotePromptImage(source, sourceItemId, size = "thumb") {
  if (!sourceOf(source)) throw new Error("未知的在线提示词来源。");
  const item = await loadItem(source, sourceItemId);
  if (!item) throw new Error("这条在线提示词还没有缓存。");
  const image = await downloadRemoteImage(item, size === "full" ? "full" : "thumb");
  if (size !== "thumb") return image;
  const sharp = await loadSharp();
  if (!sharp) return image;
  return {
    ...image,
    buffer: await sharp(image.buffer).rotate().resize({ width: 480, height: 320, fit: "cover", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    contentType: "image/webp"
  };
}

export function registerRemotePromptLibraryRoutes(app, { requireLocal }) {
  app.get("/api/prompt-library/remote/catalog", async (_req, res) => {
    try {
      res.json(await remotePromptCatalog());
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/prompt-library/remote", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      res.json(await listRemotePrompts({
        source: req.query.source,
        q: req.query.q,
        page: req.query.page,
        limit: req.query.limit,
        preset: req.query.preset
      }));
    } catch (error) {
      res.status(502).json({ ok: false, error: `在线提示词抓取失败：${error.message}` });
    }
  });

  app.get("/api/prompt-library/remote/detail", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      res.json(await readRemotePromptDetail(req.query.source, req.query.id));
    } catch (error) {
      res.status(502).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/prompt-library/remote/image", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      const image = await readRemotePromptImage(req.query.source, req.query.id, req.query.size === "full" ? "full" : "thumb");
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Cache-Control", req.query.size === "full" ? "private, max-age=3600" : "public, max-age=86400");
      res.end(image.buffer);
    } catch (error) {
      res.status(404).json({ ok: false, error: error.message });
    }
  });
}
