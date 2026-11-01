// "My business profile": saved only in this visitor's browser (localStorage). Never sent to a server.
const KEY = 'bz_desk_profile_v1';
export const EMPTY_PROFILE = { name: '', ntn: '', strn: '', address: '', phone: '', email: '', logo: '', signature: '', stamp: '' };

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...EMPTY_PROFILE, ...(p && typeof p === 'object' ? p : {}) };
  } catch (e) {
    return { ...EMPTY_PROFILE };
  }
}
export function saveProfile(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch (e) {
    return false;
  }
}
export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}

/** Shrinks an image file to a small PNG/JPEG data URL so it fits in browser storage. */
export function imageToDataUrl(file, max = 360) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Choose a PNG, JPG or WebP image.'));
    if (file.size > 4 * 1024 * 1024) return reject(new Error('Image is too large (max 4 MB).'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
