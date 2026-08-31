import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useUser } from "../context/UserContext";

const ROLE_COLORS = {
  ASSISTANTE_DEX: "bg-teal-100 text-teal-700",
  DACC:       "bg-emerald-100 text-emerald-700",
  DEX:       "bg-blue-100 text-blue-700",
  DEXA:      "bg-violet-100 text-violet-700",
  DCG:       "bg-orange-100 text-orange-700",
  DGA:       "bg-rose-100 text-rose-700",
  DG:        "bg-gray-200 text-gray-700",
  CT:        "bg-amber-100 text-amber-700",
  DT:        "bg-cyan-100 text-cyan-700",
  TRESORERIE:"bg-pink-100 text-pink-700",
  DFC:       "bg-indigo-100 text-indigo-700",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { utilisateurs, login } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const user = utilisateurs.find(u => u.email.toLowerCase() === form.email.toLowerCase().trim());
    if (!user) { setError("Aucun compte associé à cet email."); return; }
    if (!form.password) { setError("Veuillez saisir un mot de passe."); return; }
    login(user.id);
    navigate("/dashboard", { replace: true });
  }

  function handleQuickLogin(userId) {
    login(userId);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left column — brand */}
      <div className="hidden lg:flex w-[42%] bg-white flex-col items-center justify-between px-12 py-10 border-r border-gray-100">
        <div />
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <img src={import.meta.env.BASE_URL + "logo-stt.svg"} alt="Logo STT" className="w-56 object-contain" />
          <div className="text-center">
            <p className="text-gray-500 text-sm leading-relaxed mt-1">
              Module de gestion de la sous-traitance chantier
            </p>
          </div>
          <div className="w-full border-t border-gray-100 pt-5 flex flex-col gap-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center font-medium">Accès rapide — mode démonstration</p>
            <div className="grid grid-cols-2 gap-2">
              {utilisateurs.slice(0, 6).map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-[#087F3E] hover:bg-[#f0faf4] transition-all text-left group"
                >
                  <span className="w-7 h-7 rounded-full bg-[#087F3E] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {u.initiales}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate leading-none">{u.prenom}</p>
                    <span className={`text-[10px] font-medium px-1 py-0.5 rounded mt-0.5 inline-block ${ROLE_COLORS[u.roleId] || "bg-gray-100 text-gray-600"}`}>
                      {u.roleId}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Développé par <span className="font-semibold text-gray-500">HTSOFT</span>
        </p>
      </div>

      {/* Right column — form */}
      <div className="flex-1 bg-[#E8F5EE] flex items-center justify-center px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <img src={import.meta.env.BASE_URL + "logo-stt.svg"} alt="Logo STT" className="h-14 object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Connexion</h2>
            <p className="text-sm text-gray-500 mt-1">Accédez à votre espace de gestion</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="nom@cse-sn.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-11 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#087F3E] text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-[#065A2C] transition-colors mt-2"
            >
              Se connecter
            </button>

            <p className="text-center text-xs text-gray-400 pt-1">
              Mode démo : utilisez un email de la liste ci-contre, n'importe quel mot de passe.
            </p>
          </form>

          {/* Mobile quick access */}
          <div className="mt-6 lg:hidden border-t border-gray-100 pt-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center font-medium mb-3">Accès rapide</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {utilisateurs.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-[#087F3E] hover:bg-[#f0faf4] transition-all text-xs font-medium text-gray-700"
                >
                  <span className="w-5 h-5 rounded-full bg-[#087F3E] text-white text-[9px] font-bold flex items-center justify-center">{u.initiales}</span>
                  {u.roleId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
