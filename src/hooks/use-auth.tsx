import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "staff" | "cliente";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id);
          setRoles((data ?? []).map((r) => r.role as Role));
        }, 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
        setRoles((data ?? []).map((r) => r.role as Role));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("staff"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};
