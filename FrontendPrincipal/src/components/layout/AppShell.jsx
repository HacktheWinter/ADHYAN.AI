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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#f4f8fc_0%,#e9f1f9_100%)] px-4 py-4 sm:px-6">
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
