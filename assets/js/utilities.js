/**
 * 检查文件类型是否支持
 */
function isFileTypeSupported(fileType, file) {
  // 检查是否为支持的文件类型

  if (lib.heicTo.isHeic(file) && isHeicExt(file)) {
    fileType = "image/heic";
    ui.outputFileType = "image/heic";
    console.log('文件类型为 HEIC: ', fileType)
  }

  const supportedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/gif",
    "image/svg+xml",
    "image/jxl",
    "image/vnd.microsoft.icon",
    "image/x-icon",
    "image/tiff",
  ];

  return supportedFileTypes.includes(fileType);
}

/**
 * 判断目标输出格式是否需要后处理
 * （浏览器无法直接输出的格式，需要自定义编码）
 */
function isPostProcessingRequired(targetOutputfileType) {

  const postProcessingTypes = [
    /**
     * 添加浏览器无法直接输出的 MIME 类型，
     * 需要在 postProcessImage() 中实现自定义编码。
     */
    "image/vnd.microsoft.icon",
    "image/x-icon",
  ];

  return postProcessingTypes.includes(targetOutputfileType);
}

/**
 * MIME 类型转文件扩展名
 */
function mimeToExtension(mimeType) {
  const fileExtensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heic": "heif",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/jxl": "jxl",
    "image/vnd.microsoft.icon": "ico",
    "image/x-icon": "ico",
    "image/tiff": "tiff",
    "image/dng": "tiff",
    "image/x-adobe-dng": "tiff",
  };

  return (
    fileExtensionMap[mimeType] || mimeType.replace("image/", "").split("+")[0]
  );
}

/**
 * 默认格式转换映射
 * 当用户未指定输出格式时，将某些特殊格式转换为 PNG
 */
function defaultConversionMapping(mimeType) {
  const conversionMap = {
    // 这些格式无法直接压缩为原格式，转换为对应的格式
    "image/heic": "image/png",
    "image/heif": "image/png",
    "image/avif": "image/png",
    "image/gif": "image/png",
    "image/svg+xml": "image/png",
    "image/vnd.microsoft.icon": "image/png",
    "image/x-icon": "image/png",
  };

  console.log('输入 MIME 类型 ', mimeType);
  console.log('映射后 MIME 类型 ', conversionMap[mimeType]);

  return conversionMap[mimeType] || mimeType;
}

/**
 * 检查文件名是否以 .heic 或 .heif 结尾
 */
function isHeicExt(file) {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.heic') || fileName.endsWith('.heif');
}

/**
 * 检查文件名是否以指定扩展名结尾
 */
function isFileExt(file, extension = "") {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith(`.${extension}`);
}

/**
 * 根据上传的文件和用户选择的目标格式，确定输入/输出的文件类型和扩展名
 *
 * @param {File} file - 图片文件对象
 * @returns {Object} 包含以下属性：
 *   @property {string} inputFileType - 上传文件的 MIME 类型（如 "image/jpeg"）
 *   @property {string} inputFileExtension - 上传文件的扩展名（如 "jpg"）
 *   @property {string} outputFileExtension - 压缩后的目标扩展名（如 "webp"）
 *   @property {string} selectedFormat - 用户选择的输出格式 MIME 类型（如 "image/webp"）
 */
function getFileType(file) {
  let selectedFormat = getCheckedValue(ui.inputs.formatSelect);
  let inputFileType = file.type;
  const inputFileExtension = mimeToExtension(file.type) || "";
  let outputFileExtension = "";

  if (selectedFormat && selectedFormat !== "default") {
    // 用户选择了输出格式
    const extension = mimeToExtension(selectedFormat);
    outputFileExtension = extension;
  } else {
    // 用户未选择格式，使用输入文件的格式（或默认转换）
    file.type = !file.type && isHeicExt(file) ? "image/heic" : file.type;
    selectedFormat = defaultConversionMapping(file.type) || "png";

    console.log("输入文件扩展名: ", inputFileExtension);
    outputFileExtension = mimeToExtension(selectedFormat);
    console.log("输出文件扩展名: ", outputFileExtension);
  }

  return {
    inputFileType,
    inputFileExtension,
    outputFileExtension,
    selectedFormat,
  };
}

/**
 * 更新文件名扩展名
 */
function updateFileExtension(originalName, fileExtension, selectedFormat) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const newExtension = selectedFormat
    ? mimeToExtension(fileExtension)
    : fileExtension;

  console.log('新扩展名: ', newExtension);
  return `${baseName}.${newExtension}`;
}

