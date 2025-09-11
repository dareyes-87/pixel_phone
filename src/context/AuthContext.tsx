// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../libs/supabaseClient";


interface AuthCtx {
user: User | null;
session: Session | null;
loading: boolean;
}


const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true });


export function AuthProvider({ children }: { children: React.ReactNode }) {
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [loading, setLoading] = useState(true);


useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setUser(data.session?.user ?? null);
setLoading(false);
});


const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
setSession(newSession);
setUser(newSession?.user ?? null);
setLoading(false);
});


return () => listener.subscription.unsubscribe();
}, []);


return (
<AuthContext.Provider value={{ user, session, loading }}>
{children}
</AuthContext.Provider>
);
}


export const useAuth = () => useContext(AuthContext);