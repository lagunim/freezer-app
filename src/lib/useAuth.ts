import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { sileo } from "sileo";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
};

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setAuth({
        loading: false,
        session: currentSession,
        user: currentSession?.user ?? null,
      });
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuth((prev) => ({
        ...prev,
        session: newSession,
        user: newSession?.user ?? null,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      const msg = "No se ha podido cerrar sesión. Inténtalo de nuevo.";
      sileo.error({ title: "Cerrar sesión", description: msg });
    }
  }, []);

  return { auth, handleLogout };
}
