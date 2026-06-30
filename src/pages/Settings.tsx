import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Target, Mail, Bell, Sliders, Save, Loader2, Shield, Star, Cloud, Database, Sparkles, Users, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: preferences } = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const upsert = trpc.preferences.upsert.useMutation({ onSuccess: () => { utils.preferences.get.invalidate(); toast.success("Saved"); }, onError: (err) => toast.error(err.message) });
  const { data: emailStatus } = trpc.email.status.useQuery(undefined, { retry: false, enabled: isAuthenticated });

  // Networking assistant state
  const [netTargetRole, setNetTargetRole] = useState("");
  const [netTargetCompany, setNetTargetCompany] = useState("");
  const [netBackground, setNetBackground] = useState("");
  const [netPurpose, setNetPurpose] = useState("");
  const [netType, setNetType] = useState<"linkedin_connection" | "informational_interview" | "warm_intro">("linkedin_connection");
  const [netResult, setNetResult] = useState<string | null>(null);
  const [isNetLoading, setIsNetLoading] = useState(false);
  const networkingMut = trpc.ai.networkingMessage.useMutation();

  const handleNetworking = async () => {
    if (!netTargetRole.trim() || !netTargetCompany.trim() || !netBackground.trim() || !netPurpose.trim()) {
      toast.error("Fill in all fields"); return;
    }
    setIsNetLoading(true);
    setNetResult(null);
    try {
      const res = await networkingMut.mutateAsync({ targetRole: netTargetRole, targetCompany: netTargetCompany, userBackground: netBackground, purpose: netPurpose, messageType: netType });
      if (res.success && res.content) setNetResult(res.content);
      else toast.error(res.error || "Failed to generate message");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setIsNetLoading(false);
  };

  const [form, setForm] = useState({ desiredTitles: "", locations: "", salaryMin: "", remotePreference: "any" as "remote"|"hybrid"|"onsite"|"any", keywordsMustHave: "", keywordsExclude: "", companiesTier1: "", companiesTier2: "", companiesTier3: "", autoApplyThreshold: "90", emailForAlerts: "", alertFrequency: "daily" as "instant"|"daily"|"weekly", enableAutoApply: false, enableSemiAutoApply: true });

  useEffect(() => {
    if (preferences) {
      setForm({ desiredTitles: (preferences.desiredTitles as string[])?.join(", ") || "", locations: (preferences.locations as string[])?.join(", ") || "", salaryMin: preferences.salaryMin?.toString() || "", remotePreference: (preferences.remotePreference as "remote"|"hybrid"|"onsite"|"any") || "any", keywordsMustHave: (preferences.keywordsMustHave as string[])?.join(", ") || "", keywordsExclude: (preferences.keywordsExclude as string[])?.join(", ") || "", companiesTier1: (preferences.companiesTier1 as string[])?.join(", ") || "", companiesTier2: (preferences.companiesTier2 as string[])?.join(", ") || "", companiesTier3: (preferences.companiesTier3 as string[])?.join(", ") || "", autoApplyThreshold: preferences.autoApplyThreshold?.toString() || "90", emailForAlerts: preferences.emailForAlerts || "", alertFrequency: (preferences.alertFrequency as "instant"|"daily"|"weekly") || "daily", enableAutoApply: preferences.enableAutoApply ?? false, enableSemiAutoApply: preferences.enableSemiAutoApply ?? true });
    }
  }, [preferences]);

  const handleSave = () => {
    upsert.mutate({ desiredTitles: split(form.desiredTitles), locations: split(form.locations), salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined, remotePreference: form.remotePreference, keywordsMustHave: split(form.keywordsMustHave), keywordsExclude: split(form.keywordsExclude), companiesTier1: split(form.companiesTier1), companiesTier2: split(form.companiesTier2), companiesTier3: split(form.companiesTier3), autoApplyThreshold: form.autoApplyThreshold, emailForAlerts: form.emailForAlerts || undefined, alertFrequency: form.alertFrequency, enableAutoApply: form.enableAutoApply, enableSemiAutoApply: form.enableSemiAutoApply });
  };

  if (!isAuthenticated) return (
    <div className="card p-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
        <Shield className="w-8 h-8" style={{ color: "#b45309" }} />
      </div>
      <p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>Sign in to manage preferences</p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your job search preferences and automation</p>
      </div>

      {/* Cloud status */}
      <div className="card p-4 flex items-center gap-3 animate-fade-in stagger-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #d1fae5, #ecfdf5)" }}><Cloud className="w-5 h-5" style={{ color: "#047857" }} /></div>
        <div className="flex-1"><p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--navy)" }}><Database className="w-3.5 h-3.5" style={{ color: "#047857" }} /> Cloud Backup Active</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>All data synced to cloud database automatically</p></div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "#047857" }}><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live</div>
      </div>

      {/* Email status */}
      {emailStatus && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}><Mail className="w-5 h-5" style={{ color: "#2563eb" }} /></div>
          <div className="flex-1"><p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Email Queue</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{emailStatus.queued} emails queued</p></div>
        </div>
      )}

      <Section icon={Target} title="Job Preferences" color="#FF6B35" bg="linear-gradient(135deg, #ffedd5, #fef3c7)">
        <Field label="Desired Job Titles" value={form.desiredTitles} onChange={(v) => setForm({...form, desiredTitles: v})} placeholder="Data Center Engineer, Facilities Manager" />
        <Field label="Preferred Locations" value={form.locations} onChange={(v) => setForm({...form, locations: v})} placeholder="Remote, San Francisco, New York" />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Minimum Salary</label><Input type="number" value={form.salaryMin} onChange={(e) => setForm({...form, salaryMin: e.target.value})} placeholder="150000" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Remote Preference</label>
            <Select value={form.remotePreference} onValueChange={(v) => setForm({...form, remotePreference: v as any})}>
              <SelectTrigger className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>{["any","remote","hybrid","onsite"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Field label="Must-Have Keywords" value={form.keywordsMustHave} onChange={(v) => setForm({...form, keywordsMustHave: v})} placeholder="data center, commissioning" />
        <Field label="Exclude Keywords" value={form.keywordsExclude} onChange={(v) => setForm({...form, keywordsExclude: v})} placeholder="entry level, intern" />
      </Section>

      <Section icon={Star} title="Target Companies" color="#b45309" bg="linear-gradient(135deg, #fef3c7, #fde68a)">
        <TierField label="Tier 1 - Dream Companies" color="#b45309" value={form.companiesTier1} onChange={(v) => setForm({...form, companiesTier1: v})} placeholder="OpenAI, NVIDIA, Anthropic" />
        <TierField label="Tier 2 - Strong Fit" color="#2563eb" value={form.companiesTier2} onChange={(v) => setForm({...form, companiesTier2: v})} placeholder="CoreWeave, Nebius, Scale AI" />
        <TierField label="Tier 3 - Backup" color="#64748b" value={form.companiesTier3} onChange={(v) => setForm({...form, companiesTier3: v})} placeholder="Turner, DPR, Mortenson" />
      </Section>

      <Section icon={Sliders} title="Automation" color="#7c3aed" bg="linear-gradient(135deg, #ede9fe, #f3e8ff)">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Auto-Apply Threshold (%)</label><Input type="number" min="0" max="100" value={form.autoApplyThreshold} onChange={(e) => setForm({...form, autoApplyThreshold: e.target.value})} className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>
          <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Alert Frequency</label>
            <Select value={form.alertFrequency} onValueChange={(v) => setForm({...form, alertFrequency: v as any})}>
              <SelectTrigger className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>{["instant","daily","weekly"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Toggle label="Enable Semi-Auto Apply" desc="Pre-fill applications for your review" value={form.enableSemiAutoApply} onChange={(v) => setForm({...form, enableSemiAutoApply: v})} />
        <Toggle label="Enable Full Auto-Apply" desc="Auto-submit above threshold (caution)" value={form.enableAutoApply} onChange={(v) => setForm({...form, enableAutoApply: v})} danger />
      </Section>

      <Section icon={Bell} title="Notifications" color="#047857" bg="linear-gradient(135deg, #d1fae5, #ecfdf5)">
        <div><label className="text-[11px] font-bold mb-1 flex items-center gap-1" style={{ color: "var(--muted)" }}><Mail className="w-3 h-3" /> Alert Email</label>
          <Input type="email" value={form.emailForAlerts} onChange={(e) => setForm({...form, emailForAlerts: e.target.value})} placeholder="your@email.com" className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
        </div>
      </Section>

      {/* Networking Assistant */}
      <Section icon={Users} title="Networking Assistant" color="#2563eb" bg="linear-gradient(135deg, #dbeafe, #e0e7ff)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Target's Role</label>
            <Input value={netTargetRole} onChange={(e) => setNetTargetRole(e.target.value)} placeholder="Engineering Manager" className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Target's Company</label>
            <Input value={netTargetCompany} onChange={(e) => setNetTargetCompany(e.target.value)} placeholder="OpenAI" className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Your Background (brief)</label>
          <Input value={netBackground} onChange={(e) => setNetBackground(e.target.value)} placeholder="Senior Engineer with 5 years in data infrastructure" className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
        </div>
        <div>
          <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Purpose of Outreach</label>
          <Input value={netPurpose} onChange={(e) => setNetPurpose(e.target.value)} placeholder="Learn about the team culture and open roles" className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
        </div>
        <div>
          <label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>Message Type</label>
          <Select value={netType} onValueChange={(v) => setNetType(v as typeof netType)}>
            <SelectTrigger className="h-9 rounded-lg border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
              <SelectItem value="linkedin_connection">LinkedIn Connection Request</SelectItem>
              <SelectItem value="informational_interview">Informational Interview Ask</SelectItem>
              <SelectItem value="warm_intro">Warm Intro Request Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNetworking} disabled={isNetLoading} className="w-full text-white font-semibold rounded-lg h-10" style={{ background: "#2563eb" }}>
          {isNetLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Send className="w-4 h-4 mr-2" />Generate Message</>}
        </Button>
        {netResult && (
          <div className="space-y-2">
            <div className="rounded-lg p-4 border whitespace-pre-wrap text-[13px] leading-relaxed" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{netResult}</div>
            <Button size="sm" variant="ghost" className="text-[12px] font-medium" style={{ color: "var(--muted)" }}
              onClick={() => { navigator.clipboard.writeText(netResult); toast.success("Copied"); }}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Message
            </Button>
          </div>
        )}
      </Section>

      <button onClick={handleSave} disabled={upsert.isPending} className="btn-primary w-full justify-center" style={{ height: "44px" }}>
        {upsert.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Preferences</>}
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, color, bg, children }: { icon: React.ElementType; title: string; color: string; bg: string; children: React.ReactNode }) {
  return <div className="card p-5 space-y-4"><h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}><Icon className="w-4 h-4" style={{ color }} /></div>{title}</h3>{children}</div>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div><label className="text-[11px] font-bold mb-1 block" style={{ color: "var(--muted)" }}>{label}</label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} /></div>;
}
function TierField({ label, color, value, onChange, placeholder }: { label: string; color: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div><label className="text-[11px] font-bold mb-1 block" style={{ color }}>{label}</label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-lg border text-[13px]" style={{ background: "var(--bg-input)", borderColor: color + "25" }} /></div>;
}
function Toggle({ label, desc, value, onChange, danger }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return <div className="flex items-center justify-between py-2"><div><p className={`text-[13px] font-semibold ${danger ? "text-red-600" : ""}`} style={{ color: danger ? undefined : "var(--navy)" }}>{label}</p><p className="text-[11px]" style={{ color: "var(--muted)" }}>{desc}</p></div><Switch checked={value} onCheckedChange={onChange} /></div>;
}
function split(v: string): string[] { return v.split(",").map(s => s.trim()).filter(Boolean); }
