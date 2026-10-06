import type { AnalysisResult } from '../ResultAI/mockData';

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'text' | 'photo';
  queryText: string;
  thumbnail?: string;
  result: AnalysisResult;
}

/**
 * Generates a compressed, square base64 JPEG thumbnail from an HTMLImageElement.
 * This is saved in localStorage history instead of original bloated files/blobs.
 */
export const generateThumbnail = (img: HTMLImageElement, size = 100): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      
      if (!naturalWidth || !naturalHeight) {
        return '';
      }
      
      const minDim = Math.min(naturalWidth, naturalHeight);
      const sx = (naturalWidth - minDim) / 2;
      const sy = (naturalHeight - minDim) / 2;
      
      // Draw centered cropped square
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      return canvas.toDataURL('image/jpeg', 0.65); // JPEG compression at 65% for small footprint
    }
  } catch (e) {
    console.error('Failed to generate image thumbnail:', e);
  }
  return '';
};
