# HEISS Prompt Studio · HEISS 提示词工坊

一个以中文提示词和本地参考素材为中心的 HEISS UI 衍生版。

> 中文在前，English follows.
>
> 本项目基于 [tristmeister/HEISS-UI](https://github.com/tristmeister/HEISS-UI) v0.18.1，不是上游官方项目。HEISS UI 的核心产品、交互、模型支持、服务端能力和视觉设计来自 Leander de Buhr、Jasper 及上游贡献者。本仓库保留原 MIT 许可证、版权声明和上游链接，并明确标注为衍生版本。

## 为什么做这个版本

HEISS UI 本身已经把 ComfyUI 的日常生成流程整理得很简洁，但在中文用户的高频使用场景里仍有几个断点：

1. 界面、状态、错误和工具提示主要是英文。
2. 参考图需要反复从文件夹选择，缺少统一的本地分类浏览和多选入口。
3. 提示词工具和参考图库分散在不同网站、文件目录和聊天记录里。
4. 想套用一组“提示词 + 参考图”时，需要多次复制、拖放和切换页面。
5. 在线提示词来源接口经常变化，如果没有清晰的缓存层，浏览体验和本地数据都会变乱。

HEISS Prompt Studio 的目标是把这些动作收进同一个工作台：

**找提示词 → 看参考图 → 跨分类多选 → 一键套用 → 直接生成。**

## 本版重要改动

### 1. 中文界面层

- 新增 `public/heiss-zh-cn.js`。
- 覆盖主界面、设置、工作流、隐藏空间、状态提示和常用工具提示。
- 页面默认语言改为 `zh-CN`。
- 保留上游英文原文作为未翻译内容的回退。

### 2. 本地参考图库

- 新增 `public/heiss-reference-gallery.js`。
- 新增 `server/reference-gallery.js`。
- 支持人像、服装、二次元服装、姿势与深度、线稿姿势、角色六类来源。
- 支持搜索、加载更多和缩略图。
- 支持跨分类 tab 多选。
- 根据当前模型声明的参考图槽位限制数量，避免多张图错误覆盖到一个槽位。
- 图片读取采用“本地优先，远程兜底”，不批量复制用户素材。

### 3. 本地及在线提示词库

- 新增 `public/heiss-prompt-library.js`。
- 新增 `server/prompt-library.js`。
- 新增 `server/prompt-library-remote.js`。
- 支持本地案例、模板和在线来源。
- 本地案例支持分类、风格、场景、关键词筛选。
- 支持完整提示词查看、复制、套用、参考图套用和一键生成。
- 在线来源支持 YouMind、Image2Studio、PromptsRef。
- 在线数据按需缓存，不一次性下载全站内容。
- 图片路径、案例 ID 和在线来源均采用白名单校验。

### 4. 快速启停

- 新增 `快速启动 HEISS Prompt Studio.bat`。
- 新增 `快速停止 HEISS Prompt Studio.bat`。
- 新增 `scripts/quick-start.ps1` 和 `scripts/quick-stop.ps1`。
- 启动器使用系统 Node.js，不绑定任何本机绝对路径。

### 5. 隐私和发布边界

本仓库不包含：

- `.env` 或本机代理配置。
- `data/`、提示词历史、图库状态或加密数据。
- `prompt-library-cache/` 和在线图片缓存。
- ComfyUI 输出、用户生成图片、日志和截图。
- 模型、LoRA、检查点或工作流输出。
- 用户名、邮箱、Token、API Key、Cookie 或密码。

## 重要说明

当前增强层采用“前端增强脚本 + 后端模块 + 两个接入点”的方式：

- `index.html` 加载 3 个增强脚本。
- `server/index.js` 导入并注册 3 组后端路由。

这不是两个独立插件，而是三层增强：

1. 中文界面
2. 参考图库
3. 提示词库

这种方式能快速跟随上游 v0.18.1 发布包工作，但上游升级后可能需要重新核对 DOM 选择器和路由接入。长期维护方向是把增强逐步迁移为正式 React 组件。

## 快速开始

要求：

- Node.js 20.9 或更高版本
- 正在运行的 ComfyUI，默认地址为 `http://127.0.0.1:8188`

安装与开发：

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run build
npm start
```

或直接双击：

```text
快速启动 HEISS Prompt Studio.bat
```

停止：

```text
快速停止 HEISS Prompt Studio.bat
```

默认地址：

```text
http://127.0.0.1:8787/
```

## 用 LocalDock 启动

LocalDock 把本项目作为“后端服务（Node / Python）”启动。

```text
服务名称：HEISS Prompt Studio
项目目录：<install-dir>
运行程序：node
启动参数：scripts/localdock-start.mjs
工作目录：<install-dir>
环境变量文件：.env
健康检查路径：/api/ping
本地端口：8787
启动超时：300 秒
停止超时：10 秒
```

`scripts/localdock-start.mjs` 会在启动前检查依赖和源码指纹。缺少依赖时执行 `npm ci`，源码变化或 `dist` 缺失时执行 `npm run build`，然后启动 `server/index.js`。

第一次安装依赖可能需要几分钟，因此启动超时建议设为 300 秒。以后修改源码后，直接在 LocalDock 点击“重启站点”即可，不需要手动构建。

## 参考图库数据

参考图库通过 `HEISS_REFERENCE_GALLERY_URL` 读取 manifest 服务：

```dotenv
HEISS_REFERENCE_GALLERY_URL=http://127.0.0.1:7019
```

该服务需要提供以下分类目录和 `manifest.json`：

```text
portrait
costume
costume-anime
pose-depth
shisei
character
```

本仓库不附带这些用户素材。

## 提示词数据

本地案例库通过 `HEISS_PROMPT_LIBRARY_DIR` 指定：

```dotenv
HEISS_PROMPT_LIBRARY_DIR=./prompt-library-data
```

目录结构：

```text
prompt-library-data/
  data/
    cases.json
    style-library.json
    images/
```

在线抓取缓存通过 `HEISS_PROMPT_CACHE_DIR` 指定：

```dotenv
HEISS_PROMPT_CACHE_DIR=./prompt-library-cache
```

两个目录默认被 `.gitignore` 排除。

## 在线来源

- YouMind
- Image2Studio
- PromptsRef

在线抓取只访问公开页面或公开接口，不绕过登录、付费墙或反爬验证。来源站点的内容归属、服务条款和可用性由对应站点决定。PromptsRef 的站内搜索要求登录，本项目只搜索已经缓存的 PromptsRef 条目。

## 测试

```bash
npm test
npm run build
```

## 上游、致敬与许可证

- 上游项目：[tristmeister/HEISS-UI](https://github.com/tristmeister/HEISS-UI)
- 本项目基线：HEISS UI `v0.18.1`
- 原始许可证：[MIT](./LICENSE)
- 衍生说明：[NOTICE](./NOTICE)
- 上游 README 归档：[docs/upstream/README.md](./docs/upstream/README.md)

HEISS UI 本身基于 Jasper 的 [J-AI Studio](https://github.com/jasperdevs/J-AI-Studio)。原项目的提示词优先理念和大量基础工作来自 Jasper。这个衍生版本保留并尊重这些工作。

本衍生项目不是上游官方发行版，也不代表上游作者背书。

---

# HEISS Prompt Studio

A HEISS UI derivative centered on Chinese prompts and local reference assets.

> This project is based on [tristmeister/HEISS-UI](https://github.com/tristmeister/HEISS-UI) v0.18.1 and is not an official upstream release. The HEISS UI product, model support, server capabilities, and visual design are the work of Leander de Buhr, Jasper, and upstream contributors. The original MIT license and attribution are preserved.

## Why This Derivative Exists

The upstream app already offers a focused local ComfyUI workflow. For frequent Chinese-language prompt work, several gaps remain:

1. Most UI copy, states, errors, and tooltips are English.
2. Reference images require repeated folder navigation.
3. Prompts and reference assets live across websites, folders, and chat history.
4. Applying a prompt and its reference image requires several copy, drag, and tab-switch steps.
5. Third-party prompt sources change often and need a clear cache boundary.

This version turns those steps into one flow:

**Find a prompt → inspect its references → select across categories → apply → generate.**

## Key Changes

### Chinese UI layer

- Adds `public/heiss-zh-cn.js`.
- Covers the main UI, settings, workflows, Hidden, status messages, and common tooltips.
- Defaults the page language to Chinese while falling back to untranslated upstream text.

### Local reference gallery

- Adds `public/heiss-reference-gallery.js` and `server/reference-gallery.js`.
- Includes six reference categories.
- Supports search, pagination, thumbnails, and cross-category multi-select.
- Respects each model's declared reference slot count.
- Uses local-first images with remote fallback and never bulk-copies private assets.

### Local and online prompt library

- Adds `public/heiss-prompt-library.js`, `server/prompt-library.js`, and `server/prompt-library-remote.js`.
- Supports local cases, templates, and online sources.
- Filters local cases by category, style, scene, and text.
- Supports full prompt view, copy, apply, reference-image apply, and one-click generation.
- Integrates YouMind, Image2Studio, and PromptsRef.
- Caches online results incrementally and validates image hosts.

### Quick start/stop

- Adds Chinese Windows quick-start and quick-stop launchers.
- Uses the system Node.js and contains no machine-specific absolute paths.

### Privacy boundary

The repository excludes `.env`, `data/`, prompt caches, generated media, ComfyUI outputs, logs, models, LoRAs, databases, credentials, and user-specific paths.

## Architecture Note

The current integration uses three frontend enhancement scripts plus three backend modules, wired through `index.html` and `server/index.js`. It is a release-layer enhancement rather than two isolated plugins. Upstream updates may require DOM selector and route checks. Moving the enhancement layer into native React components is the preferred long-term direction.

## Quick Start

Requirements:

- Node.js 20.9+
- A running ComfyUI at `http://127.0.0.1:8188` by default

Development:

```bash
npm ci
npm run dev
```

Production:

```bash
npm run build
npm start
```

Windows launchers:

```text
快速启动 HEISS Prompt Studio.bat
快速停止 HEISS Prompt Studio.bat
```

Default URL:

```text
http://127.0.0.1:8787/
```

## Start With LocalDock

Add the project as a Node/Python backend service:

```text
Service name: HEISS Prompt Studio
Project root: <install-dir>
Runtime: node
Args: scripts/localdock-start.mjs
Working directory: <install-dir>
Environment file: .env
Health path: /api/ping
Port: 8787
Startup timeout: 300 seconds
Shutdown timeout: 10 seconds
```

The launcher runs `npm ci` when dependencies are missing, rebuilds when source
files change or `dist` is absent, then starts `server/index.js`.

The first dependency installation can take several minutes, so use a 300-second
startup timeout. After that, restarting from LocalDock is enough.

## Prompt and Reference Data

Reference manifests are configured with:

```dotenv
HEISS_REFERENCE_GALLERY_URL=http://127.0.0.1:7019
```

Local prompt cases are configured with:

```dotenv
HEISS_PROMPT_LIBRARY_DIR=./prompt-library-data
```

Online cache:

```dotenv
HEISS_PROMPT_CACHE_DIR=./prompt-library-cache
```

The repository does not include user assets or cache data.

## Online Sources

YouMind, Image2Studio, and PromptsRef are accessed through public pages or public APIs. This project does not bypass login, paywalls, or anti-bot controls. PromptsRef's native site search requires login; this project searches only cached PromptsRef items.

## Testing

```bash
npm test
npm run build
```

## Upstream, Credit, and License

- Upstream: [tristmeister/HEISS-UI](https://github.com/tristmeister/HEISS-UI)
- Baseline: HEISS UI v0.18.1
- License: [MIT](./LICENSE)
- Derivative notice: [NOTICE](./NOTICE)
- Archived upstream README: [docs/upstream/README.md](./docs/upstream/README.md)

HEISS UI itself is based on Jasper's [J-AI Studio](https://github.com/jasperdevs/J-AI-Studio). This derivative is not an official upstream release and does not imply upstream endorsement.
