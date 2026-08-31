import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useUser } from "../context/UserContext";

const SIDEBAR_W = 260;
const SIDEBAR_COLLAPSED_W = 64;

export default function MainLayout() {
  const { isLoggedIn } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <Header sidebarWidth={sidebarWidth} />
      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
