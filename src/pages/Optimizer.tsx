import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Bot, Loader2, Sparkles, FileText, Target, Copy, CheckCircle, Wand2, PenTool, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type ToolMode = "ats" | "tailor" | "cover" | "parse";
const tools: { id: ToolMode; label: string; icon: React.ElementType; desc: string; bg: string; color: string }[] = [
  { id: "tailor", label: "Tailor Resume", icon: Wand2, desc: "Customize for a job", bg: "linear-gradient(135deg, #ffedd5, #fef3c7)", color: "#FF6B35" },
  { id: "cover", label: "Cover Letter", icon: PenTool, desc: "Generate letter", bg: "linear-gradient(135deg, #fef3c7, #fde68a)", color: "#b45309" },
  { id: "ats", label: "ATS Score", icon: BarChart3, desc: "Check compatibility", bg: "linear-gradient(135deg, #d1fae5, #ecfdf5)", color: "#047857" },
  { id: "parse", label: "Parse Job", icon: Target, desc: "Extract requirements", bg: "linear-gradient(135deg, #ede9fe, #f3e8ff)", color: "#6d28d9" },
];

export default function Optimizer() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<ToolMode>("tailor");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<Record<string, unknown> | null>(null);
  const [atsResult, setAtsResult] = useState<Record<string, unknown> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: profiles } = trpc.resume.listProfiles.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const defaultProfile = profiles?.find((p) => p.isDefault) || profiles?.[0];
  const parseJob = trpc.ai.parseJob.useMutation();
  const atsScoreMut = trpc.ai.atsScore.useMutation();
  const tailorResumeMut = trpc.ai.tailorResume.useMutation();
  const generateCoverMut = trpc.ai.generateCoverLetter.useMutation();

  const handleProcess = async () => {
    if (!jobDescription.trim()) { toast.error("Enter a job description"); return; }
    if (!defaultProfile) { toast.error("Create a resume profile first"); return; }
    setIsProcessing(true); setResult(null); setParsedResult(null); setAtsResult(null);
    try {
      if (mode === "parse") { const res = await parseJob.mutateAsync({ description: jobDescription }); if (res.success && res.parsed) setParsedResult(res.parsed as Record<string, unknown>); else toast.error(res.error || "Failed"); }
      else if (mode === "ats") { const res = await atsScoreMut.mutateAsync({ resumeText: defaultProfile.baseResumeText, jobDescription }); if (res.success && res.content) { try { setAtsResult(JSON.parse(res.content)); } catch { setResult(res.content); } } }
      else if (mode === "tailor") { const voice = defaultProfile.voiceProfile || "Professional"; const res = await tailorResumeMut.mutateAsync({ baseResume: defaultProfile.baseResumeText, voiceProfile: voice, jobDescription }); if (res.success && res.content) { try { setResult(JSON.stringify(JSON.parse(res.content), null, 2)); } catch { setResult(res.content); } } }
      else if (mode === "cover") { const voice = defaultProfile.voiceProfile || "Professional"; const res = await generateCoverMut.mutateAsync({ baseResume: defaultProfile.baseResumeText, voiceProfile: voice, jobDescription, companyName: companyName || "the company", jobTitle: jobTitle || "this role" }); if (res.success) setResult(res.content || ""); }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="animate-fade-in">
        <h1 className="page-title">AI Optimizer</h1>
        <p className="page-subtitle">AI-powered resume optimization and job analysis</p>
      </div>

      {defaultProfile ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in stagger-1" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)", borderColor: "#fbbf24" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.8)" }}>
            <FileText className="w-4 h-4" style={{ color: "#FF6B35" }} />
          </div>
          <div className="flex-1">
            <span className="text-[13px] font-semibold" style={{ color: "#78350f" }}>{defaultProfile.fullName || `Profile #${defaultProfile.id}`}</span>
            <span className="text-[11px] ml-2" style={{ color: "#92400e" }}>{defaultProfile.voiceProfile ? "Voice profile active" : "No voice profile yet"}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderColor: "#fbbf24" }}>
          <Shield className="w-4 h-4" style={{ color: "#b45309" }} />
          <span className="text-[12px] font-semibold" style={{ color: "#78350f" }}>Create a resume profile to use AI tools</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in stagger-2">
        {tools.map((tool) => { const Icon = tool.icon; const active = mode === tool.id;
          return (
            <button key={tool.id} onClick={() => { setMode(tool.id); setResult(null); setParsedResult(null); setAtsResult(null); }} className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${active ? "shadow-sm" : "hover:shadow-sm"}`}
              style={{ background: active ? tool.bg : "var(--white)", borderColor: active ? tool.color + "30" : "transparent", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
              <Icon className="w-5 h-5" style={{ color: active ? tool.color : "var(--muted)" }} />
              <span className="text-[12px] font-semibold" style={{ color: active ? tool.color : "var(--slate)" }}>{tool.label}</span>
              <span className="text-[10px] opacity-50 font-medium" style={{ color: active ? tool.color : "var(--muted)" }}>{tool.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="card p-6 space-y-4 animate-fade-in stagger-3">
        {mode === "cover" && <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Company</label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="OpenAI" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Job Title</label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Engineer" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
        </div>}
        <div>
          <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>{mode === "parse" ? "Job Description to Parse" : "Job Description"}</label>
          <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description..." className="min-h-[180px] rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} />
        </div>
        <button onClick={handleProcess} disabled={isProcessing || !jobDescription.trim()} className="btn-primary" style={{ height: "44px" }}>
          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />{mode === "tailor" ? "Tailor Resume" : mode === "cover" ? "Generate Cover Letter" : mode === "ats" ? "Check ATS Score" : "Parse Job"}</>}
        </button>
      </div>

      {parsedResult && mode === "parse" && (
        <div className="card p-5 animate-scale-in">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}><Target className="w-4 h-4" style={{ color: "#FF6B35" }} /> Parsed Requirements</h3>
          <div className="space-y-2">{Object.entries(parsedResult).map(([key, value]) => (
            <div key={key} className="rounded-lg p-3 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: "#FF6B35" }}>{key.replace(/([A-Z])/g, " $1").trim()}</p>
              {Array.isArray(value) ? <div className="flex flex-wrap gap-1">{value.map((v, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-md border font-medium" style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{String(v)}</span>)}</div> : <p className="text-[12px]" style={{ color: "var(--slate)" }}>{String(value)}</p>}
            </div>
          ))}</div>
        </div>
      )}

      {atsResult && mode === "ats" && (
        <div className="card p-5 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}><BarChart3 className="w-4 h-4" style={{ color: "#FF6B35" }} /> ATS Score</h3>
            <div className="text-[26px] font-extrabold" style={{ color: "#FF6B35" }}>{typeof atsResult.overallScore === "number" ? `${atsResult.overallScore}%` : String(atsResult.overallScore || "N/A")}</div>
          </div>
          <pre className="text-[11px] p-4 rounded-lg border overflow-x-auto" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{JSON.stringify(atsResult, null, 2)}</pre>
        </div>
      )}

      {result && mode !== "parse" && (
        <div className="card p-5 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}><Bot className="w-4 h-4" style={{ color: "#8b5cf6" }} />{mode === "cover" ? "Cover Letter" : "Result"}</h3>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg font-medium" style={{ color: "var(--muted)" }} onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied"); }}>
              {copied ? <span className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-1" />Copied</span> : <span className="flex items-center"><Copy className="w-3.5 h-3.5 mr-1" />Copy</span>}
            </Button>
          </div>
          <div className="rounded-lg p-4 border whitespace-pre-wrap font-mono text-[13px] leading-relaxed" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{result}</div>
        </div>
      )}
    </div>
  );
}
