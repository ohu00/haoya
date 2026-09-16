/**
 * events.js - 事件绑定（支持手动触发压缩）
 * 修改：文件选择/拖放/粘贴只加入待处理队列，点击“开始压缩”才触发压缩
 * 修复：压缩进行中禁止点击/拖放/change事件触发文件选择
 */

initApp();

function initApp() {
  // 初始化应用
  initDropZone();
  initInputValidation();
  initClipboardPaste();
  initBackToTop();
  setConfigForm();
  restoreConfigForm();

  // 初始化待处理队列
  state.pendingQueue = [];
  updatePendingUI();

  // 绑定开始压缩按钮
  const startBtn = document.getElementById('startCompressBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      if (state.isCompressing || state.pendingQueue.length === 0) return;
      // 将待处理队列移至压缩队列
      state.compressQueue = state.pendingQueue.slice();
      state.pendingQueue = [];
      updatePendingUI();
      startCompressionFromQueue(); // 定义在 compression.js
    });
  }
}

function initDropZone() {
  const dropZone = ui.groups.dropZone;
  const fileInput = ui.inputs.file;

  // 点击区域触发文件选择（压缩进行时禁止）
  dropZone.addEventListener("click", () => {
    if (state.isCompressing) {
      console.log('压缩进行中，禁止选择文件');
      return;
    }
    fileInput.click();
  });

  // 文件选择后：加入队列，不压缩
  fileInput.addEventListener("change", (e) => {
    // 如果正在压缩，忽略此次文件选择并重置input
    if (state.isCompressing) {
      console.log('压缩进行中，忽略新文件');
      fileInput.value = "";
      return;
    }
    if (fileInput.files?.length) {
      addFilesToPendingQueue(fileInput.files);
      fileInput.value = "";
    }
  });

  const toggleDragging = (add) => dropZone.classList.toggle("drop-zone--is-dragging", add);

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
    // 压缩进行中禁止拖放
    if (state.isCompressing) {
      console.log('压缩进行中，禁止拖放');
      return;
    }
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
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
}

function updatePendingUI() {
  const count = state.pendingQueue ? state.pendingQueue.length : 0;
  const countEl = document.getElementById('pendingCount');
  const btn = document.getElementById('startCompressBtn');
  if (countEl) countEl.textContent = count;
  if (btn) btn.disabled = (count === 0 || state.isCompressing);
}