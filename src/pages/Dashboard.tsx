import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { Briefcase, Building2, Send, Target, Globe, ArrowRight, Zap, Shield, Activity, Clock, TrendingUp, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#FF6B35", "#FFB800", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

function StatCard({ title, value, icon: Icon, gradient, iconColor, link, delay }: { title: string; value: string | number; icon: React.ElementType; gradient: string; iconColor: string; link: string; delay: number }) {
  return (
    <Link to={link} className={`card card-hover p-5 block animate-fade-in stagger-${delay}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--muted)" }}>{title}</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--navy)" }}>{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: gradient }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
        <span>View details</span><ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

function SkeletonCard() { return <div className="card p-5 h-[120px] skeleton" />; }

export default function Dashboard() {
  const { data: jobStats, isLoading: jobsLoading } = trpc.jobs.stats.useQuery();
  const { data: appStats, isLoading: appsLoading } = trpc.applications.stats.useQuery(undefined, { retry: false });
  const { data: recentJobs } = trpc.jobs.recent.useQuery({ limit: 6 });
  const { data: companyStats } = trpc.companies.stats.useQuery();

  const isLoading = jobsLoading || appsLoading;
  const statusData = jobStats?.byStatus.map((s) => ({ name: s.status, count: s.count })) || [];
  const appStatusData = appStats?.byStatus.map((s) => ({ name: s.status, count: s.count })) || [];
  const totalJobs = jobStats?.total ?? 0;
  const totalApps = appStats?.total ?? 0;
  const totalCompanies = companyStats?.total ?? 0;
  const matchRate = totalJobs > 0 ? Math.round(((jobStats?.byStatus.find(s => s.status === "matched")?.count ?? 0) / totalJobs) * 100) : 0;

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your job hunt command center — stay on top of every opportunity</p>
        </div>
        <Link to="/scraper" className="btn-primary">
          <Globe className="w-4 h-4" /> Run Scraper
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Jobs" value={totalJobs} icon={Briefcase} gradient="linear-gradient(135deg, #ffedd5, #fef3c7)" iconColor="#FF6B35" link="/jobs" delay={1} />
          <StatCard title="Applications" value={totalApps} icon={Send} gradient="linear-gradient(135deg, #dbeafe, #e0e7ff)" iconColor="#2563eb" link="/applications" delay={2} />
          <StatCard title="Companies" value={totalCompanies} icon={Building2} gradient="linear-gradient(135deg, #ede9fe, #f3e8ff)" iconColor="#7c3aed" link="/companies" delay={3} />
          <StatCard title="Match Rate" value={`${matchRate}%`} icon={Target} gradient="linear-gradient(135deg, #d1fae5, #ecfdf5)" iconColor="#059669" link="/optimizer" delay={4} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5 animate-fade-in stagger-2">
          <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Activity className="w-4 h-4" style={{ color: "#FF6B35" }} /> Jobs by Status
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#0f172a", fontSize: "12px" }} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="count" fill="#FF6B35" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-[13px] gap-2" style={{ color: "var(--muted)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                <TrendingUp className="w-6 h-6" style={{ color: "#b45309" }} />
              </div>
              <p className="font-medium">No job data yet</p>
              <Link to="/scraper" className="text-[11px] flex items-center gap-1 font-semibold" style={{ color: "#FF6B35" }}>Run scraper <ArrowRight className="w-3 h-3"/></Link>
            </div>
          )}
        </div>

        <div className="card p-5 animate-fade-in stagger-3">
          <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Send className="w-4 h-4" style={{ color: "#FF6B35" }} /> Application Pipeline
          </h3>
          {appStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={appStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name" stroke="none">
                  {appStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-[13px] gap-2" style={{ color: "var(--muted)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}>
                <Send className="w-6 h-6" style={{ color: "#1d4ed8" }} />
              </div>
              <p className="font-medium">No applications yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5 animate-fade-in stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <Clock className="w-4 h-4" style={{ color: "#FF6B35" }} /> Recently Discovered
            </h3>
            <Link to="/jobs" className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#FF6B35" }}>View all <ArrowRight className="w-3 h-3"/></Link>
          </div>
          <div className="space-y-1">
            {recentJobs && recentJobs.length > 0 ? recentJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#faf8f5] transition-colors cursor-pointer">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FF6B35" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{job.title}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>{job.location || "Remote"} · <span className="capitalize">{job.sourceType}</span></p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full capitalize font-bold" style={{ background: "#ffedd5", color: "#9a3412" }}>{job.status}</span>
              </div>
            )) : (
              <div className="text-center py-8 text-[13px]" style={{ color: "var(--muted)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                  <Zap className="w-6 h-6" style={{ color: "#b45309" }} />
                </div>
                <p className="font-medium">No jobs discovered yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5 animate-fade-in stagger-5">
          <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "#059669" }} /> Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              { label: "Scrape AI Companies", desc: "Bulk scrape target companies", icon: Zap, link: "/scraper", color: "#FF6B35", bg: "linear-gradient(135deg, #ffedd5, #fef3c7)" },
              { label: "Upload Resume", desc: "Create or update your profile", icon: Briefcase, link: "/resume", color: "#2563eb", bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)" },
              { label: "AI Optimize", desc: "Tailor resume for specific jobs", icon: Activity, link: "/optimizer", color: "#7c3aed", bg: "linear-gradient(135deg, #ede9fe, #f3e8ff)" },
              { label: "Set Preferences", desc: "Configure job filters and alerts", icon: Shield, link: "/settings", color: "#059669", bg: "linear-gradient(135deg, #d1fae5, #ecfdf5)" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={action.link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#faf8f5] border border-transparent hover:border-[#e2e8f0] transition-all group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.bg }}>
                    <Icon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{action.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" style={{ color: "var(--muted)" }} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
