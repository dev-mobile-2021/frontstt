import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";

/**
 * Menu d'actions d'une ligne de tableau (bouton « ⋯ » toujours visible).
 * items : [{ label, icon: Icon, onClick?, to?, danger?, disabled?, hint?, divider? }]
 * Les actions indisponibles restent affichées, grisées, avec la raison (hint).
 */
export default function ActionsMenu({ items = [], label = "Actions" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  function place() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelH = Math.min(items.length * 38 + 16, 360);
    const openUp = window.innerHeight - r.bottom < panelH && r.top > panelH;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
    });
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    if (!open) place();
    setOpen((o) => !o);
  }

  function run(item) {
    if (item.disabled) return;
    setOpen(false);
    if (item.to) navigate(item.to);
    else item.onClick?.();
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
          open ? "bg-[#E8F5EE] border-[#087F3E]/40 text-[#087F3E]" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        }`}
      >
        <MoreVertical size={16} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", right: pos.right, top: pos.top, bottom: pos.bottom, zIndex: 10000 }}
          className="min-w-[230px] bg-white border border-gray-200 rounded-xl shadow-xl py-1.5"
        >
          {items.map((it, i) => {
            if (it.divider) return <div key={`d${i}`} className="my-1 border-t border-gray-100" />;
            const Icon = it.icon;
            return (
              <button
                key={it.label + i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => run(it)}
                title={it.disabled ? it.hint : undefined}
                className={`w-full flex items-start gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
                  it.disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : it.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-700 hover:bg-[#E8F5EE]"
                }`}
              >
                {Icon && <Icon size={15} className="mt-0.5 flex-shrink-0" />}
                <span className="flex-1">
                  {it.label}
                  {it.disabled && it.hint && <span className="block text-[11px] text-gray-300 font-normal leading-tight mt-0.5">{it.hint}</span>}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
