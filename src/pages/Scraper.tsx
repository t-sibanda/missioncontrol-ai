import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Globe, Play, Loader2, CheckCircle, AlertCircle, Clock, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GH = ["openai","anthropic","nebius","coreweave","crusoe","scaleai","runwayml","anyscale","cohere","xai","mistral","huggingface"];
const LV = ["google","stripe","notion","figma"];

export default function Scraper() {
  const [source, setSource] = useState<"greenhouse" | "lever" | "indeed">("greenhouse");
  const [company, setCompany] = useState("");
  const [query, setQuery] = useState("");
  const [loc, setLoc] = useState("");
  const utils = trpc.useUtils();
  const { data: logs } = trpc.scraping.logs.useQuery({ limit: 15 });
  const { data: stats } = trpc.scraping.stats.useQuery();

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

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="animate-fade-in">
        <h1 className="page-title">Job Scraper</h1>
        <p className="page-subtitle">Scrape jobs from free APIs — no rate limits</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-1">
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#9a3412" }}>{stats.totalRuns}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "#92400e", opacity: 0.7 }}>Total Runs</p>
          </div>
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #d1fae5, #ecfdf5)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#065f46" }}>{stats.totalJobsFound}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "#047857", opacity: 0.7 }}>Jobs Found</p>
          </div>
          <div className="card p-4 text-center" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <p className="text-[24px] font-extrabold" style={{ color: "#92400e" }}>{logs?.filter(l => (l.jobsAdded ?? 0) > 0).length ?? 0}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "#b45309", opacity: 0.7 }}>Successful</p>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in stagger-3">
        <div className="card p-5">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Zap className="w-4 h-4" style={{ color: "#047857" }} /> Bulk: Greenhouse
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GH.map(c => (
              <button key={c} onClick={() => run.mutate({ source: "greenhouse", company: c })} disabled={run.isPending} className="text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold capitalize transition-all hover:shadow-sm hover:border-[#FF6B3530]" style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{c}</button>
            ))}
          </div>
          <Button size="sm" className="text-[11px] rounded-lg h-8 font-bold" style={{ background: "#d1fae5", color: "#047857" }} onClick={() => bulk.mutate({ targets: GH.map(c => ({ company: c, source: "greenhouse" as const })) })} disabled={bulk.isPending}>
            {bulk.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}Scrape All Greenhouse
          </Button>
        </div>
        <div className="card p-5">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <Zap className="w-4 h-4" style={{ color: "#2563eb" }} /> Bulk: Lever
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {LV.map(c => (
              <button key={c} onClick={() => run.mutate({ source: "lever", company: c })} disabled={run.isPending} className="text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold capitalize transition-all hover:shadow-sm hover:border-[#FF6B3530]" style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{c}</button>
            ))}
          </div>
          <Button size="sm" className="text-[11px] rounded-lg h-8 font-bold" style={{ background: "#dbeafe", color: "#1d4ed8" }} onClick={() => bulk.mutate({ targets: LV.map(c => ({ company: c, source: "lever" as const })) })} disabled={bulk.isPending}>
            {bulk.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}Scrape All Lever
          </Button>
        </div>
      </div>

      <div className="card p-5 animate-fade-in stagger-4">
        <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
          <Clock className="w-4 h-4" style={{ color: "var(--muted)" }} /> Recent Runs
        </h3>
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
