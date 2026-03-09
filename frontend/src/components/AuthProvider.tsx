import { useState, useEffect, ReactNode, useCallback } from "react";
import { api } from "../api/client";
import { AuthContext, type User } from "../hooks/useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Session prüfen beim App-Start
  useEffect(() => {
    api("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (benutzername: string, passwort: string) => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ benutzername, passwort }),
    });
    setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const hatRecht = useCallback(
    (modul: string, aktion: string) => {
      if (!user) return false;
      return user.rechte.includes(`${modul}.${aktion}`);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, hatRecht, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
