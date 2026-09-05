import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authService } from "../services/authService";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => authService.getStoredUser());
  const [isLoggedIn, setIsLoggedIn]   = useState(() => authService.isAuthenticated());
  const [loginError, setLoginError]   = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Sync si le token est supprimé dans un autre onglet
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "stt_token" && !e.newValue) {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(async (loginOrEmail, password) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const { utilisateur } = await authService.login(loginOrEmail, password);
      setCurrentUser(utilisateur);
      setIsLoggedIn(true);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || "Identifiants incorrects";
      setLoginError(msg);
      return { success: false, error: msg };
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsLoggedIn(false);
  }, []);

  const hasRole = useCallback(
    (designation) => currentUser?.role?.designation === designation,
    [currentUser]
  );

  return (
    <UserContext.Provider value={{
      currentUser,
      isLoggedIn,
      login,
      logout,
      hasRole,
      loginError,
      loginLoading,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
