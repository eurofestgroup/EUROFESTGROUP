'use strict';
let chain = Promise.resolve();
self.onmessage = event => {
  const { id, blob } = event.data;
  chain = chain.then(async () => {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
      if (bitmap.width * bitmap.height > 25000000) throw Error('large');
      const ratio = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * ratio)), Math.max(1, Math.round(bitmap.height * ratio)));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const preview = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
      self.postMessage({ id, blob: preview.size < blob.size ? preview : blob });
    } catch (_) { self.postMessage({ id, blob }); }
    finally { bitmap?.close(); }
  });
};
