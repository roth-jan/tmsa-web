import { createContext, useContext } from "react";

export interface User {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  niederlassung: string | null;
  rechte: string[];
}

export interface AuthContextType {
  user: User | null;
  login: (benutzername: string, passwort: string) => Promise<void>;
  logout: () => Promise<void>;
  hatRecht: (modul: string, aktion: string) => boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}
