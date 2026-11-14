import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSharp } from "./sharp-loader.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PROJECT_DIR = path.join(PROJECT_ROOT, "prompt-library-data");
const CACHE_MS = 5 * 60 * 1000;

let loaded = null;

function projectDir() {
  return path.resolve(String(process.env.HEISS_PROMPT_LIBRARY_DIR || DEFAULT_PROJECT_DIR).trim());
}

function dataDir() {
  return path.join(projectDir(), "data");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function labelOf(entry) {
  return String(entry?.title?.zh || entry?.title?.en || entry?.value || entry?.id || "").trim();
}

function labelMap(entries) {
  return new Map((Array.isArray(entries) ? entries : []).map((entry) => [String(entry.value || entry.id || ""), labelOf(entry)]));
}

function imageFile(record) {
  const relative = String(record?.image || "").replace(/^[/\\]+/, "");
  if (!relative) throw new Error("案例缺少参考图路径。");
  const imagesRoot = path.join(dataDir(), "images");
  const file = path.resolve(dataDir(), relative);
  if (file !== imagesRoot && !file.startsWith(`${imagesRoot}${path.sep}`)) {
    throw new Error("案例参考图路径不在允许的图片目录内。");
  }
  if (!fs.existsSync(file)) throw new Error("案例参考图文件不存在。");
  return file;
}

function load() {
  const root = projectDir();
  const casesFile = path.join(root, "data", "cases.json");
  const stylesFile = path.join(root, "data", "style-library.json");
  const casesStat = fs.statSync(casesFile);
  const stylesStat = fs.statSync(stylesFile);
  const version = `${casesStat.mtimeMs}:${casesStat.size}:${stylesStat.mtimeMs}:${stylesStat.size}`;
  if (loaded?.root === root && loaded.version === version && Date.now() - loaded.at < CACHE_MS) return loaded;

  const raw = readJson(casesFile);
  const library = readJson(stylesFile);
  const categoryLabels = labelMap(library.categories);
  const styleLabels = labelMap(library.styles);
  const sceneLabels = labelMap(library.scenes);
  const cases = (Array.isArray(raw.cases) ? raw.cases : []).map((record) => {
    const id = String(record.id || "");
    const category = String(record.category || "");
    const styles = Array.isArray(record.styles) ? record.styles.map(String) : [];
    const scenes = Array.isArray(record.scenes) ? record.scenes.map(String) : [];
    return {
      id,
      title: String(record.title || record.imageAlt || `案例 ${id}`),
      image: String(record.image || ""),
      prompt: String(record.prompt || ""),
      promptPreview: String(record.promptPreview || record.prompt || "").slice(0, 280),
      category,
      categoryLabel: categoryLabels.get(category) || category,
      styles,
      styleLabels: styles.map((value) => styleLabels.get(value) || value),
      scenes,
      sceneLabels: scenes.map((value) => sceneLabels.get(value) || value),
      sourceLabel: String(record.sourceLabel || ""),
      sourceUrl: String(record.sourceUrl || ""),
      githubUrl: String(record.githubUrl || ""),
      imageUrl: `/api/prompt-library/image/${encodeURIComponent(id)}?size=full`,
      thumbUrl: `/api/prompt-library/image/${encodeURIComponent(id)}?size=thumb`
    };
  }).filter((record) => record.id && record.prompt);
  const byId = new Map(cases.map((record) => [record.id, record]));
  const templates = (Array.isArray(library.templates) ? library.templates : []).map((template) => {
    const examples = (Array.isArray(template.exampleCases) ? template.exampleCases : [])
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((record) => ({
        id: record.id,
        title: record.title,
        prompt: record.prompt,
        imageUrl: record.imageUrl,
        thumbUrl: record.thumbUrl
      }));
    const category = String(template.category || "");
    return {
      id: String(template.id || ""),
      title: String(template.title?.zh || template.title?.en || template.id || ""),
      titleEn: String(template.title?.en || ""),
      description: String(template.description?.zh || template.description?.en || ""),
      useWhen: String(template.useWhen?.zh || template.useWhen?.en || ""),
      guidance: Array.isArray(template.guidance?.zh) ? template.guidance.zh.map(String) : [],
      pitfalls: Array.isArray(template.pitfalls?.zh) ? template.pitfalls.zh.map(String) : [],
      category,
      categoryLabel: categoryLabels.get(category) || category,
      tags: Array.isArray(template.tags) ? template.tags.map(String) : [],
      imageUrl: examples[0]?.imageUrl || "",
      thumbUrl: examples[0]?.thumbUrl || "",
      examples
    };
  }).filter((template) => template.id && template.examples.length);
  const categories = (Array.isArray(library.categories) ? library.categories : [])
    .map((entry) => {
      const value = String(entry.value || "");
      return { value, label: categoryLabels.get(value) || value, count: cases.filter((record) => record.category === value).length };
    })
    .filter((entry) => entry.value && entry.count);
  const styles = (Array.isArray(library.styles) ? library.styles : [])
    .map((entry) => {
      const value = String(entry.value || "");
      return { value, label: styleLabels.get(value) || value, count: cases.filter((record) => record.styles.includes(value)).length };
    })
    .filter((entry) => entry.value && entry.count);
  const scenes = (Array.isArray(library.scenes) ? library.scenes : [])
    .map((entry) => {
      const value = String(entry.value || "");
      return { value, label: sceneLabels.get(value) || value, count: cases.filter((record) => record.scenes.includes(value)).length };
    })
    .filter((entry) => entry.value && entry.count);
  const sources = [
    {
      id: "local",
      title: "本地 awesome-gpt-image-2",
      badge: "离线 / 一键生成",
      url: "https://github.com/freestylefly/awesome-gpt-image-2",
      note: `当前加载 ${cases.length} 个完整案例和 ${templates.length} 套模板，提示词与参考图均从本地只读读取。`
    },
    {
      id: "youmind",
      title: "YouMind GPT Image 2",
      badge: "外部来源",
      url: "https://youmind.com/zh-CN/gpt-image-2-prompts/explore?categories=comic-storyboard",
      note: "适合继续浏览分镜、漫画和其他在线提示词；当前没有稳定公开的批量数据接口，因此保留原站入口。"
    },
    {
      id: "image2studio",
      title: "Image2Studio",
      badge: "外部来源",
      url: "https://image2studio.com/zh/prompts",
      note: "可直接浏览其在线提示词库；未复制站点内容，避免依赖不稳定的页面结构。"
    },
    {
      id: "github",
      title: "GitHub 原始仓库",
      badge: "MIT / 数据来源",
      url: "https://github.com/freestylefly/awesome-gpt-image-2/tree/main",
      note: "本地案例、模板和图片的上游仓库。保留原作者署名与 MIT 许可证。"
    },
    {
      id: "canghe",
      title: "苍何 GPT Image 2",
      badge: "同源在线站",
      url: "https://gpt-image2.canghe.ai/",
      note: "与本地案例库使用同一套上游数据的在线可视化站。"
    },
    {
      id: "promptsref",
      title: "PromptsRef",
      badge: "在线抓取 / 本地缓存",
      url: "https://promptsref.com/zh/library/photo-prompt",
      note: "照片提示词案例库，支持在线抓取提示词、分类和参考图，并保存到本地缓存。"
    }
  ];

  loaded = {
    at: Date.now(),
    root,
    version,
    cases,
    byId,
    templates,
    categories,
    styles,
    scenes,
    sources,
    repository: String(raw.repository || sources[3].url)
  };
  return loaded;
}

function filterCases({ category = "", style = "", scene = "", q = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return load().cases.filter((record) => {
    if (category && record.category !== String(category)) return false;
    if (style && !record.styles.includes(String(style))) return false;
    if (scene && !record.scenes.includes(String(scene))) return false;
    if (!needle) return true;
    const haystack = [
      record.title,
      record.prompt,
      record.category,
      record.categoryLabel,
      ...record.styles,
      ...record.styleLabels,
      ...record.scenes,
      ...record.sceneLabels,
      record.sourceLabel
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

export function promptLibraryCatalog() {
  const library = load();
  return {
    totalCases: library.cases.length,
    totalTemplates: library.templates.length,
    categories: library.categories,
    styles: library.styles,
    scenes: library.scenes,
    sources: library.sources,
    repository: library.repository
  };
}

export function listPromptLibrary({ category = "", style = "", scene = "", q = "", offset = 0, limit = 36 } = {}) {
  const filtered = filterCases({ category, style, scene, q });
  const start = Math.max(0, Number(offset) || 0);
  const take = Math.max(1, Math.min(60, Number(limit) || 36));
  return {
    ok: true,
    total: filtered.length,
    offset: start,
    hasMore: start + take < filtered.length,
    items: filtered.slice(start, start + take)
  };
}

export function listPromptTemplates({ category = "", q = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  const items = load().templates.filter((template) => {
    if (category && template.category !== String(category)) return false;
    if (!needle) return true;
    const haystack = [
      template.title,
      template.titleEn,
      template.description,
      template.useWhen,
      template.category,
      template.categoryLabel,
      ...template.tags,
      ...template.guidance,
      ...template.pitfalls
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
  return { ok: true, total: items.length, items };
}

export function promptLibrarySources() {
  return { ok: true, sources: load().sources };
}

export async function readPromptLibraryImage(id, size = "thumb") {
  const record = load().byId.get(String(id || ""));
  if (!record) throw new Error("找不到这个案例的参考图。");
  const file = imageFile(record);
  const original = await fs.promises.readFile(file);
  if (size !== "thumb") {
    return { buffer: original, contentType: path.extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg", name: `case${record.id}${path.extname(file)}` };
  }
  const sharp = await loadSharp();
  if (!sharp) {
    return { buffer: original, contentType: path.extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg", name: `case${record.id}${path.extname(file)}` };
  }
  return {
    buffer: await sharp(original).rotate().resize({ width: 480, height: 320, fit: "cover", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    contentType: "image/webp",
    name: `case${record.id}.webp`
  };
}

export function registerPromptLibraryRoutes(app, { requireLocal }) {
  app.get("/api/prompt-library/catalog", (_req, res) => {
    try {
      res.json({ ok: true, ...promptLibraryCatalog() });
    } catch (error) {
      res.status(503).json({ ok: false, error: `本地提示词库不可用：${error.message}` });
    }
  });

  app.get("/api/prompt-library/sources", (_req, res) => {
    try {
      res.json(promptLibrarySources());
    } catch (error) {
      res.status(503).json({ ok: false, error: `本地提示词库不可用：${error.message}` });
    }
  });

  app.get("/api/prompt-library/templates", (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      res.json(listPromptTemplates({ category: req.query.category, q: req.query.q }));
    } catch (error) {
      res.status(503).json({ ok: false, error: `本地提示词库不可用：${error.message}` });
    }
  });

  app.get("/api/prompt-library", (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      res.json(listPromptLibrary({
        category: req.query.category,
        style: req.query.style,
        scene: req.query.scene,
        q: req.query.q,
        offset: req.query.offset,
        limit: req.query.limit
      }));
    } catch (error) {
      res.status(503).json({ ok: false, error: `本地提示词库不可用：${error.message}` });
    }
  });

  app.get("/api/prompt-library/image/:id", async (req, res) => {
    if (!requireLocal(req, res)) return;
    try {
      const image = await readPromptLibraryImage(req.params.id, req.query.size === "full" ? "full" : "thumb");
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(image.name)}`);
      res.setHeader("Cache-Control", req.query.size === "full" ? "private, max-age=3600" : "public, max-age=86400");
      res.end(image.buffer);
    } catch (error) {
      res.status(404).json({ ok: false, error: error.message });
    }
  });
}
