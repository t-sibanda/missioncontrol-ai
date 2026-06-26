import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  FileText, Plus, Loader2, Sparkles, Trash2, User, Mail, Phone,
  Link2, Crown, Cloud, Download, CheckCircle, ExternalLink, Upload,
  Award, Globe, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Resume() {
  const { isAuthenticated } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [samplesInput, setSamplesInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [certUrl, setCertUrl] = useState("");
  const [certName, setCertName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newProfileFileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: profiles, isLoading } = trpc.resume.listProfiles.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  const createProfile = trpc.resume.createProfile.useMutation({ onSuccess: () => { utils.resume.listProfiles.invalidate(); setIsAddOpen(false); toast.success("Profile created"); }, onError: (err) => toast.error(err.message) });
  const updateProfile = trpc.resume.updateProfile.useMutation({ onSuccess: () => { utils.resume.listProfiles.invalidate(); toast.success("Saved"); }, onError: (err) => toast.error(err.message) });
  const deleteProfile = trpc.resume.deleteProfile.useMutation({ onSuccess: () => { utils.resume.listProfiles.invalidate(); setSelectedProfileId(null); toast.success("Deleted"); }, onError: (err) => toast.error(err.message) });
  const setDefault = trpc.resume.setDefaultProfile.useMutation({ onSuccess: () => { utils.resume.listProfiles.invalidate(); toast.success("Default set"); }, onError: (err) => toast.error(err.message) });
  const analyzeVoice = trpc.ai.analyzeVoice.useMutation();
  const getUploadUrl = trpc.storage.getUploadUrl.useMutation();

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "resume_pdf" | "resume_docx", profileId?: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    const targetProfileId = profileId || selectedProfile?.id;
    if (!targetProfileId) { toast.error("No profile selected"); return; }
    setIsUploading(true);
    try {
      const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({ filename: file.name, fileType: type, contentType: file.type });
      const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) throw new Error("Upload failed");
      await updateProfile.mutateAsync({ id: targetProfileId, data: { pdfUrl: publicUrl } });
      toast.success(`${type === "resume_pdf" ? "PDF" : "DOCX"} uploaded to cloud`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    setIsUploading(false); if (e.target) e.target.value = "";
  };

  const handleVoiceAnalysis = async () => {
    if (!samplesInput.trim() || !selectedProfile) return;
    setIsAnalyzing(true);
    try {
      const samples = samplesInput.split("\n---\n").filter((s) => s.trim());
      if (samples.length === 0) { toast.error("Please paste at least one writing sample"); setIsAnalyzing(false); return; }
      const result = await analyzeVoice.mutateAsync({ samples });
      if (result.success && result.content && selectedProfile) {
        await updateProfile.mutateAsync({ id: selectedProfile.id, data: { voiceProfile: result.content, writingSamples: samples } });
        toast.success("Voice profile analyzed successfully");
      } else {
        toast.error(result.error || "Voice analysis failed — the AI service may be unavailable. Try again later.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice analysis request failed");
    }
    setIsAnalyzing(false); setSamplesInput("");
  };

  const addCertification = () => {
    if (!certName.trim() || !certUrl.trim() || !selectedProfile) { toast.error("Name and URL required"); return; }
    const certs = ((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.certifications as Array<{name: string; url: string}>) || [];
    updateProfile.mutate({ id: selectedProfile.id, data: { baseResumeJson: { ...((selectedProfile.baseResumeJson as Record<string, unknown>) || {}), certifications: [...certs, { name: certName, url: certUrl }] } } });
    setCertName(""); setCertUrl(""); toast.success("Certification added");
  };

  const addLink = () => {
    if (!linkLabel.trim() || !linkUrl.trim() || !selectedProfile) { toast.error("Label and URL required"); return; }
    const links = ((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.links as Array<{label: string; url: string}>) || [];
    updateProfile.mutate({ id: selectedProfile.id, data: { baseResumeJson: { ...((selectedProfile.baseResumeJson as Record<string, unknown>) || {}), links: [...links, { label: linkLabel, url: linkUrl }] } } });
    setLinkLabel(""); setLinkUrl(""); toast.success("Link added");
  };

  if (!isAuthenticated) return (
    <div className="card p-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
        <User className="w-8 h-8" style={{ color: "#b45309" }} />
      </div>
      <p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>Sign in to manage resumes</p>
      <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>Create your profile and start applying</p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Resume Profiles</h1>
          <p className="page-subtitle">Manage resumes, certifications, and portfolio links</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* Default profile badge */}
      {(() => {
        const defaultProfile = profiles?.find((p) => p.isDefault) || profiles?.[0];
        return defaultProfile ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in stagger-1" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderColor: "#fbbf24" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.8)" }}>
              <Crown className="w-4 h-4" style={{ color: "#b45309" }} />
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-semibold" style={{ color: "#78350f" }}>Active: {defaultProfile.fullName || `Profile #${defaultProfile.id}`}</span>
              <span className="text-[11px] ml-2" style={{ color: "#92400e" }}>{defaultProfile.voiceProfile ? "Voice profile active" : "No voice profile yet"}</span>
            </div>
          </div>
        ) : null;
      })()}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-4 h-[72px] skeleton" />)}</div>
          <div className="lg:col-span-2 space-y-4">{[1,2,3].map(i => <div key={i} className="card p-5 h-[180px] skeleton" />)}</div>
        </div>
      ) : profiles && profiles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          {/* Profile list */}
          <div className="space-y-2">
            {profiles.map((profile) => (
              <button key={profile.id} onClick={() => setSelectedProfileId(profile.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${selectedProfileId === profile.id ? "border-[#FF6B35]" : "border-transparent hover:border-[#e2e8f0]"}`}
                style={{ background: selectedProfileId === profile.id ? "linear-gradient(135deg, #fff7ed, #fffbeb)" : "var(--white)", boxShadow: selectedProfileId === profile.id ? "0 4px 16px rgba(255,107,53,0.12)" : "var(--card-shadow)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: profile.isDefault ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "#f1f5f9" }}>
                    {profile.isDefault ? <Crown className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4" style={{ color: "var(--muted)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{profile.fullName || `Profile #${profile.id}`}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{profile.email || "No email"}</p>
                  </div>
                  {profile.isDefault && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#fef3c7", color: "#b45309" }}>DEFAULT</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedProfile ? (
              <>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!selectedProfile.isDefault && <Button size="sm" variant="ghost" className="h-8 text-[11px] rounded-lg font-medium" style={{ color: "#b45309" }} onClick={() => setDefault.mutate({ id: selectedProfile.id })}><Crown className="w-3 h-3 mr-1" /> Set Default</Button>}
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFileUpload(e, e.target.files?.[0]?.name.endsWith(".pdf") ? "resume_pdf" : "resume_docx")} />
                  <Button size="sm" variant="ghost" className="h-8 text-[11px] rounded-lg font-medium" style={{ color: "var(--coral)" }} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Upload Resume
                  </Button>
                  {selectedProfile.pdfUrl && <a href={selectedProfile.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 h-8 px-3 text-[11px] rounded-lg hover:bg-emerald-50 font-medium transition-colors" style={{ color: "var(--success)" }}><Download className="w-3 h-3" /> Download</a>}
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" className="h-8 text-[11px] rounded-lg hover:bg-red-50 transition-colors" style={{ color: "var(--danger)" }} onClick={() => { if (confirm("Delete?")) deleteProfile.mutate({ id: selectedProfile.id }); }}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                </div>

                {/* Resume text */}
                <div className="card p-5">
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}><FileText className="w-4 h-4" style={{ color: "var(--coral)" }} /> Base Resume</h3>
                  <Textarea defaultValue={selectedProfile.baseResumeText || ""} className="min-h-[200px] rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} placeholder="Paste your resume..."
                    onBlur={(e) => updateProfile.mutate({ id: selectedProfile.id, data: { baseResumeText: e.target.value } })} />
                </div>

                {/* Voice */}
                <div className="card p-5">
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}><Sparkles className="w-4 h-4" style={{ color: "#8b5cf6" }} /> Voice Profile</h3>
                  {selectedProfile.voiceProfile ? (
                    <div className="rounded-lg p-4 border text-[13px] leading-relaxed" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{selectedProfile.voiceProfile}</div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[12px]" style={{ color: "var(--muted)" }}>Paste 1-3 writing samples separated by --- and AI will analyze your voice.</p>
                      <Textarea value={samplesInput} onChange={(e) => setSamplesInput(e.target.value)} placeholder="Paste samples...&#10;---&#10;Another..." className="min-h-[120px] rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} />
                      <Button size="sm" className="rounded-lg text-[12px] font-medium" style={{ background: "#ede9fe", color: "#6d28d9" }} onClick={handleVoiceAnalysis} disabled={isAnalyzing || !samplesInput.trim()}>
                        {isAnalyzing ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Analyzing...</> : <><Sparkles className="w-3.5 h-3.5 mr-1" />Analyze Voice</>}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="card p-5">
                  <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--navy)" }}>Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[{ label: "Full Name", icon: User, key: "fullName", type: "text" }, { label: "Email", icon: Mail, key: "email", type: "email" }, { label: "Phone", icon: Phone, key: "phone", type: "text" }, { label: "LinkedIn", icon: Link2, key: "linkedInUrl", type: "text" }].map((f) => {
                      const Icon = f.icon;
                      return (
                        <div key={f.key}>
                          <label className="text-[11px] mb-1 flex items-center gap-1" style={{ color: "var(--muted)" }}><Icon className="w-3 h-3" /> {f.label}</label>
                          <Input defaultValue={String(selectedProfile[f.key as keyof typeof selectedProfile] || "")} type={f.type} className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}
                            onBlur={(e) => updateProfile.mutate({ id: selectedProfile.id, data: { [f.key]: e.target.value } })} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certifications */}
                <div className="card p-5">
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}><Award className="w-4 h-4" style={{ color: "#f59e0b" }} /> Certifications</h3>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Certification name" value={certName} onChange={(e) => setCertName(e.target.value)} className="h-9 rounded-lg border text-[13px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                    <Input placeholder="Credential URL" value={certUrl} onChange={(e) => setCertUrl(e.target.value)} className="h-9 rounded-lg border text-[13px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                    <Button size="sm" className="h-9 rounded-lg text-white text-[12px] font-medium px-4" style={{ background: "var(--coral)" }} onClick={addCertification}>Add</Button>
                  </div>
                  <div className="space-y-1.5">
                    {(((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.certifications as Array<{name: string; url: string}>) || []).map((cert, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--bg-input)" }}>
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--success)" }} />
                        <span className="text-[13px] flex-1 font-medium" style={{ color: "var(--navy)" }}>{cert.name}</span>
                        {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white transition-colors" style={{ color: "var(--muted)" }}><ExternalLink className="w-3.5 h-3.5" /></a>}
                      </div>
                    ))}
                    {(((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.certifications as Array<{name: string; url: string}>) || []).length === 0 && (
                      <p className="text-[12px] text-center py-3" style={{ color: "var(--muted)" }}>No certifications yet</p>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div className="card p-5">
                  <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}><Globe className="w-4 h-4" style={{ color: "var(--coral)" }} /> Links & Portfolio</h3>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Label (e.g. GitHub)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="h-9 rounded-lg border text-[13px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                    <Input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-9 rounded-lg border text-[13px] flex-1" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
                    <Button size="sm" className="h-9 rounded-lg text-white text-[12px] font-medium px-4" style={{ background: "var(--coral)" }} onClick={addLink}>Add</Button>
                  </div>
                  <div className="space-y-1.5">
                    {(((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.links as Array<{label: string; url: string}>) || []).map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-[#faf8f5] transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--coral)" }} />
                        <span className="text-[13px] font-medium" style={{ color: "var(--navy)" }}>{link.label}</span>
                        <span className="text-[11px] flex-1 truncate" style={{ color: "var(--muted)" }}>{link.url}</span>
                      </a>
                    ))}
                    {(((selectedProfile.baseResumeJson as Record<string, unknown> | null)?.links as Array<{label: string; url: string}>) || []).length === 0 && (
                      <p className="text-[12px] text-center py-3" style={{ color: "var(--muted)" }}>No links yet</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                  <FileText className="w-8 h-8" style={{ color: "#b45309" }} />
                </div>
                <p className="font-semibold" style={{ color: "var(--navy)" }}>Select a profile to view details</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>Choose from the list on the left</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-16 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <Zap className="w-10 h-10" style={{ color: "#b45309" }} />
          </div>
          <h2 className="text-[18px] font-bold mb-1" style={{ color: "var(--navy)" }}>No resume profiles yet</h2>
          <p className="text-[13px] mb-5" style={{ color: "var(--muted)" }}>Create your first profile to get started with AI-powered applications</p>
          <button onClick={() => setIsAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create Your First Profile</button>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg rounded-xl border-0 shadow-xl" style={{ background: "var(--white)", boxShadow: "var(--card-shadow-hover)" }}>
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--coral)" }} />
              </div>
              Create Resume Profile
            </DialogTitle>
          </DialogHeader>
          <NewProfileForm onSubmit={(data) => createProfile.mutate(data)} isPending={createProfile.isPending} onFileUpload={handleFileUpload} isUploading={isUploading} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewProfileForm({
  onSubmit, isPending, onFileUpload, isUploading
}: {
  onSubmit: (data: { baseResumeText: string; fullName?: string; email?: string }) => void;
  isPending: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "resume_pdf" | "resume_docx", profileId?: number) => void;
  isUploading: boolean;
}) {
  const [form, setForm] = useState({ baseResumeText: "", fullName: "", email: "" });
  const [hasFile, setHasFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHasFile(true);
      setFileName(file.name);
    }
  };

  const handleSubmit = () => {
    if (!form.baseResumeText.trim()) { toast.error("Resume text is required"); return; }
    onSubmit(form);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Full Name</label>
          <Input value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} placeholder="John Doe" className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
        </div>
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Email</label>
          <Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} type="email" placeholder="john@email.com" className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Resume File (PDF or DOCX)</label>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all hover:border-[#FF6B35] hover:bg-[#fff7ed]"
          style={{ borderColor: hasFile ? "#FF6B35" : "var(--border-light)", background: hasFile ? "#fff7ed" : "var(--bg-input)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: hasFile ? "linear-gradient(135deg, #ffedd5, #fef3c7)" : "#f1f5f9" }}>
            {hasFile ? <CheckCircle className="w-5 h-5" style={{ color: "var(--coral)" }} /> : <Upload className="w-5 h-5" style={{ color: "var(--muted)" }} />}
          </div>
          <div className="text-left flex-1">
            <p className="text-[13px] font-medium" style={{ color: hasFile ? "var(--coral)" : "var(--navy)" }}>
              {hasFile ? fileName : "Click to upload your resume"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              {hasFile ? "File selected" : "PDF or DOCX supported"}
            </p>
          </div>
        </button>
      </div>

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Base Resume Text</label>
        <Textarea value={form.baseResumeText} onChange={(e) => setForm({...form, baseResumeText: e.target.value})} placeholder="Paste your resume content here..." className="min-h-[150px] rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }} />
        <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Paste the full text of your resume for AI optimization</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="btn-primary w-full justify-center"
        style={{ height: "44px" }}
      >
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Profile...</> : <><Sparkles className="w-4 h-4 mr-2" />Create Profile</>}
      </button>
    </div>
  );
}
