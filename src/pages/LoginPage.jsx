import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { useUser } from "../context/UserContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginError, loginLoading } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ login: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.login.trim() || !form.password) return;
    const res = await login(form.login.trim(), form.password);
    if (res.success) navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Colonne gauche — brand */}
      <div className="hidden lg:flex w-[42%] bg-white flex-col items-center justify-between px-12 py-10 border-r border-gray-100">
        <div />
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <img
            src={import.meta.env.BASE_URL + "logo-stt.svg"}
            alt="Logo STT"
            className="w-56 object-contain"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">CSE — Sous-Traitance</h1>
            <p className="text-gray-500 text-sm leading-relaxed mt-1">
              Module de gestion de la sous-traitance chantier
            </p>
          </div>

          <div className="w-full border-t border-gray-100 pt-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center font-medium mb-3">
              Compagnie Sahélienne d'Entreprises
            </p>
            <div className="bg-[#f0faf4] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">
                Connectez-vous avec vos identifiants<br />
                fournis par l'administrateur CSE.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Développé par <span className="font-semibold text-gray-500">HTSOFT</span>
        </p>
      </div>

      {/* Colonne droite — formulaire */}
      <div className="flex-1 bg-[#E8F5EE] flex items-center justify-center px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex justify-center mb-6 lg:hidden">
            <img
              src={import.meta.env.BASE_URL + "logo-stt.svg"}
              alt="Logo STT"
              className="h-14 object-contain"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Connexion</h2>
            <p className="text-sm text-gray-500 mt-1">Accédez à votre espace de gestion</p>
          </div>

          {loginError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">
                Login ou Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="votre login ou email"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  autoComplete="username"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all"
                  disabled={loginLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-11 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all"
                  disabled={loginLoading}
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
              disabled={loginLoading || !form.login || !form.password}
              className="w-full bg-[#087F3E] text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-[#065A2C] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
