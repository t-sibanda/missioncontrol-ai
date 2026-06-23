import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  Building2, Plus, Search, Globe, Loader2, Trash2,
  Star, ExternalLink, X, Edit3, TrendingUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tierBadge: Record<string, { bg: string; text: string; label: string }> = {
  "1": { bg: "linear-gradient(135deg, #fef3c7, #fde68a)", text: "#78350f", label: "Tier 1" },
  "2": { bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)", text: "#1e3a5f", label: "Tier 2" },
  "3": { bg: "#f1f5f9", text: "#475569", label: "Tier 3" },
};

const PRESETS = [
  { n: "OpenAI", p: "greenhouse" as const, t: "1" as const },
  { n: "Anthropic", p: "greenhouse" as const, t: "1" as const },
  { n: "NVIDIA", p: "lever" as const, t: "1" as const },
  { n: "CoreWeave", p: "greenhouse" as const, t: "1" as const },
  { n: "Nebius", p: "greenhouse" as const, t: "1" as const },
  { n: "Crusoe", p: "greenhouse" as const, t: "2" as const },
  { n: "Scale AI", p: "greenhouse" as const, t: "2" as const },
  { n: "xAI", p: "greenhouse" as const, t: "1" as const },
  { n: "Google", p: "lever" as const, t: "1" as const },
  { n: "Stripe", p: "lever" as const, t: "2" as const },
];

