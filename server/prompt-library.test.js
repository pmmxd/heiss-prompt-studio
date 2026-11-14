import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "heiss-prompt-library-")));
const data = path.join(project, "data");
fs.mkdirSync(path.join(data, "images"), { recursive: true });
fs.writeFileSync(path.join(data, "cases.json"), JSON.stringify({
  repository: "https://example.com/prompts",
  cases: [{
    id: 1,
    title: "电影感人像",
    image: "/images/case1.png",
    prompt: "cinematic portrait, window light",
    promptPreview: "cinematic portrait",
    category: "Photography & Realism",
    styles: ["Realistic"],
    scenes: ["Story"],
    sourceLabel: "test",
    sourceUrl: "https://example.com/case/1"
  }]
}));
fs.writeFileSync(path.join(data, "style-library.json"), JSON.stringify({
  categories: [{ value: "Photography & Realism", title: { zh: "摄影与写实" } }],
  styles: [{ value: "Realistic", title: { zh: "写实" } }],
  scenes: [{ value: "Story", title: { zh: "叙事" } }],
  templates: []
}));
fs.writeFileSync(path.join(data, "images", "case1.png"), await sharp({
  create: { width: 20, height: 20, channels: 3, background: "#345" }
}).png().toBuffer());
process.env.HEISS_PROMPT_LIBRARY_DIR = project;

const library = await import("./prompt-library.js");

test.after(() => fs.rmSync(project, { recursive: true, force: true }));

test("prompt library reads cases, Chinese labels and filters", () => {
  const catalog = library.promptLibraryCatalog();
  assert.equal(catalog.totalCases, 1);
  assert.equal(catalog.categories[0].label, "摄影与写实");
  const page = library.listPromptLibrary({ q: "window light" });
  assert.equal(page.total, 1);
  assert.equal(page.items[0].styleLabels[0], "写实");
});

test("prompt library serves a generated thumbnail from the allowed image folder", async () => {
  const image = await library.readPromptLibraryImage("1", "thumb");
  assert.equal(image.contentType, "image/webp");
  assert.ok(image.buffer.length > 0);
});
