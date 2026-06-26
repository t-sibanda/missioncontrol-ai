import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Bot, Loader2, Sparkles, FileText, Target, Copy, CheckCircle, Wand2,
  PenTool, BarChart3, Shield, Download, Send, MessageSquare, Link2, X,
  ArrowRight, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router";

type ToolMode = "tailor" | "cover" | "ats" | "parse" | "chat";

const tools: { id: ToolMode; label: string; icon: React.ElementType; desc: string; bg: string; color: string }[] = [
  { id: "tailor", label: "Tailor Resume", icon: Wand2, desc: "Customize for a job", bg: "linear-gradient(135deg, #ffedd5, #fef3c7)", color: "#FF6B35" },
  { id: "cover", label: "Cover Letter", icon: PenTool, desc: "Generate letter", bg: "linear-gradient(135deg, #fef3c7, #fde68a)", color: "#b45309" },
  { id: "ats", label: "ATS Score", icon: BarChart3, desc: "Check compatibility", bg: "linear-gradient(135deg, #d1fae5, #ecfdf5)", color: "#047857" },
  { id: "parse", label: "Parse Job", icon: Target, desc: "Extract requirements", bg: "linear-gradient(135deg, #ede9fe, #f3e8ff)", color: "#6d28d9" },
  { id: "chat", label: "AI Chat", icon: MessageSquare, desc: "Ask anything", bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)", color: "#2563eb" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Optimizer() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ToolMode>("tailor");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<Record<string, unknown> | null>(null);
  const [atsResult, setAtsResult] = useState<Record<string, unknown> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: profiles } = trpc.resume.listProfiles.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const defaultProfile = profiles?.find((p) => p.isDefault) || profiles?.[0];
  const parseJob = trpc.ai.parseJob.useMutation();
  const atsScoreMut = trpc.ai.atsScore.useMutation();
  const tailorResumeMut = trpc.ai.tailorResume.useMutation();
  const generateCoverMut = trpc.ai.generateCoverLetter.useMutation();
  const chatMut = trpc.ai.chat.useMutation();

  // Pre-fill from URL params (when coming from Jobs page)
  useEffect(() => {
    const desc = searchParams.get("description");
    const title = searchParams.get("title");
    const company = searchParams.get("company");
    const url = searchParams.get("url");
    if (desc) setJobDescription(desc);
    if (title) setJobTitle(title);
    if (company) setCompanyName(company);
    if (url) setJobUrl(url);
  }, [searchParams]);

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleProcess = async () => {
    if (!jobDescription.trim()) { toast.error("Enter a job description or paste a job URL"); return; }
    if (!defaultProfile) { toast.error("Create a resume profile first"); return; }
    setIsProcessing(true); setResult(null); setParsedResult(null); setAtsResult(null);
    try {
      if (mode === "parse") {
        const res = await parseJob.mutateAsync({ description: jobDescription });
        if (res.success && res.parsed) setParsedResult(res.parsed as Record<string, unknown>);
        else { toast.error(res.error || "AI processing failed"); setResult(`Error: ${res.error || "Unknown error"}`); }
      }
      else if (mode === "ats") {
        const res = await atsScoreMut.mutateAsync({ resumeText: defaultProfile.baseResumeText, jobDescription });
        if (res.success && res.content) { try { setAtsResult(JSON.parse(res.content)); } catch { setResult(res.content); } }
        else { toast.error(res.error || "AI processing failed"); setResult(`Error: ${res.error || "Unknown error"}`); }
      }
      else if (mode === "tailor") {
        const voice = defaultProfile.voiceProfile || "Professional";
        const res = await tailorResumeMut.mutateAsync({ baseResume: defaultProfile.baseResumeText, voiceProfile: voice, jobDescription });
        if (res.success && res.content) { try { setResult(JSON.stringify(JSON.parse(res.content), null, 2)); } catch { setResult(res.content); } }
        else { toast.error(res.error || "AI processing failed"); setResult(`Error: ${res.error || "Unknown error"}`); }
      }
      else if (mode === "cover") {
        const voice = defaultProfile.voiceProfile || "Professional";
        const res = await generateCoverMut.mutateAsync({ baseResume: defaultProfile.baseResumeText, voiceProfile: voice, jobDescription, companyName: companyName || "the company", jobTitle: jobTitle || "this role" });
        if (res.success && res.content) setResult(res.content);
        else { toast.error(res.error || "AI processing failed"); setResult(`Error: ${res.error || "Unknown error"}`); }
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setResult(`Error: ${err instanceof Error ? err.message : "Request failed"}`); }
    setIsProcessing(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatting(true);

    // Build context for AI
    const systemPrompt = `You are an expert career coach and resume optimizer. The user has a resume profile${defaultProfile ? ` (${defaultProfile.fullName || "their profile"})` : ""}.${defaultProfile?.baseResumeText ? ` Here's their resume summary: ${defaultProfile.baseResumeText.slice(0, 500)}...` : ""}${jobDescription ? `\n\nThey are working with this job description:\n${jobDescription.slice(0, 500)}...` : ""}\n\nHelp them improve their application materials, answer career questions, and give actionable advice. Be specific and practical.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...chatMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: chatInput },
    ];

    try {
      const res = await chatMut.mutateAsync({ messages });
      if (res.success && res.content) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: res.content! }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't process that. ${res.error || ""}` }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Request failed"}` }]);
    }
    setIsChatting(false);
  };

  const downloadResult = (filename: string) => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="animate-fade-in">
        <h1 className="page-title">AI Optimizer</h1>
        <p className="page-subtitle">Tailor your resume, generate cover letters, and chat with AI about your applications</p>
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
          <Link to="/resume" className="text-[11px] font-semibold" style={{ color: "#FF6B35" }}>Edit Profile →</Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderColor: "#fbbf24" }}>
          <Shield className="w-4 h-4" style={{ color: "#b45309" }} />
          <span className="text-[12px] font-semibold" style={{ color: "#78350f" }}>Create a resume profile to use AI tools</span>
          <Link to="/resume" className="text-[11px] font-semibold ml-auto" style={{ color: "#FF6B35" }}>Create Profile →</Link>
        </div>
      )}

      {/* Tool Selector */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 animate-fade-in stagger-2">
        {tools.map((tool) => { const Icon = tool.icon; const active = mode === tool.id;
          return (
            <button key={tool.id} onClick={() => { setMode(tool.id); if (tool.id !== "chat") { setResult(null); setParsedResult(null); setAtsResult(null); } }}
              className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border-2 transition-all ${active ? "shadow-sm" : "hover:shadow-sm"}`}
              style={{ background: active ? tool.bg : "var(--white)", borderColor: active ? tool.color + "30" : "transparent" }}>
              <Icon className="w-5 h-5" style={{ color: active ? tool.color : "var(--muted)" }} />
              <span className="text-[11px] sm:text-[12px] font-semibold" style={{ color: active ? tool.color : "var(--slate)" }}>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Mode */}
      {mode === "chat" ? (
        <div className="card p-0 overflow-hidden animate-fade-in" style={{ height: "500px", display: "flex", flexDirection: "column" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border-light)" }}>
            <Bot className="w-4 h-4" style={{ color: "#2563eb" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>AI Career Coach</span>
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>— Ask about resume improvements, interview prep, or career strategy</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--border)" }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>How can I help with your job search?</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>Ask me to improve bullet points, prep for interviews, analyze a job posting, or refine your strategy.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["How can I improve my resume for tech roles?", "What skills should I highlight for this job?", "Help me write a follow-up email"].map((q) => (
                    <button key={q} onClick={() => { setChatInput(q); }} className="text-[11px] px-3 py-1.5 rounded-lg border transition-all hover:border-[#2563eb30]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-[13px] leading-relaxed ${msg.role === "user" ? "text-white" : ""}`}
                  style={{ background: msg.role === "user" ? "linear-gradient(135deg, #FF6B35, #ff8c5a)" : "var(--bg-input)", color: msg.role === "user" ? "white" : "var(--slate)" }}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-input)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--muted)" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--border-light)" }}>
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your question..."
              className="flex-1 h-10 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }} />
            <Button onClick={handleChat} disabled={isChatting || !chatInput.trim()} className="h-10 px-4 rounded-lg text-white font-semibold" style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}>
              {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        /* Tool Mode (Tailor, Cover, ATS, Parse) */
        <>
          <div className="card p-6 space-y-4 animate-fade-in stagger-3">
            {/* Job URL input */}
            <div>
              <label className="text-[11px] font-bold mb-1 flex items-center gap-1" style={{ color: "var(--muted)" }}><Link2 className="w-3 h-3" /> Job URL (optional)</label>
              <Input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://boards.greenhouse.io/company/jobs/12345" className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
              <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Paste the job posting URL for reference (the description below is what AI analyzes)</p>
            </div>

            {mode === "cover" && <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Company</label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="OpenAI" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
              <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Job Title</label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Engineer" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
            </div>}

            <div>
              <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Job Description (paste the full text)</label>
              <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the full job description here... The AI will analyze it against your resume profile." className="min-h-[180px] rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleProcess} disabled={isProcessing || !jobDescription.trim()} className="btn-primary flex-1" style={{ height: "44px" }}>
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />{mode === "tailor" ? "Tailor Resume" : mode === "cover" ? "Generate Cover Letter" : mode === "ats" ? "Check ATS Score" : "Parse Job"}</>}
              </button>
              {jobDescription.trim() && (
                <button onClick={() => { setMode("chat"); setChatMessages([]); }} className="h-[44px] px-4 rounded-xl border-2 text-[12px] font-semibold flex items-center gap-2 transition-all hover:shadow-sm" style={{ borderColor: "#2563eb30", color: "#2563eb" }}>
                  <MessageSquare className="w-4 h-4" /> Discuss with AI
                </button>
              )}
            </div>
          </div>

          {/* Results */}
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
              <pre className="text-[11px] p-4 rounded-lg border overflow-x-auto whitespace-pre-wrap" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{JSON.stringify(atsResult, null, 2)}</pre>
            </div>
          )}

          {result && mode !== "parse" && (
            <div className="card p-5 animate-scale-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
                  <Bot className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                  {mode === "cover" ? "Cover Letter" : mode === "tailor" ? "Tailored Resume" : "Result"}
                </h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg font-medium" style={{ color: "#047857" }}
                    onClick={() => downloadResult(mode === "cover" ? "cover-letter.txt" : "tailored-resume.txt")}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg font-medium" style={{ color: "var(--muted)" }}
                    onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied"); }}>
                    {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg p-4 border whitespace-pre-wrap text-[13px] leading-relaxed max-h-[400px] overflow-y-auto" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{result}</div>

              {/* Action buttons after result */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t flex-wrap" style={{ borderColor: "var(--border-light)" }}>
                {jobUrl && (
                  <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-[12px] no-underline" style={{ height: "36px" }}>
                    <Briefcase className="w-3.5 h-3.5" /> Apply on Site
                  </a>
                )}
                <Link to="/applications" className="h-9 px-3 flex items-center gap-1.5 text-[12px] rounded-lg font-semibold border transition-all hover:shadow-sm" style={{ borderColor: "var(--border-light)", color: "var(--navy)" }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#059669" }} /> Log Application
                </Link>
                <button onClick={() => { setMode("chat"); setChatMessages([]); }} className="h-9 px-3 flex items-center gap-1.5 text-[12px] rounded-lg font-semibold border transition-all hover:shadow-sm" style={{ borderColor: "#2563eb30", color: "#2563eb" }}>
                  <MessageSquare className="w-3.5 h-3.5" /> Refine with AI
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
