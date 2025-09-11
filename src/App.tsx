// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";

// (Opcional) Ruta de unión/lector QR
function JoinPage() {
  return (
    <div
      className="min-h-screen grid place-items-center text-white"
      style={{ background: "#0f0f11" }}
    >
      <div>
        <h1 className="text-3xl font-bold mb-2">Unirse a un evento</h1>
        <p className="text-white/80">Aquí irá tu lector QR / unión por enlace.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/join" element={<JoinPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
