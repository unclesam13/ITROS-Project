import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UserProfile } from "../api/client";

type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.storage.getAccess()) {
      setLoading(false);
      return;
    }
    api.me().then(setUser).catch(() => api.storage.clear()).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await api.login(email, password);
    api.storage.setTokens(tokens);
    setUser(await api.me());
  };

  const logout = () => {
    api.storage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
