import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("relieflink_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("relieflink_user");
  };

  const getStoredUser = () => {
    const stored = localStorage.getItem("relieflink_user");
    if (stored && !user) setUser(JSON.parse(stored));
    return stored ? JSON.parse(stored) : null;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getStoredUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
