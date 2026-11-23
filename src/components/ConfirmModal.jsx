import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  confirmClass,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const destructiveBtn = "bg-white text-ink-900 border border-line-200 hover:bg-ink-900 hover:text-white";
  const primaryBtn     = "bg-green-600 text-white hover:bg-green-700";
  const confirmBtnCls  = confirmClass ?? destructiveBtn;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="dialog-overlay absolute inset-0 bg-ink-900/40" onClick={onCancel} />
      <div className="dialog-content relative w-full max-w-sm mx-4 rounded-lg border border-line-200 bg-white shadow-popover">
        <div className="border-b border-line-200 px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-ink-500" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          </div>
          <button onClick={onCancel} className="rounded-md p-1 text-ink-500 hover:bg-surface-50 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        {message && (
          <div className="px-5 py-4">
            <p className="text-[13px] text-ink-700 leading-relaxed">{message}</p>
          </div>
        )}
        <div className="border-t border-line-200 px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center h-9 px-3 rounded-md text-[13px] font-medium bg-white text-ink-900 border border-line-200 hover:bg-surface-50 hover:border-ink-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex items-center justify-center h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${confirmBtnCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
