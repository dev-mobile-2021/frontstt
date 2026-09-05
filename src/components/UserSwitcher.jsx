import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

export default function UserSwitcher() {
  const { currentUser, logout } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initiales = currentUser?.login
    ? currentUser.login.slice(0, 2).toUpperCase()
    : "?";

  const role = currentUser?.role?.designation ?? currentUser?.role?.libelle ?? "—";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-white border border-gray-200 hover:border-[#087F3E] hover:bg-[#F0FAF4] transition-colors text-sm"
      >
        <span className="w-7 h-7 rounded-full bg-[#087F3E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {initiales}
        </span>
        <div className="text-left hidden sm:block">
          <div className="text-gray-900 font-medium leading-tight text-xs">
            {currentUser?.nom ?? currentUser?.login ?? "Utilisateur"}
          </div>
          <div className="text-[#087F3E] text-[10px] font-semibold">{role}</div>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#087F3E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {initiales}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {currentUser?.nom ?? currentUser?.login}
                </p>
                <p className="text-xs text-gray-400">{currentUser?.email}</p>
                <p className="text-[10px] text-[#087F3E] font-semibold mt-0.5">{role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
