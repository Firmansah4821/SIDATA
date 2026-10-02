const TIMESTAMP_PREFIX_REGEX = /^\d+_/;

export function buildFileDirectUrl(url: string): string {
  const raw = url?.trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function isImageFileUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|bmp)(\?|#|$|\/)/i.test(url);
}

export function getCleanStorageFileName(url: string): string {
  try {
    const directUrl = buildFileDirectUrl(url);
    if (!directUrl) return 'Dokumen';

    const pathPart = new URL(directUrl).pathname.split('/').pop() || 'Dokumen';
    const fileName = decodeURIComponent(pathPart);
    return fileName.replace(TIMESTAMP_PREFIX_REGEX, '');
  } catch {
    return 'Dokumen';
  }
}

export function isAllowedStorageFileUrl(url: string): boolean {
  // Allow any valid http/https URL (Supabase storage, Tally storage, Google Drive, etc.)
  return !!buildFileDirectUrl(url);
}

export function buildFileOpenRedirectUrl(url: string): string {
  const directUrl = buildFileDirectUrl(url);
  if (!directUrl) return '';

  // Open the file URL directly in a new tab — browsers handle images/PDFs/Office docs natively.
  return directUrl;
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