/**
 * 为文件名添加随机 ID（用于避免重名）
 */
function appendFileNameId(fileName = "image") {
  if (typeof fileName !== 'string') return null;

  const lastDotIndex = fileName.lastIndexOf('.');
  const fileExt = (lastDotIndex === -1 || lastDotIndex === 0) ? '' : fileName.slice(lastDotIndex).toLowerCase();
  const baseFileName = (lastDotIndex === -1) ? fileName : fileName.slice(0, lastDotIndex);

  const fileId = Math.random().toString(36).substring(2, 6).toUpperCase();
  return baseFileName + "-" + fileId + fileExt;
}

/**
 * 检查是否为浏览器默认生成的文件名（如从剪贴板粘贴时）
 * 如果是，则重命名
 */
function renameBrowserDefaultFileName(fileName) {
  /**
   * 简单判断：如果文件名符合浏览器默认命名规则（如 `image.png`）
   * 或者 iOS 设备拖拽导出的 `HEIF Image.heic`
   * 此方法可能因浏览器和语言环境而异
   */
  const defaultNames = [/^image\.\w+$/i, /^heif image\.heic$/i];

  if (defaultNames.some(regex => regex.test(fileName))) {
    return { renamedFileName: appendFileNameId(fileName), isBrowserDefaultFileName: true };
  }
  return { renamedFileName: fileName, isBrowserDefaultFileName: false };
}

/**
 * 校验文件大小限制值
 * @param {number} value - 输入值
 * @param {string} unit - 单位（"MB" 或 "KB"）
 * @returns {Object} { value, message }，message 为错误信息，无错误时为 null
 */
function validateWeight(value, unit = "MB") {
  value = Number(value);
  let [min, max] = [config.weightLimit.min, config.weightLimit.max];
  min = unit.toUpperCase() === "KB" ? min * 1000 : min; 
  max = unit.toUpperCase() === "KB" ? max * 1000 : max; 

  if (typeof value !== 'number' || isNaN(value) || !Number.isFinite(value)) {
    const message = "输入值无效，不是有效数字。";
    return {value: null, message}
  }
  else if (value < min) {
    const message = `最小文件大小为 ${min}${unit.toUpperCase()}。`;
    return {value: min, message}
  }
  else if (value > max) {
    const message = `最大文件大小为 ${max}${unit.toUpperCase()}。`;
    return {value: max, message}
  }

  return {value, message: null}
}

/**
 * 获取一组 radio 按钮中当前选中的值
 */
function getCheckedValue(nodeList) {
  return [...nodeList].find((el) => el.checked)?.value || null;
}

/**
 * 获取图片的宽高
 * @param {Blob|string} imageInput - 图片 blob 或 URL
 * @returns {Promise<{outputImageWidth: number, outputImageHeight: number}>}
 */
function getImageDimensions(imageInput) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl;

    if (imageInput instanceof Blob) {
      objectUrl = URL.createObjectURL(imageInput);
      img.src = objectUrl;
    } else if (typeof imageInput === "string") {
      img.src = imageInput;
    } else {
      reject(new Error("getImageDimensions 收到无效的输入。"));
      return;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({
        outputImageWidth: img.naturalWidth,
        outputImageHeight: img.naturalHeight,
      });
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("加载图片获取尺寸失败。"));
    };
  });
}

/**
 * 调整尺寸限制值，防止短边为 0
 * 根据长边和短边的比例计算最小允许值
 */
function getAdjustedDimensions({ imageBlob, width, height }, desiredLimitDimensions) {
  return new Promise((resolve) => {
    const compute = (w, h) => {
      if (!w || !h) return resolve(undefined);
      const shortEdge = Math.min(w, h);
      const longEdge = Math.max(w, h);
      const minAllowedDimension = Math.ceil(longEdge * (1 / shortEdge));
      resolve(Math.max(desiredLimitDimensions, minAllowedDimension));
    };

    if (typeof width === 'number' && typeof height === 'number') {
      compute(width, height);
    } else if (imageBlob instanceof Blob) {
      getImageDimensions(imageBlob).then(({ outputImageWidth, outputImageHeight }) => {
        compute(outputImageWidth, outputImageHeight);
      });
    } else {
      resolve(undefined);
    }
  });
}

/**
 * 调试工具：在页面顶部显示 blob 图片
 * （仅供开发调试使用）
 */
function debugBlobImageOutput(blob) {
  const blobURL = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = blobURL;
  img.style.maxWidth = "100%";
  img.style.display = "block";
  document.body.prepend(img);
}