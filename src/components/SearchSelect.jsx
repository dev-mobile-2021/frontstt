import { useState, useRef, useEffect, useMemo, Children, isValidElement, Fragment } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";

/**
 * Select avec recherche — remplace <select> à l'identique :
 *   <SearchSelect value={v} onChange={e => set(e.target.value)} className="…">
 *     <option value="">Tous</option>
 *     <option value="a">A</option>
 *   </SearchSelect>
 *
 * - sélection unique : onChange({ target: { value: "a", name } })
 * - sélection multiple (prop `multiple`) : value = tableau, onChange({ target: { value: ["a","b"], name } })
 * - la liste s'ouvre en portail : jamais coupée par un tableau ou une modale.
 */

const MAX_RENDER = 300;

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function textOf(node) {
  return Children.toArray(node)
    .map((c) => (isValidElement(c) ? textOf(c.props.children) : String(c)))
    .join("");
}

function collectOptions(children, out = []) {
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectOptions(child.props.children, out);
    } else if (child.type === "option") {
      const label = textOf(child.props.children);
      out.push({
        value: String(child.props.value ?? label),
        label,
        disabled: !!child.props.disabled,
      });
    } else if (child.props?.children) {
      collectOptions(child.props.children, out);
    }
  });
  return out;
}

// Classes de largeur/positionnement portées par le conteneur, le reste par le bouton.
const WRAPPER_RE = /^(w-|max-w-|min-w-|flex-|grow|shrink|basis-|self-|col-span-|m[trblxy]?-|ml-|mr-|mt-|mb-)/;

export default function SearchSelect({
  value,
  onChange,
  children,
  className = "",
  disabled = false,
  multiple = false,
  name,
  autoFocus = false,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  title,
}) {
  const options = useMemo(() => collectOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const selected = multiple
    ? (Array.isArray(value) ? value : []).map(String)
    : [String(value ?? "")];

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q ? options.filter((o) => norm(o.label).includes(q)) : options;
  }, [options, query]);

  const visible = filtered.slice(0, MAX_RENDER);

  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const height = 290;
    const openUp = below < height && r.top > below;
    setPos({
      left: r.left,
      width: Math.max(r.width, 220),
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
    });
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    place();
    setQuery("");
    const idx = options.findIndex((o) => selected.includes(o.value));
    setActive(Math.max(0, idx));
    setOpen(true);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onScroll(e) {
      if (panelRef.current?.contains(e.target)) return;
      place();
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function emit(next) {
    onChange?.({ target: { value: next, name }, currentTarget: { value: next, name } });
  }

  function choose(opt) {
    if (opt.disabled) return;
    if (multiple) {
      const cur = selected.filter((v) => v !== "");
      emit(cur.includes(opt.value) ? cur.filter((v) => v !== opt.value) : [...cur, opt.value]);
    } else {
      emit(opt.value);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, visible.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (visible[active]) choose(visible[active]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
  }

  function onTriggerKey(e) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); toggleOpen(); }
  }

  // Libellé affiché
  let display;
  if (multiple) {
    const labels = options.filter((o) => selected.includes(o.value) && o.value !== "").map((o) => o.label);
    display = labels.length === 0 ? null : labels.length <= 2 ? labels.join(", ") : `${labels.length} sélectionnés`;
  } else {
    const cur = options.find((o) => o.value === selected[0]);
    display = cur ? cur.label : null;
  }
  const isEmpty = display === null || (!multiple && selected[0] === "");

  const tokens = String(className).split(/\s+/).filter(Boolean);
  const wrapperCls = tokens.filter((t) => WRAPPER_RE.test(t)).join(" ");
  const triggerCls = tokens.filter((t) => !WRAPPER_RE.test(t)).join(" ");
  const hasWidth = /(^|\s)w-/.test(wrapperCls);

  return (
    <div className={`relative inline-block align-middle ${hasWidth ? "" : "min-w-[140px]"} ${wrapperCls}`}>
      <button
        type="button"
        ref={triggerRef}
        title={title}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        onKeyDown={onTriggerKey}
        className={`${triggerCls} w-full flex items-center justify-between gap-2 text-left bg-white disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${isEmpty && !display ? "text-gray-400" : ""}`}>
          {display ?? placeholder}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, zIndex: 10000 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="relative border-b border-gray-100">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-2 text-sm outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {visible.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">Aucun résultat</li>}
            {visible.map((o, i) => {
              const isSel = selected.includes(o.value) && (multiple ? o.value !== "" : true);
              return (
                <li
                  key={o.value + "|" + i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                    o.disabled ? "text-gray-300 cursor-not-allowed" : i === active ? "bg-[#E8F5EE]" : ""
                  } ${isSel ? "font-medium text-[#065A2C]" : "text-gray-700"}`}
                >
                  {multiple && (
                    <span className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${isSel ? "bg-[#087F3E] border-[#087F3E]" : "border-gray-300"}`}>
                      {isSel && <Check size={11} className="text-white" />}
                    </span>
                  )}
                  <span className="flex-1 truncate">{o.label || "—"}</span>
                  {!multiple && isSel && <Check size={14} className="flex-shrink-0 text-[#087F3E]" />}
                </li>
              );
            })}
            {filtered.length > MAX_RENDER && (
              <li className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
                {filtered.length - MAX_RENDER} autres résultats — affinez la recherche
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
