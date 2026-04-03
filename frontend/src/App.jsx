import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/auth/AuthPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: meta.name || session.user.email.split("@")[0],
          role: meta.role || "volunteer",
          ...meta,
        });
      }
      setChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: meta.name || session.user.email.split("@")[0],
          role: meta.role || "volunteer",
          ...meta,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = (userData) => setUser(userData);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!checked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 32, height: 32,
          border: "2px solid #1a1a1a",
          borderTopColor: "#fff",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <AuthPage onAuthSuccess={handleAuthSuccess} />;
}