export default function Companies() {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; atsPlatform: string; tier: string; careerPageUrl: string; website: string }>({ name: "", atsPlatform: "greenhouse", tier: "3", careerPageUrl: "", website: "" });

  const searchRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: companies, isLoading } = trpc.companies.list.useQuery(search ? { search } : undefined);
  const { data: suggestions } = trpc.suggestions.searchCompanies.useQuery(
    { query: search, limit: 8 },
    { enabled: search.length > 0 && showSuggestions }
  );

  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => { utils.companies.list.invalidate(); setIsAddOpen(false); resetForm(); toast.success("Company added"); },
    onError: (err) => toast.error(err.message),
  });

  const updateCompanyMut = trpc.companies.update.useMutation({
    onSuccess: () => { utils.companies.list.invalidate(); setIsEditOpen(false); setEditingId(null); resetForm(); toast.success("Company updated"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteCompany = trpc.companies.delete.useMutation({
    onSuccess: () => { utils.companies.list.invalidate(); toast.success("Company deleted"); },
    onError: (err) => toast.error(err.message),
  });

  const addPreset = trpc.companies.create.useMutation({
    onSuccess: () => { utils.companies.list.invalidate(); toast.success("Added"); },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const resetForm = () => setForm({ name: "", atsPlatform: "greenhouse", tier: "3", careerPageUrl: "", website: "" });

  const openEdit = (company: NonNullable<typeof companies>[0]) => {
    setEditingId(company.id);
    setForm({
      name: company.name,
      atsPlatform: (company.atsPlatform || "custom") as "greenhouse" | "lever" | "workday" | "custom",
      tier: (company.tier || "3") as "1" | "2" | "3",
      careerPageUrl: company.careerPageUrl || "",
      website: company.website || "",
    });
    setIsEditOpen(true);
  };

  const toMutationData = (f: typeof form) => ({
    name: f.name,
    atsPlatform: f.atsPlatform as "greenhouse" | "lever" | "workday" | "custom",
    tier: f.tier as "1" | "2" | "3",
    careerPageUrl: f.careerPageUrl || undefined,
    website: f.website || undefined,
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    createCompany.mutate(toMutationData(form));
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim()) { toast.error("Company name is required"); return; }
    updateCompanyMut.mutate({ id: editingId, data: toMutationData(form) });
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">Manage your target companies and career pages</p>
        </div>
        <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative animate-fade-in stagger-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <Input placeholder="Search companies or type to discover..." value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => search.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-10 rounded-lg h-10 border"
            style={{ background: "var(--white)", borderColor: "var(--border-light)" }}
          />
          {search && (
            <button onClick={() => { setSearch(""); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[#faf8f5]" style={{ color: "var(--muted)" }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showSuggestions && suggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden border shadow-lg" style={{ background: "var(--white)", borderColor: "var(--border-light)", boxShadow: "var(--card-shadow-hover)" }}>
            <div className="px-3 py-2 border-b text-[11px] font-bold uppercase tracking-[0.1em]" style={{ borderColor: "var(--border-light)", color: "var(--muted)" }}>
              Suggestions from Database
            </div>
            {suggestions.map((s) => (
              <button key={s.name} onClick={() => { setForm({ ...form, name: s.name, atsPlatform: s.atsPlatform as typeof form.atsPlatform, website: s.careerUrl }); setIsAddOpen(true); setShowSuggestions(false); setSearch(""); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf8f5] transition-colors text-left border-b last:border-0"
                style={{ borderColor: "var(--border-light)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
                  <Building2 className="w-4 h-4" style={{ color: "#FF6B35" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{s.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>{s.industry} · <span className="capitalize">{s.atsPlatform}</span></p>
                </div>
                <Plus className="w-4 h-4" style={{ color: "#FF6B35" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Presets */}
      {(!companies || companies.length === 0) && !isLoading && (
        <div className="card p-5 animate-fade-in stagger-2">
          <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--navy)" }}>
            <TrendingUp className="w-4 h-4" style={{ color: "#FF6B35" }} /> Quick Setup: AI & Tech Companies
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((c) => (
              <button key={c.n} onClick={() => addPreset.mutate({ name: c.n, atsPlatform: c.p, tier: c.t })}
                disabled={addPreset.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all hover:shadow-sm hover:border-[#FF6B3530]"
                style={{ background: "var(--white)", borderColor: "var(--border-light)", color: "var(--slate)" }}>
                <Plus className="w-3.5 h-3.5" style={{ color: "#FF6B35" }} /> {c.n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Count */}
      {companies && companies.length > 0 && (
        <p className="text-[12px] font-bold" style={{ color: "var(--muted)" }}>{companies.length} compan{companies.length === 1 ? "y" : "ies"}</p>
      )}

      {/* Company Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <div key={i} className="card p-5 h-[110px] skeleton" />)}
        </div>
      ) : companies && companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in stagger-2">
          {companies.map((company) => {
            const tier = tierBadge[company.tier || "3"];
            return (
              <div key={company.id} className="card card-hover p-5 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
                      <Building2 className="w-5 h-5" style={{ color: "#FF6B35" }} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>{company.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] capitalize font-medium" style={{ color: "var(--muted)" }}>{company.atsPlatform}</span>
                        {company.industry && <span className="text-[11px]" style={{ color: "var(--muted)" }}>· {company.industry}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ background: tier.bg, color: tier.text }}>
                    <Star className="w-2.5 h-2.5 inline mr-0.5" /> {tier.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-4 pt-3 border-t" style={{ borderColor: "var(--border-light)" }}>
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[#faf8f5] transition-all" style={{ color: "var(--muted)" }} onClick={(e) => e.stopPropagation()}>
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {company.careerPageUrl && (
                    <a href={company.careerPageUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[#faf8f5] transition-all" style={{ color: "var(--muted)" }} onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => openEdit(company)} className="p-2 rounded-lg hover:bg-[#faf8f5] opacity-0 group-hover:opacity-100 transition-all" style={{ color: "var(--muted)" }}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this company?")) deleteCompany.mutate({ id: company.id }); }}
                    className="p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" style={{ color: "var(--muted)" }}>
                    <Trash2 className="w-3.5 h-3.5 hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <Building2 className="w-8 h-8" style={{ color: "#b45309" }} />
          </div>
          <p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>No companies yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>Add your first company or use quick setup above</p>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-xl border-0 shadow-xl" style={{ background: "var(--white)", boxShadow: "var(--card-shadow-hover)" }}>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#FF6B35" }} />
              </div>
              Add Target Company
            </DialogTitle>
          </DialogHeader>
          <CompanyForm form={form} setForm={setForm} onSubmit={handleSubmit} isPending={createCompany.isPending} submitLabel="Add Company" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-xl border-0 shadow-xl" style={{ background: "var(--white)", boxShadow: "var(--card-shadow-hover)" }}>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dbeafe, #e0e7ff)" }}>
                <Edit3 className="w-4 h-4" style={{ color: "#2563eb" }} />
              </div>
              Edit Company
            </DialogTitle>
          </DialogHeader>
          <CompanyForm form={form} setForm={setForm} onSubmit={handleUpdate} isPending={updateCompanyMut.isPending} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyForm({ form, setForm, onSubmit, isPending, submitLabel }: {
  form: { name: string; atsPlatform: string; tier: string; careerPageUrl: string; website: string };
  setForm: (f: { name: string; atsPlatform: string; tier: string; careerPageUrl: string; website: string }) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Company Name *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="OpenAI"
          className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>ATS Platform</label>
          <Select value={form.atsPlatform} onValueChange={(v) => setForm({ ...form, atsPlatform: v as "greenhouse" | "lever" | "workday" | "custom" })}>
            <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl border" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
              <SelectItem value="greenhouse">Greenhouse</SelectItem>
              <SelectItem value="lever">Lever</SelectItem>
              <SelectItem value="workday">Workday</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Tier</label>
          <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v as "1" | "2" | "3" })}>
            <SelectTrigger className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl border" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
              <SelectItem value="1">Tier 1 (Dream)</SelectItem>
              <SelectItem value="2">Tier 2 (Strong)</SelectItem>
              <SelectItem value="3">Tier 3 (Backup)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Career Page URL</label>
        <Input value={form.careerPageUrl} onChange={(e) => setForm({ ...form, careerPageUrl: e.target.value })} placeholder="https://..."
          className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
      </div>
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--slate)" }}>Website</label>
        <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..."
          className="rounded-lg h-10 border" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }} />
      </div>
      <Button onClick={onSubmit} disabled={isPending || !form.name.trim()} className="w-full text-white font-semibold rounded-lg h-10" style={{ background: "var(--coral)" }}>
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : submitLabel}
      </Button>
    </div>
  );
}
