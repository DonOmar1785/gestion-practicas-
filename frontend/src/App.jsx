import { Route, Routes } from "react-router-dom";
import AuthProvider from "./context/AuthProvider.jsx";
import RealtimeProvider from "./context/RealtimeProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { PAGES } from "./config/pages.js";
import HomeRedirect from "./pages/HomeRedirect.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import ResourcePage from "./pages/ResourcePage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          {Object.entries(PAGES).map(([key, page]) => (
            <Route
              key={key}
              path={`/${key}`}
              element={
                <ProtectedRoute roles={page.roles}>
                  {/* key fuerza un componente nuevo al cambiar de pantalla */}
                  <ResourcePage key={key} pageKey={key} />
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RealtimeProvider>
    </AuthProvider>
  );
}
