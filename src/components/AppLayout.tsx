import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "sonner";
import {
  LayoutDashboard, Briefcase, Building2, FileText,
  Send, Bot, Globe, Settings, Menu, X, LogOut, User,
  Bell, Sparkles,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/jobs", label: "Jobs", icon: Briefcase },
  { path: "/companies", label: "Companies", icon: Building2 },
  { path: "/resume", label: "Resume", icon: FileText },
  { path: "/applications", label: "Applications", icon: Send },
  { path: "/optimizer", label: "AI Optimizer", icon: Bot },
  { path: "/scraper", label: "Scraper", icon: Globe },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--cream)" }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: "#fff", border: "1px solid #e2e8f0", color: "#0f1629", borderRadius: "12px", boxShadow: "0 10px 30px rgba(15,22,41,0.12)" },
      }} />

      {sidebarOpen && mobile && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] flex flex-col transition-transform duration-200 ease-out
        ${sidebarOpen || !mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--navy)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--coral), var(--gold))" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[15px] text-white tracking-tight">MissionControl</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.35)" }}>AI Job Hunt</p>
          </div>
          {mobile && <button onClick={() => setSidebarOpen(false)} className="p-1" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-5 h-5" /></button>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${active ? "text-white" : "text-white/40 hover:text-white/70"}`}
                style={{ background: active ? "var(--coral)" : "transparent", boxShadow: active ? "0 2px 8px rgba(255,107,53,0.3)" : "none" }}>
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/8">
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--coral), var(--gold))" }}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{user.name || "User"}</p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user.email || ""}</p>
                </div>
              </div>
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-[12px] w-full rounded-lg transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.35)" }}>
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg" style={{ color: "var(--coral)" }}>
              <User className="w-4 h-4" /> Sign In to Access
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 lg:px-6 shrink-0 border-b" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
          <button className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)} style={{ color: "var(--slate)" }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-xl hover:bg-slate-50 transition-all" style={{ color: "var(--muted)" }}>
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--coral)" }} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
