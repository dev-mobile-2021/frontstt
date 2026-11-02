import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useUser } from "../context/UserContext";

const SIDEBAR_W = 260;
const SIDEBAR_COLLAPSED_W = 64;

export default function MainLayout() {
  const { isLoggedIn } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, always visible fixed on desktop */}
      <div
        className={`fixed top-0 left-0 h-full z-30 transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      </div>

      {/* Mobile-only top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 flex items-center h-16 bg-white border-b border-gray-200 px-4">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop header (hidden on mobile, shown on lg+) */}
      <Header sidebarWidth={sidebarWidth} />

      {/* Main content — no left margin on mobile, sidebarWidth margin on desktop */}
      <main
        className="pt-16 transition-all duration-300"
        style={{ "--sidebar-w": `${sidebarWidth}px` }}
      >
        <div className="p-4 lg:p-8 lg:[margin-left:var(--sidebar-w)] transition-all duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
