import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Globe, Play, Loader2, CheckCircle, AlertCircle, Clock, Zap,
  TrendingUp, Trash2, Download, Plus, X, RefreshCw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_GH = ["openai", "anthropic", "nebius", "coreweave", "crusoe", "scaleai", "runwayml", "anyscale", "cohere", "xai", "mistral", "huggingface"];
const DEFAULT_LV = ["google", "stripe", "notion", "figma"];

export default function Scraper() {
  const [source, setSource] = useState<"greenhouse" | "lever" | "indeed">("greenhouse");
  const [company, setCompany] = useState("");
  const [query, setQuery] = useState("");
  const [loc, setLoc] = useState("");
  const [ghList, setGhList] = useState<string[]>(DEFAULT_GH);
  const [lvList, setLvList] = useState<string[]>(DEFAULT_LV);
  const [newGh, setNewGh] = useState("");
  const [newLv, setNewLv] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const utils = trpc.useUtils();
  const { data: logs, refetch: refetchLogs } = trpc.scraping.logs.useQuery({ limit: 15 });
  const { data: stats } = trpc.scraping.stats.useQuery();
  const { data: allJobs } = trpc.jobs.list.useQuery({ limit: 200 });
  const clearAllJobs = trpc.jobs.clearAll.useMutation({
    onSuccess: () => { utils.jobs.list.invalidate(); utils.jobs.stats.invalidate(); toast.success("All scraped jobs cleared"); setIsClearing(false); },
    onError: (err) => { toast.error(err.message); setIsClearing(false); },
  });

  const run = trpc.scraping.run.useMutation({
    onSuccess: (d) => {
      utils.scraping.logs.invalidate();
      utils.scraping.stats.invalidate();
      utils.jobs.list.invalidate();
      if (d.success) toast.success(`Found ${d.jobsFound} jobs, added ${d.jobsAdded} new`);
      else toast.error(d.error || "Failed");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulk = trpc.scraping.bulkScrape.useMutation({
    onSuccess: (d) => {
      utils.scraping.logs.invalidate();
      utils.scraping.stats.invalidate();
      utils.jobs.list.invalidate();
      toast.success(`Complete: ${d.results.reduce((s, r) => s + (r.jobsAdded ?? 0), 0)} new jobs`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRun = () => {
    if ((source === "greenhouse" || source === "lever") && !company) { toast.error("Enter company slug"); return; }
    if (source === "indeed" && !query) { toast.error("Enter search query"); return; }
    run.mutate({ source, company: company || undefined, query: query || undefined, location: loc || undefined });
  };

  const handleExport = () => {
    if (!allJobs || allJobs.length === 0) { toast.error("No jobs to export"); return; }
    const csv = [
      ["ID", "Title", "Company", "Location", "Status", "Source", "URL", "Date Discovered"].join(","),
      ...allJobs.map(j => [j.id, `"${j.title}"`, j.companyId || "", `"${j.location || ""}"`, j.status, j.sourceType, j.sourceUrl, j.dateDiscovered].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraped-jobs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allJobs.length} jobs as CSV`);
  };

  const handleClear = () => {
    if (!confirm("This will permanently delete ALL scraped jobs. Download a backup first if needed. Continue?")) return;
    setIsClearing(true);
    clearAllJobs.mutate({});
  };

  const addToList = (list: string[], setList: (l: string[]) => void, value: string, setVal: (v: string) => void) => {
    const slug = value.trim().toLowerCase().replace(/\s+/g, "");
    if (!slug) return;
    if (list.includes(slug)) { toast.error("Already in list"); return; }
    setList([...list, slug]);
    setVal("");
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Job Scraper</h1>
          <p className="page-subtitle">Scrape jobs from free APIs — {allJobs?.length ?? 0} jobs in database</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="h-9 px-3 flex items-center gap-1.5 text-[12px] rounded-lg font-semibold border transition-all hover:shadow-sm" style={{ borderColor: "#04785730", color: "#047857" }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={handleClear} disabled={isClearing} className="h-9 px-3 flex items-center gap-1.5 text-[12px] rounded-lg font-semibold border transition-all hover:shadow-sm hover:bg-red-50" style={{ borderColor: "#dc262630", color: "#dc2626" }}>
            {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Clear All
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3 animate-fade-in stagger-1">
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#9a3412" }}>{stats.totalRuns}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#92400e", opacity: 0.7 }}>Runs</p>
          </div>
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #d1fae5, #ecfdf5)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#065f46" }}>{stats.totalJobsFound}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#047857", opacity: 0.7 }}>Found</p>
          </div>
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#1e40af" }}>{allJobs?.length ?? 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#2563eb", opacity: 0.7 }}>In DB</p>
          </div>
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#92400e" }}>{logs?.filter(l => (l.jobsAdded ?? 0) > 0).length ?? 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#b45309", opacity: 0.7 }}>Success</p>
          </div>
        </div>
      )}

      {/* Manual Scrape */}
      <div className="card p-6 animate-fade-in stagger-2">
        <h3 className="text-[14px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--navy)" }}>
          <Globe className="w-4 h-4" style={{ color: "#FF6B35" }} /> Manual Scrape
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={source} onValueChange={(v: "greenhouse" | "lever" | "indeed") => setSource(v)}>
              <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="indeed">Indeed RSS</SelectItem>
              </SelectContent>
            </Select>
            {(source === "greenhouse" || source === "lever") && (
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company slug (e.g. openai)" className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
            )}
            {source === "indeed" && (
              <>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search query" className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location" className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
              </>
            )}
          </div>
          <button onClick={handleRun} disabled={run.isPending} className="btn-primary" style={{ height: "44px" }}>
            {run.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scraping...</> : <><Play className="w-4 h-4 mr-2" />Run Scraper</>}
          </button>
          {run.data && (
            <div className={`p-3 rounded-xl border text-[12px] font-medium ${run.data.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              <div className="flex items-center gap-2">{run.data.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{run.data.success ? "Success" : "Failed"}</div>
              <p className="mt-1 opacity-80">Found {run.data.jobsFound} jobs · Added {run.data.jobsAdded} new · {run.data.duration}ms</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Scrape with Editable Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in stagger-3">
        <div className="card p-5">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Zap className="w-4 h-4" style={{ color: "#047857" }} /> Greenhouse Companies
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ghList.map(c => (
              <span key={c} className="text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold capitalize inline-flex items-center gap-1" style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>
                {c}
                <button onClick={() => setGhList(ghList.filter(x => x !== c))} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <Input value={newGh} onChange={(e) => setNewGh(e.target.value)} placeholder="Add company slug..." className="h-8 rounded-lg border text-[12px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}
              onKeyDown={(e) => { if (e.key === "Enter") addToList(ghList, setGhList, newGh, setNewGh); }} />
            <Button size="sm" className="h-8 px-3 rounded-lg text-[11px]" style={{ background: "#d1fae5", color: "#047857" }} onClick={() => addToList(ghList, setGhList, newGh, setNewGh)}><Plus className="w-3 h-3" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-[11px] rounded-lg h-8 font-bold flex-1" style={{ background: "#d1fae5", color: "#047857" }} onClick={() => bulk.mutate({ targets: ghList.map(c => ({ company: c, source: "greenhouse" as const })) })} disabled={bulk.isPending || ghList.length === 0}>
              {bulk.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}Scrape All ({ghList.length})
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" style={{ color: "var(--muted)" }} onClick={() => setGhList(DEFAULT_GH)}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Zap className="w-4 h-4" style={{ color: "#2563eb" }} /> Lever Companies
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lvList.map(c => (
              <span key={c} className="text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold capitalize inline-flex items-center gap-1" style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>
                {c}
                <button onClick={() => setLvList(lvList.filter(x => x !== c))} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <Input value={newLv} onChange={(e) => setNewLv(e.target.value)} placeholder="Add company slug..." className="h-8 rounded-lg border text-[12px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}
              onKeyDown={(e) => { if (e.key === "Enter") addToList(lvList, setLvList, newLv, setNewLv); }} />
            <Button size="sm" className="h-8 px-3 rounded-lg text-[11px]" style={{ background: "#dbeafe", color: "#1d4ed8" }} onClick={() => addToList(lvList, setLvList, newLv, setNewLv)}><Plus className="w-3 h-3" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-[11px] rounded-lg h-8 font-bold flex-1" style={{ background: "#dbeafe", color: "#1d4ed8" }} onClick={() => bulk.mutate({ targets: lvList.map(c => ({ company: c, source: "lever" as const })) })} disabled={bulk.isPending || lvList.length === 0}>
              {bulk.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}Scrape All ({lvList.length})
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" style={{ color: "var(--muted)" }} onClick={() => setLvList(DEFAULT_LV)}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="card p-5 animate-fade-in stagger-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Clock className="w-4 h-4" style={{ color: "var(--muted)" }} /> Recent Runs
          </h3>
          <button onClick={() => refetchLogs()} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--muted)" }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {logs && logs.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf8f5] transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: (log.jobsAdded ?? 0) > 0 ? "#10b981" : "#FF6B35" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold capitalize" style={{ color: "var(--navy)" }}>{log.sourceType}</span>
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Found {log.jobsFound} · Added {log.jobsAdded}</span>
                  </div>
                  {log.errors && <p className="text-[10px] text-red-500 truncate">{log.errors}</p>}
                </div>
                <span className="text-[10px] shrink-0 font-medium" style={{ color: "var(--muted)" }}>{log.durationMs}ms</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
              <TrendingUp className="w-6 h-6" style={{ color: "#b45309" }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>No scraping runs yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
