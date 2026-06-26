import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Send, Plus, Calendar, CheckCircle, Clock, Phone, Trophy, XCircle,
  Trash2, ArrowRight, Bot, Loader2, GraduationCap, Lightbulb,
  MessageSquare, Building2, Target, Briefcase, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router";

const statusCfg: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "#fef3c7", text: "#92400e", icon: Clock },
  phone_screen: { bg: "#dbeafe", text: "#1e40af", icon: Phone },
  interview: { bg: "#ede9fe", text: "#5b21b6", icon: CheckCircle },
  offer: { bg: "#d1fae5", text: "#065f46", icon: Trophy },
  rejection: { bg: "#fee2e2", text: "#991b1b", icon: XCircle },
  withdrawn: { bg: "#f1f5f9", text: "#475569", icon: XCircle },
};
const pipelineStages = ["pending", "phone_screen", "interview", "offer", "rejection", "withdrawn"] as const;

interface ChatMessage { role: "user" | "assistant"; content: string; }

export default function Applications() {
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [method, setMethod] = useState<"manual" | "semi_auto" | "full_auto">("manual");
  const [notes, setNotes] = useState("");

  // Interview prep state
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepCompany, setPrepCompany] = useState("");
  const [prepRole, setPrepRole] = useState("");
  const [prepStage, setPrepStage] = useState("phone_screen");
  const [prepMessages, setPrepMessages] = useState<ChatMessage[]>([]);
  const [prepInput, setPrepInput] = useState("");
  const [isPrepLoading, setIsPrepLoading] = useState(false);
  const prepEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: applications, isLoading } = trpc.applications.list.useQuery(statusFilter ? { responseStatus: statusFilter } : undefined, { retry: false });
  const { data: allJobs } = trpc.jobs.list.useQuery({ limit: 200 });
  const { data: newJobs } = trpc.jobs.list.useQuery({ status: "applied" });
  const createApp = trpc.applications.create.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); setIsAddOpen(false); setSelectedJobId(""); setNotes(""); toast.success("Application logged"); }, onError: (err) => toast.error(err.message) });
  const updateApp = trpc.applications.update.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); toast.success("Updated"); }, onError: (err) => toast.error(err.message) });
  const deleteApp = trpc.applications.delete.useMutation({ onSuccess: () => { utils.applications.list.invalidate(); }, onError: (err) => toast.error(err.message) });
  const chatMut = trpc.ai.chat.useMutation();

  useEffect(() => { prepEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [prepMessages]);

  // Get job info for an application
  const getJobForApp = (jobId: number) => allJobs?.find((j) => j.id === jobId);

  const startInterviewPrep = (company?: string, role?: string, stage?: string) => {
    setPrepCompany(company || "");
    setPrepRole(role || "");
    setPrepStage(stage || "phone_screen");
    setPrepMessages([]);
    setPrepOpen(true);
  };

  const handlePrepChat = async (initialPrompt?: string) => {
    const input = initialPrompt || prepInput;
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { role: "user", content: input };
    setPrepMessages((prev) => [...prev, userMsg]);
    if (!initialPrompt) setPrepInput("");
    setIsPrepLoading(true);

    const systemPrompt = `You are an expert interview coach and career advisor. You have deep knowledge of how specific companies run their hiring processes.

${prepCompany ? `The candidate is interviewing at **${prepCompany}**.` : ""}
${prepRole ? `The role is: **${prepRole}**.` : ""}
${prepStage ? `Current stage: **${prepStage.replace("_", " ")}**.` : ""}

Key knowledge you have about company interview processes:
- **Google**: Structured interviews, behavioral (STAR method), coding (LeetCode medium-hard), system design, "Googleyness" culture fit
- **Amazon**: Leadership Principles (16 principles), STAR format required, bar raiser interviews, working backwards from customer
- **Meta**: Coding (45 min), system design, behavioral, product sense for PM roles, move fast culture
- **Microsoft**: Technical screen, coding rounds, system design, behavioral, growth mindset focus
- **Apple**: Design thinking, privacy focus, attention to detail, "why Apple" question is critical
- **NVIDIA**: Technical depth in GPU/ML, system architecture, C++/CUDA knowledge for hardware roles
- **Stripe**: Practical coding (real-world problems), system design with payments focus, writing sample
- **Startups (YC-backed)**: Culture fit, ownership mentality, "why this startup", technical breadth over depth

For any company, provide:
1. What to expect at each interview stage
2. Specific preparation strategies
3. Common questions and how to structure answers
4. Red flags to avoid
5. Company-specific tips and culture signals

Be specific, actionable, and encouraging. Use bullet points for clarity.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...prepMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: input },
    ];

    try {
      const res = await chatMut.mutateAsync({ messages });
      if (res.success && res.content) {
        setPrepMessages((prev) => [...prev, { role: "assistant", content: res.content! }]);
      } else {
        setPrepMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't process that. ${res.error || ""}` }]);
      }
    } catch (err) {
      setPrepMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Request failed"}` }]);
    }
    setIsPrepLoading(false);
  };

  const quickPrepPrompts = [
    { label: "Interview overview", prompt: `Give me a complete overview of the interview process at ${prepCompany || "this company"} for a ${prepRole || "technical"} role. What stages should I expect, how long does it take, and what's the success rate?` },
    { label: "Common questions", prompt: `What are the most common interview questions at ${prepCompany || "this company"} for ${prepStage.replace("_", " ")} stage? Give me 5-7 questions with tips on how to answer each.` },
    { label: "Preparation plan", prompt: `Create a 1-week preparation plan for my ${prepStage.replace("_", " ")} interview at ${prepCompany || "this company"} for the ${prepRole || "this"} role. Break it down day by day.` },
    { label: "Culture & values", prompt: `What are the key cultural values and signals ${prepCompany || "this company"} looks for? What should I demonstrate and what should I avoid?` },
    { label: "STAR examples", prompt: `Help me prepare 3 STAR (Situation, Task, Action, Result) stories that would work well for ${prepCompany || "this company"}'s interview style. Base them on common scenarios for ${prepRole || "technical"} roles.` },
  ];

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Track your pipeline and prepare for interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => startInterviewPrep()} className="h-9 px-4 flex items-center gap-2 text-[13px] rounded-lg font-semibold border transition-all hover:shadow-sm" style={{ borderColor: "#7c3aed30", color: "#7c3aed" }}>
            <GraduationCap className="w-4 h-4" /> Interview Prep
          </button>
          <Button onClick={() => setIsAddOpen(true)} className="text-white text-[13px] h-9 px-4 rounded-lg font-semibold" style={{ background: "var(--coral)" }}><Plus className="w-4 h-4 mr-1.5" /> Log Application</Button>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in stagger-1">
        {pipelineStages.map((status) => { const cfg = statusCfg[status]; const Icon = cfg.icon; const count = applications?.filter((a) => a.responseStatus === status).length ?? 0;
          return (
            <button key={status} onClick={() => setStatusFilter(statusFilter === status ? "" : status)} className="p-3 rounded-xl border-2 text-center transition-all hover:shadow-sm"
              style={{ background: statusFilter === status ? cfg.bg : "var(--white)", borderColor: statusFilter === status ? cfg.text + "30" : "transparent" }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: cfg.text }} /><p className="text-[18px] font-extrabold" style={{ color: cfg.text }}>{count}</p>
              <p className="text-[9px] uppercase tracking-[0.1em] font-bold opacity-60" style={{ color: cfg.text }}>{status.replace("_", " ")}</p>
            </button>
          );
        })}
      </div>

      {/* Application List */}
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-5 h-[100px] skeleton" />)}</div>
      : applications && applications.length > 0 ? (
        <div className="space-y-2 animate-fade-in stagger-2">
          {applications.map((app) => {
            const cfg = statusCfg[app.responseStatus || "pending"] || statusCfg.pending;
            const StatusIcon = cfg.icon;
            const job = getJobForApp(app.jobId);
            return (
              <div key={app.id} className="card card-hover p-4 sm:p-5 group transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}><StatusIcon className="w-5 h-5" style={{ color: cfg.text }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>
                          {job ? job.title : `Job #${app.jobId}`}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                          <span className="flex items-center gap-1 capitalize font-medium"><Send className="w-3 h-3" />{app.applicationMethod?.replace("_", "-")}</span>
                          {app.submittedAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(app.submittedAt).toLocaleDateString()}</span>}
                          {job?.location && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.location}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2.5 py-1 rounded-full capitalize font-bold" style={{ background: cfg.bg, color: cfg.text }}>{app.responseStatus?.replace("_", " ")}</span>
                        <button onClick={() => { if (confirm("Delete?")) deleteApp.mutate({ id: app.id }); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50" style={{ color: "var(--muted)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {app.notes && <p className="text-[11px] mt-2 p-2.5 rounded-lg font-medium" style={{ background: "var(--bg-input)", color: "var(--slate)" }}>{app.notes}</p>}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <span className="text-[10px] font-bold mr-1" style={{ color: "var(--muted)" }}>Stage:</span>
                      {(["pending","phone_screen","interview","offer","rejection"] as const).map((s) => (
                        <button key={s} onClick={() => updateApp.mutate({ id: app.id, data: { responseStatus: s } })} className="text-[9px] px-2 py-1 rounded-full border transition-all font-bold"
                          style={{ background: app.responseStatus === s ? statusCfg[s]?.bg : "transparent", color: app.responseStatus === s ? statusCfg[s]?.text : "var(--muted)", borderColor: app.responseStatus === s ? statusCfg[s]?.text + "30" : "var(--border-light)" }}>{s.replace("_", " ")}</button>
                      ))}
                      <div className="flex-1" />
                      <button onClick={() => startInterviewPrep(job?.title?.split(" ")[0], job?.title, app.responseStatus || "phone_screen")}
                        className="text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all hover:bg-[#ede9fe]" style={{ color: "#7c3aed" }}>
                        <GraduationCap className="w-3 h-3" /> Prep
                      </button>
                      {job?.sourceUrl && (
                        <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all hover:bg-[#ffedd5]" style={{ color: "#FF6B35" }}>
                          <ExternalLink className="w-3 h-3" /> View Job
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}>
            <Send className="w-8 h-8" style={{ color: "#1d4ed8" }} />
          </div>
          <p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>No applications yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>Applied for jobs will appear here automatically. You can also log applications manually.</p>
          <Link to="/jobs" className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold" style={{ color: "#FF6B35" }}>Browse Jobs <ArrowRight className="w-3 h-3" /></Link>
        </div>
      )}

      {/* Log Application Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-xl border-0 shadow-xl" style={{ background: "var(--white)" }}>
          <DialogHeader><DialogTitle className="text-[16px] font-bold" style={{ color: "var(--navy)" }}>Log New Application</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Job</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue placeholder="Select a job..." /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-60" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
                  {allJobs?.map((job) => <SelectItem key={job.id} value={String(job.id)}>{job.title} {job.location ? `(${job.location})` : ""}</SelectItem>)}
                </SelectContent>
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

      {/* Interview Prep Dialog */}
      <Dialog open={prepOpen} onOpenChange={setPrepOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] rounded-xl border-0 shadow-xl p-0 overflow-hidden" style={{ background: "var(--white)" }}>
          <div className="flex flex-col h-[75vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ede9fe, #f3e8ff)" }}>
                  <GraduationCap className="w-5 h-5" style={{ color: "#7c3aed" }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>Interview Coach</h2>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>Company-specific prep, tips, and practice</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Input value={prepCompany} onChange={(e) => setPrepCompany(e.target.value)} placeholder="Company name" className="h-8 rounded-lg border text-[12px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                <Input value={prepRole} onChange={(e) => setPrepRole(e.target.value)} placeholder="Role title" className="h-8 rounded-lg border text-[12px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                <Select value={prepStage} onValueChange={setPrepStage}>
                  <SelectTrigger className="h-8 rounded-lg border text-[12px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="technical">Technical Round</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="system_design">System Design</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="final">Final Round</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {prepMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3" style={{ color: "#fbbf24" }} />
                  <p className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>What would you like to prepare for?</p>
                  <p className="text-[12px] mt-1 mb-4" style={{ color: "var(--muted)" }}>
                    {prepCompany ? `I know about ${prepCompany}'s interview process.` : "Tell me the company and I'll give you tailored advice."}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickPrepPrompts.map((q) => (
                      <button key={q.label} onClick={() => handlePrepChat(q.prompt)} className="text-[11px] px-3 py-2 rounded-lg border transition-all hover:border-[#7c3aed30] hover:bg-[#faf5ff]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {prepMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-relaxed`}
                    style={{ background: msg.role === "user" ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "var(--bg-input)", color: msg.role === "user" ? "white" : "var(--slate)" }}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isPrepLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-input)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--muted)" }} />
                  </div>
                </div>
              )}
              <div ref={prepEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--border-light)" }}>
              <Input value={prepInput} onChange={(e) => setPrepInput(e.target.value)} placeholder="Ask about interview process, tips, practice questions..."
                className="flex-1 h-10 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePrepChat(); } }} />
              <Button onClick={() => handlePrepChat()} disabled={isPrepLoading || !prepInput.trim()} className="h-10 px-4 rounded-lg text-white font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                {isPrepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
