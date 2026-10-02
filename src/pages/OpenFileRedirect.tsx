import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { buildFileDirectUrl, isAllowedStorageFileUrl } from '@/lib/file-link-utils';

export default function OpenFileRedirect() {
  const [searchParams] = useSearchParams();

  const targetUrl = useMemo(() => {
    const target = searchParams.get('target') || '';
    return buildFileDirectUrl(target);
  }, [searchParams]);

  const isValidTarget = useMemo(() => {
    if (!targetUrl) return false;
    return isAllowedStorageFileUrl(targetUrl);
  }, [targetUrl]);

  useEffect(() => {
    if (isValidTarget && targetUrl) {
      window.location.replace(targetUrl);
    }
  }, [isValidTarget, targetUrl]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isValidTarget ? (
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-primary mt-0.5 animate-spin" />
            <div>
              <h1 className="text-base font-semibold text-foreground">Membuka dokumen...</h1>
              <p className="text-sm text-muted-foreground mt-1">Anda akan diarahkan otomatis ke file dokumen.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h1 className="text-base font-semibold text-foreground">Link dokumen tidak valid</h1>
              <p className="text-sm text-muted-foreground mt-1">Silakan ekspor ulang data terbaru lalu klik link dokumen kembali.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
