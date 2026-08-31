import { createContext, useContext, useState, useCallback } from "react";
import { utilisateurs } from "../data/utilisateurs";
import { roles } from "../data/roles";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = useCallback((userId) => {
    const user = utilisateurs.find(u => u.id === userId);
    if (user) { setCurrentUserState(user); setIsLoggedIn(true); }
  }, []);

  const logout = useCallback(() => {
    setCurrentUserState(null);
    setIsLoggedIn(false);
  }, []);

  const setCurrentUser = useCallback((userId) => {
    const user = utilisateurs.find(u => u.id === userId);
    if (user) setCurrentUserState(user);
  }, []);

  const hasRole = useCallback((roleId) => currentUser?.roleId === roleId, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, isLoggedIn, login, logout, setCurrentUser, hasRole, utilisateurs, roles }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
