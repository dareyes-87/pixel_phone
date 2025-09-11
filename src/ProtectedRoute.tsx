// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { JSX } from "react";


export default function ProtectedRoute({ children }: { children: JSX.Element }) {
const { user, loading } = useAuth();


if (loading) {
return (
<div className="min-h-screen grid place-items-center text-center p-6">
<p className="text-white/90">Cargando sesión…</p>
</div>
);
}


if (!user) {
return <Navigate to="/" replace />;
}


return children;
}