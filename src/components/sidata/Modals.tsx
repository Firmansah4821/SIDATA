import { useState } from 'react';
import { SidataRecord, getDetailFields, typeLabels, formFields } from '@/lib/sidata-config';
import { X, Eye, AlertTriangle, FileDown, FileSpreadsheet } from 'lucide-react';

function ModalOverlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up border border-border mx-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, icon, onClose }: { title: string; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex justify-between items-center mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const btnSecondary = "flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-all active:scale-[0.98]";

// Detail Modal with export buttons
interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  record: SidataRecord | null;
  onExportPdf?: (record: SidataRecord) => void;
  onExportExcel?: (record: SidataRecord) => void;
}

export function DetailModal({ open, onClose, record, onExportPdf, onExportExcel }: DetailModalProps) {
  if (!record) return null;
  const fields = getDetailFields(record);
  const fileFields = (formFields[record.type] || []).filter(f => f.type === 'file');

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <ModalHeader title="Detail Data" icon={<Eye className="w-4 h-4" />} onClose={onClose} />
      <div className="space-y-3">
        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          {typeLabels[record.type]}
        </div>
        <div className="space-y-2.5 bg-muted/30 rounded-xl p-4">
          {fields.map(f => (
            <div key={f.label} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 w-36">{f.label}</span>
              <span className="text-sm text-foreground">{f.value}</span>
            </div>
          ))}

          {/* File/image fields */}
          {fileFields.map(f => {
            const val = record[f.id];
            if (!val) return null;
            const fileArr: string[] = Array.isArray(val) ? val : [val];
            return (
              <div key={f.id} className="flex flex-col gap-1 pt-1">
                <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
                <div className="flex flex-wrap gap-2">
                  {fileArr.filter(Boolean).map((v, i) => {
                    if (v.startsWith('data:image')) {
                      return <img key={i} src={v} alt={f.label} className="w-20 h-20 object-cover rounded-lg border border-border" />;
                    }
                    if (v.startsWith('http')) {
                      const fileName = decodeURIComponent((v.split('/').pop() || 'Dokumen').split('?')[0]);
                      const displayName = fileName.replace(/^\d+_/, '');
                      const isImg = /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(v);
                      return (
                        <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-lg">
                          {isImg ? '🖼️' : '📄'} {displayName}
                        </a>
                      );
                    }
                    return <span key={i} className="text-xs text-muted-foreground">{v}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Dikirim: {record.submitted_at ? new Date(record.submitted_at).toLocaleString('id-ID') : '-'}
        </p>

        {/* Export buttons inside detail */}
        {(onExportPdf || onExportExcel) && (
          <div className="flex gap-2 pt-3 border-t border-border">
            {onExportPdf && (
              <button
                onClick={() => onExportPdf(record)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
              >
                <FileDown className="w-4 h-4" />
                Eksport PDF
              </button>
            )}
            {onExportExcel && (
              <button
                onClick={() => onExportExcel(record)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-success/10 text-success hover:bg-success/20 transition-all active:scale-95 border border-success/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Eksport Excel
              </button>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// Confirm Delete Modal
export function ConfirmDeleteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="text-center py-2">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Hapus Data?</h3>
        <p className="text-sm text-muted-foreground mb-6">Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className={btnSecondary}>Batal</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">Hapus</button>
        </div>
      </div>
    </ModalOverlay>
  );
}
