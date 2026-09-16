async function downloadAllImages() {
  const GB = 1024 * 1024 * 1024;
  const chunkSize = 1 * GB;
  const zipFileName = appendFileNameId("mazanoke-images");

  const nameCount = {};
  const getUniqueName = (name) => {
    if (!nameCount[name]) {
      nameCount[name] = 1;
      return name;
    } else {
      const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
      const base = ext ? name.slice(0, -ext.length) : name;
      let newName;
      do {
        newName = `${base} (${nameCount[name]})${ext}`;
        nameCount[name]++;
      } while (nameCount[newName]);
      nameCount[newName] = 1;
      return newName;
    }
  };

  try {
    if (state.isDownloadingAll) return;
    state.isDownloadingAll = true;
    ui.actions.downloadAll.setAttribute("aria-busy", "true");

    const compressedImages = document.querySelectorAll(
      'a.image-output__item-download-button[href^="blob:"]'
    );
    const blobs = await Promise.all(
      Array.from(compressedImages).map(async (link, index) => {
        try {
          const response = await fetch(link.href);
          if (!response.ok)
            throw new Error(`Failed to fetch image ${index + 1}`);
          return await response.blob();
        } catch (error) {
          console.error(`Error downloading image ${index + 1}:`, error);
          return null;
        }
      })
    );

    const validBlobs = blobs.filter((blob) => blob !== null);

    if (validBlobs.length === 0) {
      throw new Error("No valid images to download");
    }

    let currentZip = new lib.jsZip();
    let totalSize = 0;
    let zipIndex = 1;

    for (let i = 0; i < validBlobs.length; i++) {
      const fileSize = parseInt(compressedImages[i].dataset.filesize, 10);

      if (totalSize + fileSize > chunkSize) {
        const zipBlob = await currentZip.generateAsync({ type: "blob" });
        await triggerDownload(
          zipBlob,
          `${zipFileName}-${zipIndex.toString().padStart(3, "0")}.zip`
        );

        currentZip = new lib.jsZip();
        totalSize = 0;
        zipIndex++;
      }

      const originalName = compressedImages[i].download;
      const fileName = getUniqueName(originalName);
      currentZip.file(fileName, validBlobs[i]);
      totalSize += fileSize;
    }

    if (totalSize > 0) {
      const finalName =
        zipIndex === 1
          ? `${zipFileName}.zip`
          : `${zipFileName}-${zipIndex.toString().padStart(3, "0")}.zip`;
      const zipBlob = await currentZip.generateAsync({ type: "blob" });
      await triggerDownload(zipBlob, finalName);
    }
  } catch (error) {
    console.error("Download all images as zip failed:", error);
  } finally {
    ui.actions.downloadAll.setAttribute("aria-busy", "false");
    state.isDownloadingAll = false;
  }
}

async function triggerDownload(blob, filename) {
  return new Promise((resolve) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      resolve();
    }, 100);
  });
}

async function deleteImage(elementId) {
  if (!elementId) { return }
  const image = document.getElementById(elementId);
  image.style.pointerEvents = "none";
  image.classList.add("fade-out-shrink");
  await updateImageCounter(-1).then( () => {
    image.addEventListener("animationend", () => {  
      image.remove();
      updateOutputEmptyState();
    }, { once: true }); 
  });
}

async function deleteAllImages() {
  ui.output.content.style.overflow = "hidden";
  ui.output.content.classList.add("fade-out-shrink");
  await updateImageCounter(0, true).then( () => {
    ui.output.content.addEventListener("animationend", () => {
      ui.output.content.innerHTML = "";
      updateOutputEmptyState();
      ui.output.content.style.overflow = "";
      ui.output.content.classList.remove("fade-out-shrink");
    }, { once: true }); 
  });
}
