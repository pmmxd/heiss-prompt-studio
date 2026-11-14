(() => {
  const categories = [
    { id: "portrait", label: "人像" },
    { id: "costume", label: "服装" },
    { id: "costume-anime", label: "二次元服装" },
    { id: "pose-depth", label: "姿势与深度" },
    { id: "shisei", label: "线稿姿势" },
    { id: "character", label: "角色" }
  ];

  let currentCategory = "portrait";
  let query = "";
  let items = [];
  let total = 0;
  let hasMore = false;
  let loading = false;
  let warning = "";
  let multiMode = false;
  let addingReferences = false;
  let currentReferenceSlots = 0;
  const selectedItems = new Map();
  let searchTimer = 0;
  let drawer = null;
  let grid = null;
  let status = null;
  let count = null;
  let search = null;
  let multiButton = null;
  let selectionBar = null;
  let selectionCount = null;
  let addSelectedButton = null;

  const style = document.createElement("style");
  style.textContent = `
    #heiss-reference-gallery-button {
      position: fixed;
      z-index: 900;
      left: 20px;
      bottom: 84px;
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
    #heiss-reference-gallery-button:hover {
      background: rgba(38,38,38,.96);
      border-color: rgba(255,255,255,.28);
    }
    #heiss-reference-gallery-button:focus-visible {
      outline: 2px solid #f4f4f4;
      outline-offset: 3px;
    }
    .heiss-gallery-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      background: rgba(0,0,0,.58);
      backdrop-filter: blur(8px);
      opacity: 0;
      visibility: hidden;
      transition: opacity .18s ease, visibility .18s ease;
    }
    .heiss-gallery-overlay.is-open {
      opacity: 1;
      visibility: visible;
    }
    .heiss-gallery-drawer {
      display: flex;
      flex-direction: column;
      width: min(900px, calc(100vw - 44px));
      height: 100%;
      min-width: 0;
      color: var(--foreground, #f4f4f4);
      background: rgba(15,15,15,.98);
      border-left: 1px solid rgba(255,255,255,.12);
      box-shadow: -24px 0 70px rgba(0,0,0,.45);
      transform: translateX(22px);
      transition: transform .22s cubic-bezier(.16,1,.3,1);
    }
    .heiss-gallery-overlay.is-open .heiss-gallery-drawer { transform: translateX(0); }
    .heiss-gallery-head {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .heiss-gallery-title {
      margin: 0;
      font: 650 20px/1.2 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-count {
      margin-left: auto;
      color: rgba(255,255,255,.58);
      font: 500 12px/1.2 var(--font-mono, monospace);
    }
    .heiss-gallery-close {
      width: 34px;
      height: 34px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 50%;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 18px/1 system-ui, sans-serif;
    }
    .heiss-gallery-close:hover { background: rgba(255,255,255,.13); }
    .heiss-gallery-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      overflow-x: auto;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .heiss-gallery-tab {
      flex: 0 0 auto;
      height: 34px;
      padding: 0 14px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: rgba(255,255,255,.62);
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-tab:hover { color: #fff; background: rgba(255,255,255,.06); }
    .heiss-gallery-tab.is-active {
      color: #0a0a0a;
      background: #f4f4f4;
    }
    .heiss-gallery-tab.has-selection:not(.is-active) {
      color: #fff;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.28);
    }
    .heiss-gallery-search {
      min-width: 190px;
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
    .heiss-gallery-search:focus { border-color: rgba(255,255,255,.42); }
    .heiss-gallery-status {
      min-height: 30px;
      padding: 10px 20px 0;
      color: rgba(255,255,255,.66);
      font: 500 12px/1.5 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
      gap: 12px;
      padding: 12px 20px 20px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    .heiss-gallery-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-self: start;
      min-width: 0;
      height: 280px;
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 8px;
      background: #191919;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .heiss-gallery-card:hover {
      border-color: rgba(255,255,255,.32);
      transform: translateY(-1px);
    }
    .heiss-gallery-card.is-selected {
      border-color: rgba(255,255,255,.92);
      box-shadow: 0 0 0 2px rgba(255,255,255,.2);
    }
    .heiss-gallery-check {
      position: absolute;
      top: 8px;
      right: 8px;
      display: grid;
      width: 24px;
      height: 24px;
      place-items: center;
      border-radius: 50%;
      background: #f4f4f4;
      color: #0a0a0a;
      box-shadow: 0 2px 8px rgba(0,0,0,.35);
      font: 700 12px/1 system-ui, sans-serif;
    }
    .heiss-gallery-multiselect {
      height: 32px;
      margin-left: auto;
      padding: 0 12px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      background: rgba(255,255,255,.05);
      color: inherit;
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-multiselect.is-active {
      background: #f4f4f4;
      color: #0a0a0a;
    }
    .heiss-gallery-card:disabled { opacity: .58; cursor: wait; }
    .heiss-gallery-image {
      display: block;
      width: 100%;
      height: 220px;
      object-fit: cover;
      background: #111;
    }
    .heiss-gallery-copy {
      display: block;
      flex: 1 1 auto;
      padding: 9px 10px 10px;
      overflow: hidden;
    }
    .heiss-gallery-name,
    .heiss-gallery-meta {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .heiss-gallery-name {
      font: 600 12px/1.4 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-meta {
      margin-top: 3px;
      color: rgba(255,255,255,.5);
      font: 500 10px/1.4 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-foot {
      display: flex;
      justify-content: center;
      padding: 0 20px 20px;
    }
    .heiss-gallery-selection {
      display: none;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      border-top: 1px solid rgba(255,255,255,.08);
      background: rgba(10,10,10,.96);
    }
    .heiss-gallery-selection.is-visible { display: flex; }
    .heiss-gallery-selection-count {
      color: rgba(255,255,255,.7);
      font: 600 12px/1.2 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-selection button {
      height: 34px;
      padding: 0 14px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-selection button:last-child {
      margin-left: auto;
      border-color: transparent;
      background: #f4f4f4;
      color: #0a0a0a;
    }
    .heiss-gallery-selection button:disabled {
      opacity: .42;
      cursor: default;
    }
    .heiss-gallery-more {
      height: 36px;
      padding: 0 18px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: inherit;
      cursor: pointer;
      font: 600 12px/1 var(--font-sans, system-ui, sans-serif);
    }
    .heiss-gallery-empty {
      grid-column: 1 / -1;
      padding: 60px 20px;
      color: rgba(255,255,255,.5);
      text-align: center;
      font: 500 13px/1.5 var(--font-sans, system-ui, sans-serif);
    }
    @media (max-width: 720px) {
      #heiss-reference-gallery-button {
        left: 12px;
        bottom: 76px;
        height: 34px;
        padding: 0 13px;
      }
      .heiss-gallery-drawer {
        width: 100vw;
        border-left: 0;
      }
      .heiss-gallery-head { padding: 14px 14px 10px; }
      .heiss-gallery-controls { padding: 10px 14px; flex-wrap: wrap; }
      .heiss-gallery-search { order: 2; width: 100%; margin-left: 0; }
      .heiss-gallery-status { padding: 8px 14px 0; }
      .heiss-gallery-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 10px 14px 16px;
      }
      .heiss-gallery-card { height: 260px; }
      .heiss-gallery-image { height: 200px; }
    }
  `;
  document.head.appendChild(style);

  function makeButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  function updateStatus(message) {
    if (status) status.textContent = message || "";
  }

  async function load(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) {
      items = [];
      total = 0;
      hasMore = false;
      warning = "";
      if (grid) grid.textContent = "";
    }
    updateStatus("正在读取参考图库…");
    try {
      const params = new URLSearchParams({
        category: currentCategory,
        q: query,
        offset: String(reset ? 0 : items.length),
        limit: "80"
      });
      const response = await fetch(`/api/reference-gallery?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "参考图库读取失败。");
      warning = String(payload.warning || "");
      const nextItems = (payload.items || []).map((item) => ({ ...item, category: payload.category || currentCategory }));
      items = reset ? nextItems : [...items, ...nextItems];
      total = Number(payload.total || items.length);
      hasMore = Boolean(payload.hasMore);
      render();
      updateStatus(warning || (items.length ? "" : "没有匹配的参考图。"));
    } catch (error) {
      updateStatus(error instanceof Error ? error.message : "参考图库读取失败。");
    } finally {
      loading = false;
    }
  }

  const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const selectionKey = (item) => `${item.category || currentCategory}:${item.id}`;

  async function detectReferenceSlotCount() {
    if (!document.querySelector(".composer-reference")) return 0;
    const currentName = document.querySelector(".model-trigger")?.textContent?.trim() || "";
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const payload = await response.json();
      const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
      const current = profiles.find((profile) => [profile.displayName, profile.label].filter(Boolean).includes(currentName));
      const count = Array.isArray(current?.mediaInputs) ? current.mediaInputs.length : 0;
      if (count) return count;
    } catch {}
    const lead = document.querySelector(".composer-reference-slots > *");
    if (lead?.querySelector(".ref-stack-add")) return 2;
    return Math.max(1, document.querySelectorAll(".composer-reference-slots > *").length);
  }

  async function waitForReferenceSlotCount(timeout = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const count = await detectReferenceSlotCount();
      if (count) return count;
      await sleep(250);
    }
    return 0;
  }

  function prepareFile(item) {
    return fetch(item.fullUrl)
      .then((response) => {
        if (!response.ok) throw new Error("参考图读取失败。");
        return response.blob();
      })
      .then((blob) => {
        const type = blob.type || "image/png";
        const extension = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
        return new File([blob], `${String(item.title || item.id).replace(/[\\/:*?"<>|]+/g, "_")}.${extension}`, { type });
      });
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

  async function useReference(item, card) {
    if (!document.querySelector(".composer-reference")) {
      updateStatus("当前模型没有参考图输入，请先选择一个支持参考图的模型。");
      return;
    }
    card.disabled = true;
    updateStatus("正在准备参考图…");
    try {
      const file = await prepareFile(item);
      if (!dispatchReference(file)) throw new Error("当前页面没有可用的参考图输入。");
      updateStatus("参考图已发送，正在上传…");
      window.setTimeout(closeDrawer, 350);
    } catch (error) {
      updateStatus(error instanceof Error ? error.message : "参考图读取失败。");
      card.disabled = false;
    }
  }

  function updateSelectionUi() {
    if (!selectionBar || !selectionCount || !addSelectedButton) return;
    selectionBar.classList.toggle("is-visible", multiMode);
    selectionCount.textContent = `已选择 ${selectedItems.size} 张`;
    addSelectedButton.disabled = !selectedItems.size || addingReferences;
    addSelectedButton.textContent = addingReferences ? "正在加入…" : `加入参考图${selectedItems.size ? `（${selectedItems.size}）` : ""}`;
    drawer?.querySelectorAll(".heiss-gallery-tab").forEach((button) => {
      const baseLabel = button.dataset.label || button.textContent || "";
      const selectedCount = [...selectedItems.values()].filter((item) => item.category === button.dataset.category).length;
      button.textContent = selectedCount ? `${baseLabel} ${selectedCount}` : baseLabel;
      button.classList.toggle("has-selection", selectedCount > 0);
    });
  }

  async function toggleSelection(item) {
    const key = selectionKey(item);
    if (selectedItems.has(key)) {
      selectedItems.delete(key);
    } else {
      const slots = currentReferenceSlots || await detectReferenceSlotCount();
      currentReferenceSlots = slots;
      if (!slots) {
        updateStatus("当前模型没有参考图输入，请先选择一个支持参考图的模型。");
        return;
      }
      if (selectedItems.size >= slots) {
        updateStatus(slots === 1
          ? "当前模型只有 1 个参考图槽位，请切换支持多图的模型或自定义工作流。"
          : `当前模型有 ${slots} 个参考图槽位，最多选择 ${slots} 张。`);
        return;
      }
      selectedItems.set(key, item);
    }
    render();
    updateSelectionUi();
  }

  async function setMultiMode(next) {
    multiMode = next;
    if (!multiMode) {
      selectedItems.clear();
      currentReferenceSlots = 0;
    }
    multiButton?.classList.toggle("is-active", multiMode);
    multiButton?.setAttribute("aria-pressed", String(multiMode));
    if (multiMode) {
      const slots = await waitForReferenceSlotCount();
      currentReferenceSlots = slots;
      updateStatus(!slots
        ? "当前模型没有参考图输入，请先选择一个支持参考图的模型。"
        : slots === 1
          ? "当前模型只有 1 个参考图槽位，请切换支持多图的模型或自定义工作流。"
          : `当前模型有 ${slots} 个参考图槽位，可连续加入多张。`);
    } else {
      updateStatus("");
    }
    render();
    updateSelectionUi();
  }

  async function addSelectedReferences() {
    if (addingReferences || !selectedItems.size) return;
    const slots = await detectReferenceSlotCount();
    currentReferenceSlots = slots;
    if (!slots || !document.querySelector(".composer-reference")) {
      updateStatus("当前模型没有参考图输入，请先选择一个支持参考图的模型。");
      return;
    }
    if (selectedItems.size > slots) {
      updateStatus(`当前模型只有 ${slots} 个参考图槽位，无法一次加入 ${selectedItems.size} 张。`);
      return;
    }
    const picks = [...selectedItems.values()];
    addingReferences = true;
    updateSelectionUi();
    try {
      for (let index = 0; index < picks.length; index += 1) {
        updateStatus(`正在加入第 ${index + 1} / ${picks.length} 张参考图…`);
        const file = await prepareFile(picks[index]);
        if (!dispatchReference(file)) throw new Error("当前页面没有可用的参考图输入。");
        await waitForReferenceUpload();
      }
      updateStatus(`已加入 ${picks.length} 张参考图。`);
      selectedItems.clear();
      updateSelectionUi();
      window.setTimeout(closeDrawer, 500);
    } catch (error) {
      updateStatus(error instanceof Error ? error.message : "参考图加入失败。");
    } finally {
      addingReferences = false;
      updateSelectionUi();
    }
  }

  function render() {
    if (!grid) return;
    grid.textContent = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "heiss-gallery-empty";
      empty.textContent = "没有匹配的参考图。";
      grid.appendChild(empty);
    } else {
      for (const item of items) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "heiss-gallery-card";
        const key = selectionKey(item);
        const isSelected = selectedItems.has(key);
        card.classList.toggle("is-selected", isSelected);
        card.setAttribute("aria-pressed", String(isSelected));
        card.setAttribute("aria-label", `${multiMode ? "选择参考图" : "使用参考图"}：${item.title}`);
        card.addEventListener("click", () => multiMode ? toggleSelection(item) : useReference(item, card));

        const image = document.createElement("img");
        image.className = "heiss-gallery-image";
        image.src = item.thumbUrl;
        image.loading = "lazy";
        image.alt = "";
        card.appendChild(image);
        if (isSelected) {
          const check = document.createElement("span");
          check.className = "heiss-gallery-check";
          check.textContent = "✓";
          card.appendChild(check);
        }

        const copy = document.createElement("span");
        copy.className = "heiss-gallery-copy";
        const name = document.createElement("span");
        name.className = "heiss-gallery-name";
        name.textContent = item.title || item.id;
        const meta = document.createElement("span");
        meta.className = "heiss-gallery-meta";
        meta.textContent = item.subtitle || item.id;
        copy.append(name, meta);
        card.appendChild(copy);
        grid.appendChild(card);
      }
    }
    if (count) count.textContent = `${items.length} / ${total}`;
    const oldMore = drawer?.querySelector(".heiss-gallery-more");
    if (!hasMore && oldMore) oldMore.remove();
    if (hasMore && !oldMore) {
      const more = makeButton("加载更多", "heiss-gallery-more");
      more.addEventListener("click", () => load(false));
      drawer.querySelector(".heiss-gallery-foot").appendChild(more);
    }
    updateSelectionUi();
  }

  function selectCategory(id) {
    currentCategory = id;
    drawer.querySelectorAll(".heiss-gallery-tab").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.category === id);
    });
    load(true);
  }

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.querySelector(".heiss-gallery-close")?.focus();
    updateSelectionUi();
    if (!items.length) load(true);
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function buildDrawer() {
    const overlay = document.createElement("div");
    overlay.className = "heiss-gallery-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const panel = document.createElement("section");
    panel.className = "heiss-gallery-drawer";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "参考图库");

    const head = document.createElement("header");
    head.className = "heiss-gallery-head";
    const title = document.createElement("h2");
    title.className = "heiss-gallery-title";
    title.textContent = "参考图库";
    multiButton = makeButton("多选", "heiss-gallery-multiselect");
    multiButton.setAttribute("aria-pressed", "false");
    multiButton.addEventListener("click", () => setMultiMode(!multiMode));
    count = document.createElement("span");
    count.className = "heiss-gallery-count";
    const close = makeButton("×", "heiss-gallery-close");
    close.setAttribute("aria-label", "关闭参考图库");
    close.addEventListener("click", closeDrawer);
    head.append(title, multiButton, count, close);

    const controls = document.createElement("div");
    controls.className = "heiss-gallery-controls";
    for (const category of categories) {
      const button = makeButton(category.label, "heiss-gallery-tab");
      button.dataset.category = category.id;
      button.dataset.label = category.label;
      button.classList.toggle("is-active", category.id === currentCategory);
      button.addEventListener("click", () => selectCategory(category.id));
      controls.appendChild(button);
    }
    search = document.createElement("input");
    search.className = "heiss-gallery-search";
    search.type = "search";
    search.placeholder = "搜索参考图";
    search.setAttribute("aria-label", "搜索参考图");
    search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        query = search.value.trim();
        load(true);
      }, 250);
    });
    controls.appendChild(search);

    status = document.createElement("div");
    status.className = "heiss-gallery-status";
    status.setAttribute("role", "status");
    grid = document.createElement("div");
    grid.className = "heiss-gallery-grid";
    selectionBar = document.createElement("div");
    selectionBar.className = "heiss-gallery-selection";
    selectionCount = document.createElement("span");
    selectionCount.className = "heiss-gallery-selection-count";
    const clearSelection = makeButton("清空", "");
    clearSelection.addEventListener("click", () => {
      selectedItems.clear();
      render();
      updateSelectionUi();
    });
    addSelectedButton = makeButton("加入参考图", "");
    addSelectedButton.addEventListener("click", addSelectedReferences);
    selectionBar.append(selectionCount, clearSelection, addSelectedButton);
    const foot = document.createElement("footer");
    foot.className = "heiss-gallery-foot";
    panel.append(head, controls, status, grid, selectionBar, foot);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeDrawer();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) closeDrawer();
    });
    drawer = overlay;
  }

  function start() {
    if (document.getElementById("heiss-reference-gallery-button")) return;
    const button = makeButton("参考图库", "");
    button.id = "heiss-reference-gallery-button";
    button.title = "打开本地参考图库";
    button.addEventListener("click", openDrawer);
    document.body.appendChild(button);
    buildDrawer();
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
