/**
 * events.js - 事件绑定（支持手动触发压缩 + 待处理缩略图预览）
 * 缩略图容器使用棋盘格背景，透明图片也能直观显示
 */

initApp();

function initApp() {
  initDropZone();
  initInputValidation();
  initClipboardPaste();
  initBackToTop();
  setConfigForm();
  restoreConfigForm();

  state.pendingQueue = [];
  state.pendingPreviewUrls = [];
  updatePendingUI();

  const startBtn = document.getElementById('startCompressBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      if (state.isCompressing || state.pendingQueue.length === 0) return;
      state.compressQueue = state.pendingQueue.slice();
      state.pendingQueue = [];
      updatePendingUI();
      renderPendingPreview();
      startCompressionFromQueue();
    });
  }

  const clearBtn = document.getElementById('clearPendingBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.pendingQueue = [];
      updatePendingUI();
      renderPendingPreview();
    });
  }
}

function initDropZone() {
  const dropZone = ui.groups.dropZone;
  const fileInput = ui.inputs.file;

  dropZone.addEventListener("click", (e) => {
    if (state.isCompressing) return;
    if (e.target.closest('.pending-preview__item')) return;
    if (e.target.closest('#clearPendingBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    if (state.isCompressing) {
      fileInput.value = "";
      return;
    }
    if (fileInput.files?.length) {
      addFilesToPendingQueue(fileInput.files);
      fileInput.value = "";
    }
  });

  const toggleDragging = (add) =>
    dropZone.classList.toggle("drop-zone--is-dragging", add);

  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    toggleDragging(true);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    toggleDragging(true);
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    toggleDragging(false);
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    toggleDragging(false);
    if (state.isCompressing) return;
    if (e.dataTransfer.files?.length) {
      addFilesToPendingQueue(e.dataTransfer.files);
      fileInput.value = "";
    }
  });
}

function initInputValidation() {
  ui.inputs.quality.addEventListener("change", () => {
    setQuality(ui.inputs.quality.value);
  });

  ui.inputs.limitDimensions.addEventListener("change", (e) => {
    setLimitDimensions(ui.inputs.limitDimensions.value);
  });

  ui.inputs.limitWeight.addEventListener("change", (e) => {
    setWeight(ui.inputs.limitWeight.value, ui.inputs.limitWeightUnit.value);
  });

  ui.inputs.limitWeightUnit.addEventListener("change", (e) => {
    setWeightUnit(e.target.value);
  });
}

function initClipboardPaste() {
  document.addEventListener("paste", handlePasteImage);
}

function initBackToTop() {
  ui.actions.backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setConfigForm() {
  setQuality(config.form.quality.value);
  setLimitDimensions(config.form.limitDimensions.value);
  setWeightUnit(config.form.limitWeightUnit.value);
  setWeight(config.form.limitWeight.value, config.form.limitWeightUnit.value);
  setCompressMethod(config.form.compressMethod.value);
  setDimensionMethod(config.form.dimensionMethod.value);
  setConvertMethod(config.form.convertMethod.value);
}

function handlePasteImage(e) {
  if (!e.clipboardData || state.isCompressing) return;

  const items = e.clipboardData.items;
  const files = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      files.push(item.getAsFile());
    }
  }

  if (files.length) {
    addFilesToPendingQueue(files);
  }
}

function abort(event) {
  event.stopPropagation();
  if (!state.controller) return;
  resetCompressionState(false, true);
  state.controller.abort(new Error("图片压缩已取消"));
}

// ===== 管理待处理队列 =====
function addFilesToPendingQueue(files) {
  if (!state.pendingQueue) state.pendingQueue = [];
  for (let f of files) {
    state.pendingQueue.push(f);
  }
  updatePendingUI();
  renderPendingPreview();
}

function updatePendingUI() {
  const count = state.pendingQueue ? state.pendingQueue.length : 0;
  const countEl = document.getElementById('pendingCount');
  const btn = document.getElementById('startCompressBtn');
  if (countEl) countEl.textContent = count;
  if (btn) btn.disabled = count === 0 || state.isCompressing;
}

// ===== 缩略图渲染 =====
function renderPendingPreview() {
  const container = document.getElementById('pendingPreviewContainer');
  const list = document.getElementById('pendingPreviewList');
  if (!container || !list) return;

  if (state.pendingPreviewUrls) {
    state.pendingPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
  }
  state.pendingPreviewUrls = [];
  list.innerHTML = '';

  const files = state.pendingQueue || [];
  if (files.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    state.pendingPreviewUrls.push(url);

    const item = document.createElement('div');
    item.className = 'pending-preview__item';
    item.title = file.name;
    // 缩略图容器：棋盘格背景 + 固定 56x56
    item.style.cssText = `
      position: relative;
      width: 56px;
      height: 56px;
      min-width: 56px;
      min-height: 56px;
      max-width: 56px;
      max-height: 56px;
      border-radius: 8px;
      border: 1px solid var(--color-border, #555);
      background-color: #ffffff;
      background-image:
        linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
        linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
        linear-gradient(-45deg, transparent 75%, #d0d0d0 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
      flex-shrink: 0;
      overflow: hidden;
      display: block;
      box-sizing: border-box;
      padding: 0;
      margin: 0;
    `;

    const img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
      border-radius: 7px;
    `;
    item.appendChild(img);

    // ===== 移除按钮：data URI 背景图绘制 ×，!important 强制尺寸 =====
    const removeBtn = document.createElement('div');
    removeBtn.className = 'pending-preview__remove';
    removeBtn.dataset.index = index;
    removeBtn.title = '移除';
    removeBtn.setAttribute('role', 'button');
    removeBtn.setAttribute('aria-label', '移除');
    removeBtn.style.cssText = `
      position: absolute !important;
      top: 3px !important;
      right: 3px !important;
      left: auto !important;
      bottom: auto !important;
      width: 18px !important;
      height: 18px !important;
      min-width: 18px !important;
      min-height: 18px !important;
      max-width: 18px !important;
      max-height: 18px !important;
      border-radius: 50% !important;
      background-color: #e53935 !important;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M2 2 L8 8 M8 2 L2 8' stroke='white' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 10px 10px !important;
      border: 2px solid #191919 !important;
      cursor: pointer !important;
      z-index: 10 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      display: block !important;
      overflow: hidden !important;
      transition: background-color 0.15s ease, transform 0.15s ease !important;
      font-size: 0 !important;
      line-height: 0 !important;
      color: transparent !important;
    `;
    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.setProperty('background-color', '#c62828', 'important');
      removeBtn.style.setProperty('transform', 'scale(1.15)', 'important');
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.setProperty('background-color', '#e53935', 'important');
      removeBtn.style.setProperty('transform', 'scale(1)', 'important');
    });
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePendingFile(index);
    });

    item.appendChild(removeBtn);
    list.appendChild(item);
  });
}

function removePendingFile(index) {
  if (!state.pendingQueue) return;
  state.pendingQueue.splice(index, 1);
  updatePendingUI();
  renderPendingPreview();
}
