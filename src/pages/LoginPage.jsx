import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useUser } from "../context/UserContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-line-200 bg-white shadow-sm">
        <div className="flex flex-col justify-center px-8 py-10 sm:px-10">
          {/* Logo */}
          <div className="mb-6 flex items-center justify-center">
            <img
              src={import.meta.env.BASE_URL + "logo-stt.svg"}
              alt="Logo STT"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-center text-[20px] font-semibold text-ink-900">Connexion</h1>
          <p className="mt-1 text-center text-[13px] text-ink-500">
            Plateforme Sous-Traitance Chantier · CSE
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">Login ou Email</Label>
              <Input
                id="login"
                type="text"
                autoComplete="username"
                placeholder="votre login ou email"
                value={form.login}
                onChange={e => setForm({ ...form, login: e.target.value })}
                disabled={loginLoading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  disabled={loginLoading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 rounded-md border border-ink-900/15 bg-surface-50 px-3 py-2 text-[12.5px] text-ink-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loginLoading || !form.login || !form.password}
            >
              {loginLoading ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {loginLoading ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-ink-400">
            Développé par <span className="font-semibold text-ink-500">HTSOFT</span>
          </p>
        </div>
      </div>
    </div>
  );
}
