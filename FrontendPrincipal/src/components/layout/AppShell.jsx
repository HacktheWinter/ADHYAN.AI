import { Outlet, useNavigate } from "react-router-dom";
import { logoutPrincipal } from "../../api/principalApi";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { clearAuth } from "../../utils/authStorage";

export default function AppShell() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutPrincipal();
    } catch (error) {
      console.error("Principal logout failed:", error);
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 px-4 py-4 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar onLogout={handleLogout} />
        <main className="space-y-4">
          <Topbar />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
