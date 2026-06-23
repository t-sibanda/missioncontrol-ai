import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Send, Plus, Calendar, CheckCircle, Clock, Phone, Trophy, XCircle, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusCfg: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "#fef3c7", text: "#92400e", icon: Clock },
  phone_screen: { bg: "#dbeafe", text: "#1e40af", icon: Phone },
  interview: { bg: "#ede9fe", text: "#5b21b6", icon: CheckCircle },
  offer: { bg: "#d1fae5", text: "#065f46", icon: Trophy },
  rejection: { bg: "#fee2e2", text: "#991b1b", icon: XCircle },
  withdrawn: { bg: "#f1f5f9", text: "#475569", icon: XCircle },
};
const pipelineStages = ["pending", "phone_screen", "interview", "offer", "rejection", "withdrawn"] as const;

export default function Applications() {
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [method, setMethod] = useState<"manual" | "semi_auto" | "full_auto">("manual");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();
  const { data: applications, isLoading } = trpc.applications.list.useQuery(statusFilter ? { responseStatus: statusFilter } : undefined, { retry: false });
  const { data: jobs } = trpc.jobs.list.useQuery({ status: "new" });
  const createApp = trpc.applications.create.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); setIsAddOpen(false); setSelectedJobId(""); setNotes(""); toast.success("Application logged"); }, onError: (err) => toast.error(err.message) });
  const updateApp = trpc.applications.update.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); toast.success("Updated"); }, onError: (err) => toast.error(err.message) });
  const deleteApp = trpc.applications.delete.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); }, onError: (err) => toast.error(err.message) });

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Track your job application pipeline</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <Button onClick={() => setIsAddOpen(true)} className="text-white text-[13px] h-9 px-4 rounded-lg font-semibold" style={{ background: "var(--coral)" }}><Plus className="w-4 h-4 mr-1.5" /> Log Application</Button>
          <DialogContent className="max-w-md rounded-xl border-0 shadow-xl" style={{ background: "var(--white)", boxShadow: "var(--card-shadow-hover)" }}>
            <DialogHeader><DialogTitle className="text-[16px] font-bold" style={{ color: "var(--navy)" }}>Log New Application</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Job</label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue placeholder="Select a job..." /></SelectTrigger>
                  <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>{jobs?.map((job) => <SelectItem key={job.id} value={String(job.id)}>{job.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Method</label>
                <Select value={method} onValueChange={(v) => setMethod(v as "manual"|"semi_auto"|"full_auto")}>
                  <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
                    <SelectItem value="manual">Manual</SelectItem><SelectItem value="semi_auto">Semi-Auto</SelectItem><SelectItem value="full_auto">Full Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." className="w-full mt-1 px-3 py-2 rounded-lg border text-[13px] outline-none min-h-[80px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} /></div>
              <Button onClick={() => { if (!selectedJobId) { toast.error("Select a job"); return; } createApp.mutate({ jobId: Number(selectedJobId), applicationMethod: method, notes, submittedAt: new Date().toISOString() }); }} className="w-full text-white font-semibold rounded-lg h-10" style={{ background: "var(--coral)" }}>Log Application</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in stagger-1">
        {pipelineStages.map((status) => { const cfg = statusCfg[status]; const Icon = cfg.icon; const count = applications?.filter((a) => a.responseStatus === status).length ?? 0;
          return (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? "" : status)} className="p-3 rounded-xl border-2 text-center transition-all hover:shadow-sm"
              style={{ background: statusFilter === status ? cfg.bg : "var(--white)", borderColor: statusFilter === status ? cfg.text + "30" : "transparent", boxShadow: statusFilter === status ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: cfg.text }} /><p className="text-[18px] font-extrabold" style={{ color: cfg.text }}>{count}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] font-bold opacity-60" style={{ color: cfg.text }}>{status.replace("_", " ")}</p>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-5 h-[100px] skeleton" />)}</div>
      : applications && applications.length > 0 ? (
        <div className="space-y-2 animate-fade-in stagger-2">
          {applications.map((app) => { const cfg = statusCfg[app.responseStatus || "pending"] || statusCfg.pending; const StatusIcon = cfg.icon;
            return (
              <div key={app.id} className="card card-hover p-4 sm:p-5 group transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}><StatusIcon className="w-5 h-5" style={{ color: cfg.text }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>Application #{app.id} <span style={{ color: "var(--muted)" }}>· Job #{app.jobId}</span></h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                          <span className="flex items-center gap-1 capitalize font-medium"><Send className="w-3 h-3" />{app.applicationMethod?.replace("_", "-")}</span>
                          {app.submittedAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(app.submittedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2.5 py-1 rounded-full capitalize font-bold" style={{ background: cfg.bg, color: cfg.text }}>{app.responseStatus?.replace("_", " ")}</span>
                        <button onClick={() => { if (confirm("Delete?")) deleteApp.mutate({ id: app.id }); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50" style={{ color: "var(--muted)" }}><Trash2 className="w-3.5 h-3.5 hover:text-red-500" /></button>
                      </div>
                    </div>
                    {app.notes && <p className="text-[11px] mt-2 p-2.5 rounded-lg font-medium" style={{ background: "var(--bg-input)", color: "var(--slate)" }}>{app.notes}</p>}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <span className="text-[10px] font-bold mr-1" style={{ color: "var(--muted)" }}>Move:</span>
                      {(["pending","phone_screen","interview","offer","rejection"] as const).map((s) => (
                        <button key={s} onClick={() => updateApp.mutate({ id: app.id, data: { responseStatus: s } })} className="text-[9px] px-2 py-1 rounded-full border transition-all font-bold"
                          style={{ background: app.responseStatus === s ? statusCfg[s]?.bg : "transparent", color: app.responseStatus === s ? statusCfg[s]?.text : "var(--muted)", borderColor: app.responseStatus === s ? statusCfg[s]?.text + "30" : "var(--border-light)" }}>{s.replace("_", " ")}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : <div className="card p-12 text-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}><Send className="w-8 h-8" style={{ color: "#1d4ed8" }} /></div><p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>No applications yet</p><p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>Log applications to track your pipeline</p></div>}
    </div>
  );
}
