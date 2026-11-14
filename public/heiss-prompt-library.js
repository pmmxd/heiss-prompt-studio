(() => {
  const state = {
    mode: "cases",
    query: "",
    category: "",
    style: "",
    scene: "",
    items: [],
    templates: [],
    sources: [],
    catalog: null,
    remoteCatalog: null,
    remoteSource: "youmind",
    remotePreset: "all",
    remoteItems: [],
    remotePage: 1,
    remoteTotal: 0,
    remoteHasMore: false,
    remoteLoading: false,
    remoteRequestId: 0,
    total: 0,
    hasMore: false,
    loading: false,
    detailItem: null,
    detailExample: null,
    searchTimer: 0
  };

  let overlay = null;
  let panel = null;
  let status = null;
  let count = null;
  let grid = null;
  let moreButton = null;
  let searchInput = null;
  let categorySelect = null;
  let styleSelect = null;
  let sceneSelect = null;
  let filterBar = null;
  let remoteBar = null;
  let remoteSourceSelect = null;
  let remotePresetSelect = null;
  let detail = null;
  let detailTitle = null;
  let detailMeta = null;
  let detailImage = null;
  let detailPrompt = null;
  let detailNotes = null;
  let detailExamples = null;
  let detailSource = null;
  let detailStatus = null;

  const style = document.createElement("style");
  style.textContent = `
    #heiss-prompt-library-button {
      position: fixed;
      z-index: 901;
      left: 20px;
      bottom: 130px;
      height: 38px;
      padding: 0 16px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 999px;
      background: rgba(18,18,18,.9);
      color: var(--foreground, #f4f4f4);
      box-shadow: 0 8px 26px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.06);
      backdrop-filter: blur(18px) saturate(1.4);
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    #heiss-prompt-library-button:hover {
      background: rgba(38,38,38,.96);
      border-color: rgba(255,255,255,.28);
    }
    #heiss-prompt-library-button:focus-visible,
    .heiss-prompt-overlay button:focus-visible,
    .heiss-prompt-overlay a:focus-visible,
    .heiss-prompt-overlay select:focus-visible,
    .heiss-prompt-overlay textarea:focus-visible,
    .heiss-prompt-overlay input:focus-visible {
      outline: 2px solid #f4f4f4;
      outline-offset: 2px;
    }
    .heiss-prompt-overlay {
      position: fixed;
      inset: 0;
      z-index: 1040;
      display: flex;
      justify-content: flex-end;
      background: rgba(0,0,0,.64);
      backdrop-filter: blur(8px);
      opacity: 0;
      visibility: hidden;
      transition: opacity .18s ease, visibility .18s ease;
    }
    .heiss-prompt-overlay.is-open {
      opacity: 1;
      visibility: visible;
    }
    .heiss-prompt-drawer {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(1120px, calc(100vw - 34px));
      height: 100%;
      min-width: 0;
      overflow: hidden;
      color: var(--foreground, #f4f4f4);
      background: rgba(14,14,14,.985);
      border-left: 1px solid rgba(255,255,255,.12);
      box-shadow: -24px 0 70px rgba(0,0,0,.5);
      transform: translateX(24px);
      transition: transform .22s cubic-bezier(.16,1,.3,1);
    }
    .heiss-prompt-overlay.is-open .heiss-prompt-drawer { transform: translateX(0); }
    .heiss-prompt-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .heiss-prompt-title {
      margin: 0;
      font: 650 20px/1.2 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-subtitle {
      color: rgba(255,255,255,.45);
      font: 500 11px/1.2 var(--font-mono, monospace);
    }
    .heiss-prompt-count {
      margin-left: auto;
      color: rgba(255,255,255,.56);
      font: 500 12px/1.2 var(--font-mono, monospace);
    }
    .heiss-prompt-close,
    .heiss-prompt-detail-close {
      width: 34px;
      height: 34px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 50%;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 18px/1 system-ui, sans-serif;
    }
    .heiss-prompt-close:hover,
    .heiss-prompt-detail-close:hover { background: rgba(255,255,255,.13); }
    .heiss-prompt-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      overflow-x: auto;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .heiss-prompt-mode {
      flex: 0 0 auto;
      height: 34px;
      padding: 0 15px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: rgba(255,255,255,.62);
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-mode:hover { color: #fff; background: rgba(255,255,255,.06); }
    .heiss-prompt-mode.is-active { color: #0a0a0a; background: #f4f4f4; }
    .heiss-prompt-search {
      min-width: 220px;
      height: 36px;
      margin-left: auto;
      padding: 0 12px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.05);
      color: #fff;
      outline: none;
      font: 500 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-filters {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      overflow-x: auto;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .heiss-prompt-filters.is-hidden { display: none; }
    .heiss-prompt-remote-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      overflow-x: auto;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .heiss-prompt-remote-bar.is-hidden { display: none; }
    .heiss-prompt-cache-note {
      margin-left: auto;
      color: rgba(255,255,255,.44);
      white-space: nowrap;
      font: 500 10px/1.3 var(--font-mono, monospace);
    }
    .heiss-prompt-select {
      flex: 0 0 auto;
      height: 34px;
      max-width: 210px;
      padding: 0 32px 0 10px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.05);
      color: #f4f4f4;
      font: 500 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-select option { background: #171717; color: #fff; }
    .heiss-prompt-reset {
      flex: 0 0 auto;
      height: 34px;
      padding: 0 12px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      background: transparent;
      color: rgba(255,255,255,.68);
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-status {
      min-height: 30px;
      padding: 9px 20px 0;
      color: rgba(255,255,255,.62);
      font: 500 12px/1.5 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      padding: 12px 20px 20px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    .heiss-prompt-card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 320px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 8px;
      background: #191919;
      color: inherit;
      cursor: pointer;
    }
    .heiss-prompt-card:hover {
      border-color: rgba(255,255,255,.34);
      transform: translateY(-1px);
    }
    .heiss-prompt-card-image {
      display: block;
      width: 100%;
      height: 176px;
      object-fit: cover;
      background: #101010;
    }
    .heiss-prompt-card-copy {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      padding: 11px 12px 12px;
    }
    .heiss-prompt-card-kicker {
      color: rgba(255,255,255,.46);
      font: 600 10px/1.3 var(--font-mono, monospace);
      text-transform: uppercase;
    }
    .heiss-prompt-card-name {
      display: -webkit-box;
      margin-top: 5px;
      overflow: hidden;
      color: rgba(255,255,255,.95);
      font: 620 13px/1.45 var(--font-sans, system-ui, sans-serif);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .heiss-prompt-card-preview {
      display: -webkit-box;
      margin: 8px 0 0;
      overflow: hidden;
      color: rgba(255,255,255,.54);
      font: 500 11px/1.55 var(--font-sans, system-ui, sans-serif);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
    }
    .heiss-prompt-card-tags {
      display: flex;
      gap: 5px;
      margin-top: auto;
      padding-top: 10px;
      overflow: hidden;
      white-space: nowrap;
    }
    .heiss-prompt-tag {
      padding: 3px 6px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 5px;
      color: rgba(255,255,255,.56);
      font: 500 9px/1.2 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-source-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 16px 20px 24px;
      overflow: auto;
    }
    .heiss-prompt-source {
      display: flex;
      flex-direction: column;
      min-height: 170px;
      padding: 18px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      background: #191919;
      color: inherit;
      text-decoration: none;
    }
    .heiss-prompt-source:hover { border-color: rgba(255,255,255,.34); }
    .heiss-prompt-source-badge {
      color: rgba(255,255,255,.44);
      font: 600 10px/1.2 var(--font-mono, monospace);
    }
    .heiss-prompt-source-title {
      margin-top: 8px;
      font: 650 16px/1.35 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-source-note {
      margin-top: 7px;
      color: rgba(255,255,255,.58);
      font: 500 12px/1.65 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-source-link {
      margin-top: auto;
      padding-top: 14px;
      color: rgba(255,255,255,.82);
      font: 600 11px/1.2 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-empty {
      grid-column: 1 / -1;
      padding: 64px 20px;
      color: rgba(255,255,255,.5);
      text-align: center;
      font: 500 13px/1.6 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-more {
      height: 36px;
      padding: 0 18px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-foot {
      display: flex;
      justify-content: center;
      padding: 0 20px 20px;
    }
    .heiss-prompt-detail {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: none;
      flex-direction: column;
      background: rgba(13,13,13,.995);
    }
    .heiss-prompt-detail.is-open { display: flex; }
    .heiss-prompt-detail-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .heiss-prompt-detail-title {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 650 18px/1.25 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-detail-body {
      display: grid;
      flex: 1 1 auto;
      grid-template-columns: minmax(280px, .85fr) minmax(380px, 1.15fr);
      gap: 18px;
      min-height: 0;
      padding: 20px;
      overflow: auto;
    }
    .heiss-prompt-detail-visual {
      align-self: start;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      background: #111;
    }
    .heiss-prompt-detail-image {
      display: block;
      width: 100%;
      max-height: 460px;
      object-fit: contain;
      background: #111;
    }
    .heiss-prompt-detail-meta {
      padding: 12px 13px;
      color: rgba(255,255,255,.58);
      font: 500 11px/1.55 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-detail-main { min-width: 0; }
    .heiss-prompt-detail-description {
      margin: 0 0 12px;
      color: rgba(255,255,255,.68);
      font: 500 13px/1.65 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-label {
      display: block;
      margin: 12px 0 6px;
      color: rgba(255,255,255,.52);
      font: 600 10px/1.2 var(--font-mono, monospace);
      text-transform: uppercase;
    }
    .heiss-prompt-editor {
      display: block;
      width: 100%;
      min-height: 300px;
      padding: 12px;
      resize: vertical;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      background: rgba(255,255,255,.045);
      color: rgba(255,255,255,.9);
      outline: none;
      font: 500 12px/1.58 var(--font-mono, monospace);
    }
    .heiss-prompt-notes {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 8px;
      background: rgba(255,255,255,.03);
    }
    .heiss-prompt-notes.is-hidden { display: none; }
    .heiss-prompt-notes h3 {
      margin: 0 0 6px;
      font: 650 12px/1.4 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-notes ul {
      margin: 0;
      padding-left: 18px;
      color: rgba(255,255,255,.6);
      font: 500 11px/1.6 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-examples {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 7px;
    }
    .heiss-prompt-example {
      height: 30px;
      padding: 0 10px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      background: rgba(255,255,255,.05);
      color: rgba(255,255,255,.75);
      cursor: pointer;
      font: 600 10px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-example.is-active { background: #f4f4f4; color: #0a0a0a; }
    .heiss-prompt-origin {
      display: inline-flex;
      margin-top: 10px;
      color: rgba(255,255,255,.72);
      font: 600 11px/1.3 var(--font-sans, system-ui, sans-serif);
      text-underline-offset: 3px;
    }
    .heiss-prompt-detail-foot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid rgba(255,255,255,.08);
      background: rgba(10,10,10,.98);
    }
    .heiss-prompt-detail-status {
      min-width: 0;
      margin-right: auto;
      overflow: hidden;
      color: rgba(255,255,255,.58);
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 500 11px/1.4 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-action {
      flex: 0 0 auto;
      height: 36px;
      padding: 0 13px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-prompt-action:hover { background: rgba(255,255,255,.12); }
    .heiss-prompt-action.is-primary {
      border-color: transparent;
      background: #f4f4f4;
      color: #0a0a0a;
    }
    .heiss-prompt-action:disabled { opacity: .44; cursor: wait; }
    @media (max-width: 900px) {
      .heiss-prompt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .heiss-prompt-detail-body { grid-template-columns: 1fr; }
      .heiss-prompt-detail-image { max-height: 300px; }
    }
    @media (max-width: 640px) {
      #heiss-prompt-library-button {
        left: 12px;
        bottom: 116px;
        height: 34px;
        padding: 0 13px;
      }
      .heiss-prompt-drawer { width: 100vw; border-left: 0; }
      .heiss-prompt-head { padding: 13px 14px 10px; }
      .heiss-prompt-title { font-size: 18px; }
      .heiss-prompt-subtitle { display: none; }
      .heiss-prompt-toolbar,
      .heiss-prompt-filters,
      .heiss-prompt-remote-bar { padding: 9px 14px; }
      .heiss-prompt-search { order: 2; width: 100%; min-width: 0; margin-left: 0; }
      .heiss-prompt-toolbar { flex-wrap: wrap; }
      .heiss-prompt-status { padding: 8px 14px 0; }
      .heiss-prompt-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 10px 14px 16px;
      }
      .heiss-prompt-card { min-height: 280px; }
      .heiss-prompt-card-image { height: 142px; }
      .heiss-prompt-card-copy { padding: 9px; }
      .heiss-prompt-card-preview { -webkit-line-clamp: 3; }
      .heiss-prompt-source-grid { grid-template-columns: 1fr; padding: 12px 14px; }
      .heiss-prompt-detail-head { padding: 12px 14px; }
      .heiss-prompt-detail-body { padding: 12px 14px; }
      .heiss-prompt-detail-foot {
        flex-wrap: wrap;
        padding: 10px 14px;
      }
      .heiss-prompt-detail-status { width: 100%; margin-bottom: 2px; }
      .heiss-prompt-action { flex: 1 1 auto; padding: 0 10px; }
      .heiss-prompt-editor { min-height: 230px; }
    }
  `;
  document.head.appendChild(style);

  function makeButton(label, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  function setStatus(message) {
    if (status) status.textContent = message || "";
  }

  function setDetailStatus(message) {
    if (detailStatus) detailStatus.textContent = message || "";
  }

  async function json(url, options) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `请求失败（HTTP ${response.status}）`);
    return payload;
  }

  function fillSelect(select, allLabel, entries) {
    select.textContent = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);
    for (const entry of entries) {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = `${entry.label}（${entry.count}）`;
      select.appendChild(option);
    }
  }

  async function loadCatalog() {
    if (state.catalog) return;
    setStatus("正在读取本地提示词库…");
    const payload = await json("/api/prompt-library/catalog");
    state.catalog = payload;
    state.sources = payload.sources || [];
    fillSelect(categorySelect, "全部分类", payload.categories || []);
    fillSelect(styleSelect, "全部风格", payload.styles || []);
    fillSelect(sceneSelect, "全部场景", payload.scenes || []);
    const subtitle = panel.querySelector(".heiss-prompt-subtitle");
    if (subtitle) subtitle.textContent = `${payload.totalCases} 个案例 · ${payload.totalTemplates} 套模板 · 本地只读`;
  }

  async function loadCases(reset = false) {
    if (state.loading) return;
    state.loading = true;
    const offset = reset ? 0 : state.items.length;
    if (reset) {
      state.items = [];
      state.total = 0;
      state.hasMore = false;
      if (grid) grid.textContent = "";
    }
    setStatus(reset ? "正在搜索案例…" : "正在加载更多案例…");
    try {
      const params = new URLSearchParams({
        q: state.query,
        category: state.category,
        style: state.style,
        scene: state.scene,
        offset: String(offset),
        limit: "36"
      });
      const payload = await json(`/api/prompt-library?${params}`);
      state.items = reset ? payload.items || [] : [...state.items, ...(payload.items || [])];
      state.total = Number(payload.total || 0);
      state.hasMore = Boolean(payload.hasMore);
      renderCases();
      setStatus(state.items.length ? "" : "没有匹配的提示词案例。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "提示词库读取失败。");
    } finally {
      state.loading = false;
    }
  }

  async function loadTemplates() {
    if (state.loading) return;
    state.loading = true;
    setStatus("正在读取模板…");
    try {
      const params = new URLSearchParams({ q: state.query, category: state.category });
      const payload = await json(`/api/prompt-library/templates?${params}`);
      state.templates = payload.items || [];
      state.total = Number(payload.total || 0);
      state.hasMore = false;
      renderTemplates();
      setStatus(state.templates.length ? "" : "没有匹配的模板。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "模板读取失败。");
    } finally {
      state.loading = false;
    }
  }

  async function loadRemoteCatalog() {
    if (state.remoteCatalog) return state.remoteCatalog;
    const payload = await json("/api/prompt-library/remote/catalog");
    state.remoteCatalog = payload;
    remoteSourceSelect.textContent = "";
    for (const source of payload.sources || []) {
      const option = document.createElement("option");
      option.value = source.id;
      option.textContent = `${source.label}${source.cachedCount ? `（已缓存 ${source.cachedCount}）` : ""}`;
      remoteSourceSelect.appendChild(option);
    }
    remoteSourceSelect.value = state.remoteSource;
    remotePresetSelect.textContent = "";
    for (const preset of payload.promptsrefPresets || [{ id: "all", label: "全部" }]) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      remotePresetSelect.appendChild(option);
    }
    remotePresetSelect.value = state.remotePreset;
    remotePresetSelect.style.display = state.remoteSource === "promptsref" ? "" : "none";
    return payload;
  }

  async function loadRemote(reset = false) {
    if (!reset && state.remoteLoading) return;
    const requestId = state.remoteRequestId + 1;
    state.remoteRequestId = requestId;
    state.remoteLoading = true;
    const page = reset ? 1 : state.remotePage + 1;
    if (reset) {
      state.remoteItems = [];
      state.remoteTotal = 0;
      state.remoteHasMore = false;
      state.remotePage = 1;
      if (grid) grid.textContent = "";
    }
    setStatus(reset ? "正在抓取在线提示词并保存到本地…" : "正在抓取下一页…");
    try {
      const params = new URLSearchParams({
        source: state.remoteSource,
        q: state.query,
        page: String(page),
        limit: "24",
        preset: state.remotePreset
      });
      const payload = await json(`/api/prompt-library/remote?${params}`);
      if (state.remoteRequestId !== requestId) return;
      state.remoteItems = reset ? payload.items || [] : [...state.remoteItems, ...(payload.items || [])];
      state.remotePage = page;
      state.remoteTotal = Number(payload.total || state.remoteItems.length);
      state.remoteHasMore = Boolean(payload.hasMore);
      renderRemote();
      const source = state.remoteCatalog?.sources?.find((item) => item.id === state.remoteSource);
      setStatus(payload.warning || `已抓取并缓存 ${state.remoteItems.length} 条${source ? ` · ${source.title}` : ""}`);
    } catch (error) {
      if (state.remoteRequestId !== requestId) return;
      setStatus(error instanceof Error ? error.message : "在线提示词抓取失败。");
    } finally {
      if (state.remoteRequestId === requestId) state.remoteLoading = false;
    }
  }

  function cardImage(src, alt = "") {
    const image = document.createElement("img");
    image.className = "heiss-prompt-card-image";
    image.src = src;
    image.loading = "lazy";
    image.alt = alt;
    return image;
  }

  function tag(label) {
    const item = document.createElement("span");
    item.className = "heiss-prompt-tag";
    item.textContent = label;
    return item;
  }

  function caseCard(item) {
    const card = document.createElement("article");
    card.className = "heiss-prompt-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看提示词：${item.title}`);
    card.addEventListener("click", () => openCase(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCase(item);
      }
    });
    card.appendChild(cardImage(item.thumbUrl, item.title));
    const copy = document.createElement("div");
    copy.className = "heiss-prompt-card-copy";
    const kicker = document.createElement("span");
    kicker.className = "heiss-prompt-card-kicker";
    kicker.textContent = item.categoryLabel || item.category;
    const title = document.createElement("strong");
    title.className = "heiss-prompt-card-name";
    title.textContent = item.title;
    const preview = document.createElement("p");
    preview.className = "heiss-prompt-card-preview";
    preview.textContent = item.promptPreview || item.prompt;
    const tags = document.createElement("div");
    tags.className = "heiss-prompt-card-tags";
    [...(item.styleLabels || []).slice(0, 2), ...(item.sceneLabels || []).slice(0, 1)].forEach((value) => tags.appendChild(tag(value)));
    copy.append(kicker, title, preview, tags);
    card.appendChild(copy);
    return card;
  }

  function templateCard(item) {
    const card = document.createElement("article");
    card.className = "heiss-prompt-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看提示词模板：${item.title}`);
    card.addEventListener("click", () => openTemplate(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTemplate(item);
      }
    });
    card.appendChild(cardImage(item.thumbUrl, item.title));
    const copy = document.createElement("div");
    copy.className = "heiss-prompt-card-copy";
    const kicker = document.createElement("span");
    kicker.className = "heiss-prompt-card-kicker";
    kicker.textContent = `${item.categoryLabel} · 模板`;
    const title = document.createElement("strong");
    title.className = "heiss-prompt-card-name";
    title.textContent = item.title;
    const preview = document.createElement("p");
    preview.className = "heiss-prompt-card-preview";
    preview.textContent = item.description || item.useWhen;
    const tags = document.createElement("div");
    tags.className = "heiss-prompt-card-tags";
    (item.tags || []).slice(0, 3).forEach((value) => tags.appendChild(tag(value)));
    copy.append(kicker, title, preview, tags);
    card.appendChild(copy);
    return card;
  }

  function remoteCard(item) {
    const card = document.createElement("article");
    card.className = "heiss-prompt-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看在线提示词：${item.title}`);
    card.addEventListener("click", () => openRemote(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openRemote(item);
      }
    });
    card.appendChild(cardImage(item.thumbUrl, item.title));
    const copy = document.createElement("div");
    copy.className = "heiss-prompt-card-copy";
    const kicker = document.createElement("span");
    kicker.className = "heiss-prompt-card-kicker";
    kicker.textContent = `${item.source === "youmind" ? "YouMind" : item.source === "image2studio" ? "Image2Studio" : "PromptsRef"} · ${item.categoryLabel || "在线"}`;
    const title = document.createElement("strong");
    title.className = "heiss-prompt-card-name";
    title.textContent = item.title;
    const preview = document.createElement("p");
    preview.className = "heiss-prompt-card-preview";
    preview.textContent = item.promptPreview || item.description;
    const tags = document.createElement("div");
    tags.className = "heiss-prompt-card-tags";
    (item.tags || item.styleLabels || []).slice(0, 3).forEach((value) => tags.appendChild(tag(value)));
    copy.append(kicker, title, preview, tags);
    card.appendChild(copy);
    return card;
  }

  function clearGrid() {
    if (!grid) return;
    grid.textContent = "";
    grid.className = "heiss-prompt-grid";
    moreButton?.remove();
  }

  function emptyGrid(message) {
    const empty = document.createElement("div");
    empty.className = "heiss-prompt-empty";
    empty.textContent = message;
    grid.appendChild(empty);
  }

  function renderCases() {
    clearGrid();
    if (!state.items.length) emptyGrid("没有匹配的提示词案例。");
    else state.items.forEach((item) => grid.appendChild(caseCard(item)));
    if (count) count.textContent = `${state.items.length} / ${state.total}`;
    renderMore();
  }

  function renderTemplates() {
    clearGrid();
    if (!state.templates.length) emptyGrid("没有匹配的提示词模板。");
    else state.templates.forEach((item) => grid.appendChild(templateCard(item)));
    if (count) count.textContent = `${state.templates.length} / ${state.total}`;
    renderMore();
  }

  function renderRemote() {
    clearGrid();
    if (!state.remoteItems.length) emptyGrid("没有匹配的在线提示词。");
    else state.remoteItems.forEach((item) => grid.appendChild(remoteCard(item)));
    if (count) count.textContent = `${state.remoteItems.length} / ${state.remoteTotal}`;
    renderMore();
  }

  function renderSources() {
    clearGrid();
    grid.className = "heiss-prompt-source-grid";
    if (!state.sources.length) emptyGrid("没有可用的来源。");
    for (const source of state.sources) {
      const link = document.createElement("a");
      link.className = "heiss-prompt-source";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      const badge = document.createElement("span");
      badge.className = "heiss-prompt-source-badge";
      badge.textContent = source.badge || "来源";
      const title = document.createElement("strong");
      title.className = "heiss-prompt-source-title";
      title.textContent = source.title;
      const note = document.createElement("span");
      note.className = "heiss-prompt-source-note";
      note.textContent = source.note;
      const action = document.createElement("span");
      action.className = "heiss-prompt-source-link";
      action.textContent = "打开来源 ↗";
      link.append(badge, title, note, action);
      grid.appendChild(link);
    }
    if (count) count.textContent = `${state.sources.length} 个来源`;
    setStatus("本地案例支持一键套用；YouMind 和 Image2Studio 保留原站入口。");
  }

  function renderMore() {
    moreButton?.remove();
    const hasMore = state.mode === "remote" ? state.remoteHasMore : state.hasMore;
    if (!hasMore) return;
    moreButton = makeButton("加载更多", "heiss-prompt-more");
    moreButton.addEventListener("click", () => state.mode === "remote" ? loadRemote(false) : loadCases(false));
    panel.querySelector(".heiss-prompt-foot").appendChild(moreButton);
  }

  function renderMode() {
    panel.querySelectorAll(".heiss-prompt-mode").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === state.mode);
    });
    filterBar.classList.toggle("is-hidden", state.mode === "sources" || state.mode === "remote");
    remoteBar.classList.toggle("is-hidden", state.mode !== "remote");
    searchInput.style.display = state.mode === "sources" ? "none" : "";
    styleSelect.disabled = state.mode !== "cases";
    sceneSelect.disabled = state.mode !== "cases";
    if (state.mode === "sources") renderSources();
    else if (state.mode === "templates") loadTemplates();
    else if (state.mode === "remote") loadRemote(true);
    else loadCases(true);
  }

  async function selectMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    closeDetail();
    if (mode === "remote") {
      try {
        await loadRemoteCatalog();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "在线来源读取失败。");
      }
    }
    renderMode();
  }

  function resetFilters() {
    state.query = "";
    state.category = "";
    state.style = "";
    state.scene = "";
    searchInput.value = "";
    categorySelect.value = "";
    styleSelect.value = "";
    sceneSelect.value = "";
    renderMode();
  }

  function setDetailExample(example) {
    if (!example) return;
    state.detailExample = example;
    detailImage.src = example.imageUrl;
    detailImage.alt = example.title;
    detailPrompt.value = example.prompt;
    detailExamples.querySelectorAll(".heiss-prompt-example").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.caseId === example.id);
    });
  }

  function showDetail() {
    detail.classList.add("is-open");
    detail.setAttribute("aria-hidden", "false");
    detail.querySelector(".heiss-prompt-detail-close")?.focus();
  }

  function closeDetail() {
    if (!detail) return;
    detail.classList.remove("is-open");
    detail.setAttribute("aria-hidden", "true");
    state.detailItem = null;
    state.detailExample = null;
  }

  function openCase(item) {
    state.detailItem = item;
    state.detailExample = null;
    detailTitle.textContent = item.title;
    detailMeta.textContent = [item.categoryLabel, ...(item.styleLabels || []), ...(item.sceneLabels || [])].filter(Boolean).join(" · ");
    detailImage.src = item.imageUrl;
    detailImage.alt = item.title;
    detailPrompt.value = item.prompt;
    detailNotes.classList.add("is-hidden");
    detailNotes.textContent = "";
    detailExamples.classList.add("is-hidden");
    detailExamples.textContent = "";
    detailSource.href = item.sourceUrl || item.githubUrl || (state.catalog?.repository || "https://github.com/freestylefly/awesome-gpt-image-2");
    detailSource.textContent = item.sourceLabel ? `查看原作者 ${item.sourceLabel} ↗` : "查看上游案例 ↗";
    setDetailStatus("提示词可以直接修改，再套用到输入框。");
    showDetail();
  }

  async function openRemote(item) {
    if (!item.needsDetail && item.prompt) {
      openCase(item);
      return;
    }
    setStatus("正在抓取完整提示词并写入本地缓存…");
    try {
      const params = new URLSearchParams({
        source: item.source,
        id: item.sourceItemId
      });
      const payload = await json(`/api/prompt-library/remote/detail?${params}`);
      const index = state.remoteItems.findIndex((entry) => entry.id === item.id);
      if (index >= 0) state.remoteItems[index] = payload.item;
      setStatus("完整提示词已缓存。");
      openCase(payload.item);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "完整提示词抓取失败。");
    }
  }

  function openTemplate(template) {
    state.detailItem = template;
    detailTitle.textContent = template.title;
    detailMeta.textContent = [template.categoryLabel, template.titleEn].filter(Boolean).join(" · ");
    detailPrompt.value = "";
    detailNotes.classList.remove("is-hidden");
    detailNotes.textContent = "";
    if (template.description || template.useWhen) {
      const description = document.createElement("p");
      description.className = "heiss-prompt-detail-description";
      description.textContent = template.description || template.useWhen;
      detailNotes.appendChild(description);
    }
    const sections = [
      ["建议", template.guidance],
      ["避坑", template.pitfalls]
    ];
    for (const [heading, values] of sections) {
      if (!Array.isArray(values) || !values.length) continue;
      const title = document.createElement("h3");
      title.textContent = heading;
      const list = document.createElement("ul");
      values.forEach((value) => {
        const li = document.createElement("li");
        li.textContent = value;
        list.appendChild(li);
      });
      detailNotes.append(title, list);
    }
    detailExamples.classList.remove("is-hidden");
    detailExamples.textContent = "";
    detailSource.href = state.catalog?.repository || "https://github.com/freestylefly/awesome-gpt-image-2";
    detailSource.textContent = "查看模板来源 ↗";
    for (const example of template.examples || []) {
      const button = makeButton(example.title, "heiss-prompt-example");
      button.dataset.caseId = example.id;
      button.addEventListener("click", () => setDetailExample(example));
      detailExamples.appendChild(button);
    }
    setDetailExample(template.examples?.[0]);
    setDetailStatus("模板已关联示例提示词，可以直接套用。");
    showDetail();
  }

  function promptTextarea() {
    return document.querySelector(".zen-prompt textarea[aria-label='提示词'], .zen-prompt textarea");
  }

  function setPrompt(value) {
    const textarea = promptTextarea();
    if (!textarea) throw new Error("没有找到 HEISS 提示词输入框。");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (!setter) throw new Error("当前浏览器无法写入提示词输入框。");
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.focus();
    return textarea.value === value;
  }

  const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  async function detectReferenceSlotCount() {
    if (!document.querySelector(".composer-reference")) return 0;
    const currentName = document.querySelector(".model-trigger")?.textContent?.trim() || "";
    try {
      const payload = await json("/api/models");
      const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
      const current = profiles.find((profile) => [profile.displayName, profile.label].filter(Boolean).includes(currentName));
      const count = Array.isArray(current?.mediaInputs) ? current.mediaInputs.length : 0;
      if (count) return count;
    } catch {}
    const lead = document.querySelector(".composer-reference-slots > *");
    if (lead?.querySelector(".ref-stack-add")) return 2;
    return Math.max(1, document.querySelectorAll(".composer-reference-slots > *").length);
  }

  function currentReferenceItem() {
    if (state.detailExample?.imageUrl) return state.detailExample;
    if (state.detailItem?.examples?.length) return state.detailItem.examples[0];
    return state.detailItem;
  }

  async function prepareReferenceFile(item) {
    if (!item?.imageUrl) throw new Error("这条提示词没有可用参考图。");
    const response = await fetch(item.imageUrl);
    if (!response.ok) throw new Error("参考图读取失败。");
    const blob = await response.blob();
    const type = blob.type || "image/png";
    const extension = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
    const safeTitle = String(item.title || item.id || "prompt-reference").replace(/[\\/:*?"<>|]+/g, "_");
    return new File([blob], `${safeTitle}.${extension}`, { type });
  }

  function dispatchReference(file) {
    const target = document.querySelector(".zen-prompt, .phone-compose");
    if (!target || !document.querySelector(".composer-reference")) return false;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const options = { bubbles: true, cancelable: true, dataTransfer: transfer };
    target.dispatchEvent(new DragEvent("dragenter", options));
    target.dispatchEvent(new DragEvent("dragover", options));
    target.dispatchEvent(new DragEvent("drop", options));
    return true;
  }

  async function waitForReferenceUpload() {
    const started = Date.now();
    let sawBusy = false;
    await sleep(80);
    while (Date.now() - started < 30000) {
      const busy = document.querySelector(".composer-reference .spin");
      if (busy) sawBusy = true;
      if (sawBusy && !busy) return true;
      if (!sawBusy && Date.now() - started > 1200) return true;
      await sleep(120);
    }
    return false;
  }

  async function addReference(item, knownSlots = 0) {
    const slots = knownSlots || await detectReferenceSlotCount();
    if (!slots) throw new Error("当前模型没有参考图槽位，请先选择支持参考图的模型或工作流。");
    const file = await prepareReferenceFile(item);
    if (!dispatchReference(file)) throw new Error("当前页面没有可用的参考图输入。");
    if (!await waitForReferenceUpload()) throw new Error("参考图上传超时。");
    return true;
  }

  async function applyPrompt({ reference = false, generate = false } = {}) {
    const prompt = String(detailPrompt?.value || "").trim();
    if (!prompt) {
      setDetailStatus("提示词为空。");
      return;
    }
    const actionButtons = detail.querySelectorAll(".heiss-prompt-action");
    actionButtons.forEach((button) => { button.disabled = true; });
    try {
      if (!setPrompt(prompt)) throw new Error("提示词没有写入输入框。");
      if (reference) {
        const slots = await detectReferenceSlotCount();
        if (!slots && generate) {
          setDetailStatus("当前模型没有参考图槽位，将只套用提示词并开始生成。");
        } else {
          setDetailStatus("正在加入参考图…");
          await addReference(currentReferenceItem(), slots);
        }
      }
      if (generate) {
        const generateButton = document.querySelector("button.generate, button[aria-label='Generate']");
        if (!generateButton) throw new Error("没有找到 HEISS 生成按钮。");
        if (generateButton.disabled) throw new Error("生成按钮当前不可用，请检查模型或 ComfyUI 状态。");
        setDetailStatus("提示词已套用，正在开始生成…");
        await sleep(260);
        generateButton.click();
        closeDetail();
        closeDrawer();
        return;
      }
      setDetailStatus(reference ? "提示词和参考图已套用。" : "提示词已套用。");
      await sleep(350);
      closeDetail();
      closeDrawer();
    } catch (error) {
      setDetailStatus(error instanceof Error ? error.message : "操作失败。");
    } finally {
      actionButtons.forEach((button) => { button.disabled = false; });
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(String(detailPrompt.value || ""));
      setDetailStatus("提示词已复制。");
    } catch {
      detailPrompt.select();
      setDetailStatus("已选中提示词，请按 Ctrl+C 复制。");
    }
  }

  function buildDrawer() {
    overlay = document.createElement("div");
    overlay.className = "heiss-prompt-overlay";
    overlay.setAttribute("aria-hidden", "true");

    panel = document.createElement("section");
    panel.className = "heiss-prompt-drawer";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "提示词参考库");

    const head = document.createElement("header");
    head.className = "heiss-prompt-head";
    const title = document.createElement("h2");
    title.className = "heiss-prompt-title";
    title.textContent = "提示词参考库";
    const subtitle = document.createElement("span");
    subtitle.className = "heiss-prompt-subtitle";
    subtitle.textContent = "正在读取本地数据";
    count = document.createElement("span");
    count.className = "heiss-prompt-count";
    const close = makeButton("×", "heiss-prompt-close");
    close.setAttribute("aria-label", "关闭提示词库");
    close.addEventListener("click", closeDrawer);
    head.append(title, subtitle, count, close);

    const toolbar = document.createElement("div");
    toolbar.className = "heiss-prompt-toolbar";
    for (const [mode, label] of [["cases", "本地案例"], ["templates", "模板"], ["remote", "在线抓取"], ["sources", "来源"]]) {
      const button = makeButton(label, "heiss-prompt-mode");
      button.dataset.mode = mode;
      button.classList.toggle("is-active", mode === state.mode);
      button.addEventListener("click", () => selectMode(mode));
      toolbar.appendChild(button);
    }
    searchInput = document.createElement("input");
    searchInput.className = "heiss-prompt-search";
    searchInput.type = "search";
    searchInput.placeholder = "搜索标题、提示词、风格、场景";
    searchInput.setAttribute("aria-label", "搜索提示词");
    searchInput.addEventListener("input", () => {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(() => {
        state.query = searchInput.value.trim();
        if (state.mode === "sources") return;
        if (state.mode === "templates") loadTemplates();
        else if (state.mode === "remote") loadRemote(true);
        else loadCases(true);
      }, 260);
    });
    toolbar.appendChild(searchInput);

    filterBar = document.createElement("div");
    filterBar.className = "heiss-prompt-filters";
    categorySelect = document.createElement("select");
    categorySelect.className = "heiss-prompt-select";
    categorySelect.setAttribute("aria-label", "按分类筛选");
    categorySelect.addEventListener("change", () => {
      state.category = categorySelect.value;
      if (state.mode === "templates") loadTemplates();
      else loadCases(true);
    });
    styleSelect = document.createElement("select");
    styleSelect.className = "heiss-prompt-select";
    styleSelect.setAttribute("aria-label", "按风格筛选");
    styleSelect.addEventListener("change", () => {
      state.style = styleSelect.value;
      loadCases(true);
    });
    sceneSelect = document.createElement("select");
    sceneSelect.className = "heiss-prompt-select";
    sceneSelect.setAttribute("aria-label", "按场景筛选");
    sceneSelect.addEventListener("change", () => {
      state.scene = sceneSelect.value;
      loadCases(true);
    });
    const reset = makeButton("重置", "heiss-prompt-reset");
    reset.addEventListener("click", resetFilters);
    filterBar.append(categorySelect, styleSelect, sceneSelect, reset);

    remoteBar = document.createElement("div");
    remoteBar.className = "heiss-prompt-remote-bar is-hidden";
    remoteSourceSelect = document.createElement("select");
    remoteSourceSelect.className = "heiss-prompt-select";
    remoteSourceSelect.setAttribute("aria-label", "在线提示词来源");
    remoteSourceSelect.addEventListener("change", () => {
      state.remoteSource = remoteSourceSelect.value;
      remotePresetSelect.style.display = state.remoteSource === "promptsref" ? "" : "none";
      loadRemote(true);
    });
    remotePresetSelect = document.createElement("select");
    remotePresetSelect.className = "heiss-prompt-select";
    remotePresetSelect.setAttribute("aria-label", "PromptsRef 分类");
    remotePresetSelect.style.display = "none";
    remotePresetSelect.addEventListener("change", () => {
      state.remotePreset = remotePresetSelect.value;
      loadRemote(true);
    });
    const cacheNote = document.createElement("span");
    cacheNote.className = "heiss-prompt-cache-note";
    cacheNote.textContent = "浏览即缓存到 prompt-library-cache";
    remoteBar.append(remoteSourceSelect, remotePresetSelect, cacheNote);

    status = document.createElement("div");
    status.className = "heiss-prompt-status";
    status.setAttribute("role", "status");
    grid = document.createElement("div");
    grid.className = "heiss-prompt-grid";
    const foot = document.createElement("footer");
    foot.className = "heiss-prompt-foot";

    detail = document.createElement("section");
    detail.className = "heiss-prompt-detail";
    detail.setAttribute("aria-hidden", "true");
    detail.setAttribute("aria-label", "提示词详情");
    const detailHead = document.createElement("header");
    detailHead.className = "heiss-prompt-detail-head";
    detailTitle = document.createElement("h3");
    detailTitle.className = "heiss-prompt-detail-title";
    const detailClose = makeButton("×", "heiss-prompt-detail-close");
    detailClose.setAttribute("aria-label", "关闭提示词详情");
    detailClose.addEventListener("click", closeDetail);
    detailHead.append(detailTitle, detailClose);

    const detailBody = document.createElement("div");
    detailBody.className = "heiss-prompt-detail-body";
    const visual = document.createElement("div");
    visual.className = "heiss-prompt-detail-visual";
    detailImage = document.createElement("img");
    detailImage.className = "heiss-prompt-detail-image";
    detailImage.alt = "";
    detailMeta = document.createElement("div");
    detailMeta.className = "heiss-prompt-detail-meta";
    visual.append(detailImage, detailMeta);
    const main = document.createElement("div");
    main.className = "heiss-prompt-detail-main";
    const label = document.createElement("label");
    label.className = "heiss-prompt-label";
    label.textContent = "提示词（可直接修改）";
    detailPrompt = document.createElement("textarea");
    detailPrompt.className = "heiss-prompt-editor";
    detailPrompt.spellcheck = false;
    detailNotes = document.createElement("div");
    detailNotes.className = "heiss-prompt-notes is-hidden";
    detailExamples = document.createElement("div");
    detailExamples.className = "heiss-prompt-examples is-hidden";
    detailSource = document.createElement("a");
    detailSource.className = "heiss-prompt-origin";
    detailSource.target = "_blank";
    detailSource.rel = "noreferrer";
    main.append(label, detailPrompt, detailNotes, detailExamples, detailSource);
    detailBody.append(visual, main);

    const detailFoot = document.createElement("footer");
    detailFoot.className = "heiss-prompt-detail-foot";
    detailStatus = document.createElement("span");
    detailStatus.className = "heiss-prompt-detail-status";
    detailStatus.setAttribute("role", "status");
    const copy = makeButton("复制", "heiss-prompt-action");
    copy.addEventListener("click", copyPrompt);
    const promptOnly = makeButton("套用提示词", "heiss-prompt-action");
    promptOnly.addEventListener("click", () => applyPrompt());
    const referenceOnly = makeButton("加入参考图", "heiss-prompt-action");
    referenceOnly.addEventListener("click", () => applyPrompt({ reference: true }));
    const generate = makeButton("套用并生成", "heiss-prompt-action is-primary");
    generate.addEventListener("click", () => applyPrompt({ reference: true, generate: true }));
    detailFoot.append(detailStatus, copy, promptOnly, referenceOnly, generate);
    detail.append(detailHead, detailBody, detailFoot);

    panel.append(head, toolbar, filterBar, remoteBar, status, grid, foot, detail);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeDrawer();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (detail?.classList.contains("is-open")) closeDetail();
      else if (overlay?.classList.contains("is-open")) closeDrawer();
    });
  }

  async function openDrawer() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.querySelector(".heiss-prompt-close")?.focus();
    try {
      await loadCatalog();
      if (state.mode === "sources") renderSources();
      else if (state.mode === "templates") loadTemplates();
      else if (state.mode === "remote") {
        await loadRemoteCatalog();
        remotePresetSelect.style.display = state.remoteSource === "promptsref" ? "" : "none";
        loadRemote(true);
      }
      else if (!state.items.length) loadCases(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "本地提示词库读取失败。");
    }
  }

  function closeDrawer() {
    if (!overlay) return;
    closeDetail();
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function start() {
    if (document.getElementById("heiss-prompt-library-button")) return;
    const button = makeButton("提示词库", "");
    button.id = "heiss-prompt-library-button";
    button.title = "打开本地提示词案例和参考图";
    button.addEventListener("click", openDrawer);
    document.body.appendChild(button);
    buildDrawer();
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
