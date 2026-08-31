import { useState, useRef, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { useUser } from "../context/UserContext";

const NIVEAU_LABELS = {
  terrain: "Terrain",
  administratif: "Administratif",
  paiement: "Paiement",
};

export default function UserSwitcher() {
  const { currentUser, setCurrentUser, utilisateurs, roles } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getRoleLibelle = (roleId) => roles.find(r => r.id === roleId)?.libelle ?? roleId;

  const groupedByNiveau = ["terrain", "administratif", "paiement"].map(niveau => ({
    niveau,
    label: NIVEAU_LABELS[niveau],
    users: utilisateurs.filter(u => roles.find(r => r.id === u.roleId)?.niveau === niveau),
  })).filter(g => g.users.length > 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-white border border-gray-200 hover:border-[#087F3E] hover:bg-[#F0FAF4] transition-colors text-sm"
      >
        <span className="w-7 h-7 rounded-full bg-[#087F3E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {currentUser?.initiales}
        </span>
        <div className="text-left hidden sm:block">
          <div className="text-gray-900 font-medium leading-tight text-xs">{currentUser?.nom}</div>
          <div className="text-[#087F3E] text-[10px] font-semibold">{currentUser?.roleId}</div>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <User size={11} />
            Changer de profil
          </div>
          {groupedByNiveau.map(({ niveau, label, users }) => (
            <div key={niveau}>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                {label}
              </div>
              {users.map(u => {
                const isActive = u.id === currentUser?.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => { setCurrentUser(u.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-[#F0FAF4] text-[#087F3E]"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      isActive ? "bg-[#087F3E] text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.initiales}
                    </span>
                    <div>
                      <div className="text-xs font-medium leading-tight">{u.nom}</div>
                      <div className={`text-[10px] ${isActive ? "text-[#065A2C]" : "text-gray-400"}`}>
                        {getRoleLibelle(u.roleId)}
                      </div>
                    </div>
                    {isActive && (
                      <span className="ml-auto text-[#087F3E] text-xs">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
