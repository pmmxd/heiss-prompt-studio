const DEFAULT_BASE_URL = "http://127.0.0.1:7019/";
const CACHE_MS = 5 * 60 * 1000;

export const referenceGalleryCategories = [
  { id: "portrait", label: "人像", manifest: "portrait/manifest.json" },
  { id: "costume", label: "服装", manifest: "costume/manifest.json" },
  { id: "costume-anime", label: "二次元服装", manifest: "costume-anime/manifest.json" },
  { id: "pose-depth", label: "姿势与深度", manifest: "pose-depth/manifest.json" },
  { id: "shisei", label: "线稿姿势", manifest: "shisei/manifest.json" },
  { id: "character", label: "角色", manifest: "character/manifest.json" }
];

const cache = new Map();

function baseUrl() {
  const value = String(process.env.HEISS_REFERENCE_GALLERY_URL || DEFAULT_BASE_URL).trim();
  return new URL(value.endsWith("/") ? value : `${value}/`);
}

function categoryOf(id) {
  return referenceGalleryCategories.find((category) => category.id === String(id || ""));
}

function firstText(...values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function listText(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "").split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizedItem(category, item) {
  const tags = [
    ...listText(item.标签 || item.tags),
    item.分类,
    item.分区,
    item.发型,
    item.风格,
    item.系列,
    item.分類,
    item.姿势名,
    item.姿势名_zh,
    item.视角,
    item.cat,
    item.catZh,
    item.set,
    item.zh,
    item.jp
  ].map((value) => String(value || "").trim()).filter(Boolean);

  const title = firstText(
    item.姿势名_zh,
    item.zh,
    item.风格,
    item.姿势名,
    item.jp,
    item.关键词,
    item.分类,
    item.分類,
    item.id
  );
  const subtitle = [
    item.系列,
    item.分类 || item.分類 || item.分区,
    item.发型,
    item.视角,
    item.catZh || item.cat,
    item.tags
  ].map((value) => String(value || "").trim()).filter(Boolean).join(" · ");

  return {
    id: String(item.id || ""),
    title,
    subtitle,
    tags: [...new Set(tags)].slice(0, 20),
    width: Number(item.宽 || item.width || 0),
    height: Number(item.高 || item.height || 0),
    thumbUrl: `/api/reference-gallery/image?category=${encodeURIComponent(category.id)}&id=${encodeURIComponent(item.id)}&size=thumb`,
    fullUrl: `/api/reference-gallery/image?category=${encodeURIComponent(category.id)}&id=${encodeURIComponent(item.id)}&size=full`,
    rating: String(item.rating || "")
  };
}

async function loadCategory(category) {
  const cached = cache.get(category.id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached;

  const url = new URL(category.manifest, baseUrl());
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Reference gallery answered HTTP ${response.status}.`);
  const raw = await response.json();
  const items = Array.isArray(raw) ? raw : [];
  const root = new URL(".", url);
  const probeItem = items.find((item) => item && item.id && item.thumb_path);
  const probeUrl = probeItem ? projectImageUrl(root, probeItem.thumb_path) : null;
  let localAvailable = true;
  if (probeUrl) {
    const probe = await fetch(probeUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) }).catch(() => null);
    localAvailable = Boolean(probe?.ok);
  }
  const remoteAvailable = items.some((item) => item && (item.thumb_url || item.mid_url || item.full_url));
  const available = localAvailable || remoteAvailable;
  const value = {
    at: Date.now(),
    root,
    available,
    localAvailable,
    reason: available ? "" : "这个分类没有可用的本地图片或远程地址。",
    items: items
      .filter((item) => item && item.id)
      .filter((item) => !item.rating || String(item.rating).toLowerCase() === "general")
      .map((item) => ({ raw: item, view: normalizedItem(category, item) }))
  };
  cache.set(category.id, value);
  return value;
}

async function loadCategoryRecords(categoryId) {
  const category = categoryOf(categoryId);
  return category ? loadCategory(category) : null;
}

export function referenceGalleryCatalog() {
  return referenceGalleryCategories.map(({ id, label }) => ({ id, label }));
}

function projectImageUrl(base, relative) {
  const value = String(relative || "").trim();
  if (!value || value.startsWith("/") || value.includes("..")) return null;
  const url = new URL(value, base);
  return url.origin === base.origin ? url : null;
}

function externalImageUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export async function readReferenceGalleryImage({ category: categoryId = "", id = "", size = "thumb" } = {}) {
  const category = categoryOf(categoryId);
  if (!category) throw new Error("Unknown reference gallery category.");
  const records = await loadCategoryRecords(category.id);
  const record = records?.items.find((item) => String(item.raw.id) === String(id || ""));
  if (!record) throw new Error("Reference image was not found.");

  const raw = record.raw;
  const relative = size === "full"
    ? firstText(raw.full_path, raw.png_path, raw.img_path, raw.preview_path)
    : firstText(raw.thumb_path, raw.thumb_url, raw.mid_path, raw.full_path);
  const localUrl = projectImageUrl(records.root, relative);
  const remoteValue = size === "full"
    ? firstText(raw.full_url, raw.png_url, raw.img_url, raw.preview_url)
    : firstText(raw.thumb_url, raw.mid_url, raw.full_url);
  const remoteUrl = externalImageUrl(remoteValue);
  if (!localUrl && !remoteUrl) throw new Error("这个分类没有可用的本地图片或远程兜底。");

  let response = localUrl ? await fetch(localUrl, { signal: AbortSignal.timeout(15000) }).catch(() => null) : null;
  if ((!response || !response.ok) && remoteUrl) {
    response = await fetch(remoteUrl, { signal: AbortSignal.timeout(15000) });
  }
  if (!response) throw new Error("这个分类没有可用的图片地址。");
  if (!response.ok) throw new Error(`Reference image answered HTTP ${response.status}.`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: String(response.headers.get("content-type") || "application/octet-stream"),
    name: `${record.view.title || id}${size === "full" ? ".png" : ".webp"}`
  };
}

export function registerReferenceGalleryRoutes(app, { requireLocal }) {
  app.get("/api/reference-gallery/categories", (_req, res) => {
    res.json({ categories: referenceGalleryCatalog() });
  });

  app.get("/api/reference-gallery", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      const category = categoryOf(req.query.category) ? String(req.query.category) : "portrait";
      const records = await loadCategoryRecords(category);
      if (!records) {
        res.status(404).json({ ok: false, error: "未知的参考图库分类。" });
        return;
      }
      const needle = String(req.query.q || "").trim().toLowerCase();
      const start = Math.max(0, Number(req.query.offset) || 0);
      const take = Math.max(1, Math.min(120, Number(req.query.limit) || 80));
      const filtered = records.items.filter((item) => !needle || `${item.view.title} ${item.view.subtitle} ${item.view.tags.join(" ")} ${JSON.stringify(item.raw)}`.toLowerCase().includes(needle));
      res.json({
        ok: true,
        available: records.available,
        warning: records.reason,
        category,
        total: filtered.length,
        offset: start,
        hasMore: start + take < filtered.length,
        items: filtered.slice(start, start + take).map((item) => item.view)
      });
    } catch (error) {
      res.status(502).json({ ok: false, error: `本地参考图库不可用：${error.message}` });
    }
  });

  app.get("/api/reference-gallery/image", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      const image = await readReferenceGalleryImage({
        category: req.query.category,
        id: req.query.id,
        size: req.query.size === "full" ? "full" : "thumb"
      });
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(image.name)}`);
      res.setHeader("Cache-Control", req.query.size === "full" ? "private, max-age=3600" : "public, max-age=86400");
      res.end(image.buffer);
    } catch (error) {
      res.status(404).json({ ok: false, error: error.message });
    }
  });
}
