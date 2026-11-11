/**
 * Utilitaires d'images pour les logos de boutique.
 * Le logo est réduit (256 px max) puis stocké en data-URL dans stores.logo_url : aucun bucket de stockage à configurer.
 */

export const fileToResizedDataUrl = (file: File, maxSize = 256, quality = 0.85): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier doit être une image (PNG ou JPG).'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image trop lourde (5 Mo maximum).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible. Essayez un fichier PNG ou JPG.'));
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Traitement de l’image impossible sur cet appareil.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

/**
 * Le compte vendeur n'existe pas encore (confirmation d'e-mail) au moment de l'inscription :
 * le logo choisi est gardé dans ce navigateur, puis envoyé à la première connexion.
 */
const pendingLogoKey = (email: string) => `boutika_pending_logo:${email.trim().toLowerCase()}`;

export const savePendingLogo = (email: string, dataUrl: string): void => {
  try {
    localStorage.setItem(pendingLogoKey(email), dataUrl);
  } catch {
    /* stockage plein ou indisponible : le vendeur pourra ajouter son logo depuis ses paramètres */
  }
};

export const getPendingLogo = (email: string): string | null => {
  try {
    return localStorage.getItem(pendingLogoKey(email));
  } catch {
    return null;
  }
};

export const clearPendingLogo = (email: string): void => {
  try {
    localStorage.removeItem(pendingLogoKey(email));
  } catch {
    /* ignore */
  }
};
