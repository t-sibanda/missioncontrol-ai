import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Briefcase, Search, Filter, ExternalLink, Star, CheckCircle, X, MapPin, Calendar, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router";

const statusStyles: Record<string, { bg: string; text: string }> = {
  new: { bg: "#ffedd5", text: "#9a3412" },
  matched: { bg: "#d1fae5", text: "#065f46" },
  reviewing: { bg: "#fef3c7", text: "#92400e" },
  applied: { bg: "#dbeafe", text: "#1e40af" },
  interview: { bg: "#ede9fe", text: "#5b21b6" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  ghosted: { bg: "#f1f5f9", text: "#475569" },
  saved: { bg: "#fce7f3", text: "#9d174d" },
};

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const utils = trpc.useUtils();
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery({ search: search || undefined, status: statusFilter || undefined, sourceType: sourceFilter || undefined, limit: 50 });
  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => { utils.jobs.list.invalidate(); toast.success("Status updated"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Browse, filter, and manage job postings</p>
        </div>
        <Link to="/scraper" className="btn-primary">
          <Building2 className="w-4 h-4" /> Scrape More
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <Input placeholder="Search jobs by title, description..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-lg h-10 border" style={{ background: "var(--white)", borderColor: "var(--border-light)" }} />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-lg h-10 border" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
              <SelectItem value="">All Status</SelectItem>
              {["new","matched","reviewing","applied","saved","interview","rejected"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] rounded-lg h-10 border" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}><Building2 className="w-3.5 h-3.5 mr-1.5" /><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
              <SelectItem value="">All Sources</SelectItem>
              {["greenhouse","lever","workday","indeed","linkedin","manual"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(statusFilter || sourceFilter || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setSourceFilter(""); setSearch(""); }} className="h-10 w-10 p-0 rounded-lg" style={{ color: "var(--muted)" }}><X className="w-4 h-4" /></Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="card p-5 h-[120px] skeleton" />)}</div>
      ) : jobs && jobs.length > 0 ? (
        <div className="space-y-2 animate-fade-in stagger-2">
          {jobs.map((job) => {
            const style = statusStyles[job.status || "new"] || statusStyles.new;
            return (
              <div key={job.id} className="card card-hover p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ffedd5, #fef3c7)" }}>
                    <Briefcase className="w-5 h-5" style={{ color: "#FF6B35" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                          <span className="flex items-center gap-1 capitalize"><Building2 className="w-3 h-3" />{job.sourceType}</span>
                          {job.datePosted && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.datePosted).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2.5 py-1 rounded-full capitalize font-bold" style={{ background: style.bg, color: style.text }}>{job.status}</span>
                        <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[#faf8f5] transition-all" style={{ color: "var(--muted)" }}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    {job.description && <p className="text-[11px] mt-2 line-clamp-2" style={{ color: "var(--muted)" }}>{job.description.replace(/<[^>]*>/g, "")}</p>}
                    {job.parsedSkills && Array.isArray(job.parsedSkills) && job.parsedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(job.parsedSkills as string[]).slice(0, 8).map((skill) => <span key={skill} className="text-[10px] px-2 py-0.5 rounded-md border font-medium" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)", color: "var(--slate)" }}>{skill}</span>)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Select value={job.status || "new"} onValueChange={(val) => updateStatus.mutate({ id: job.id, status: val as any })}>
                        <SelectTrigger className="h-7 text-[11px] border w-auto rounded-lg" style={{ background: "var(--bg-input)", borderColor: "var(--border-light)" }}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl" style={{ background: "var(--white)", borderColor: "var(--border-light)" }}>
                          {["new","matched","reviewing","applied","saved","interview","rejected"].map(s => <SelectItem key={s} value={s} className="capitalize text-[12px]">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg" style={{ color: "var(--muted)" }} onClick={() => updateStatus.mutate({ id: job.id, status: "saved" })}><Star className="w-3 h-3 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg font-medium" style={{ color: "#059669" }} onClick={() => updateStatus.mutate({ id: job.id, status: "applied" })}><CheckCircle className="w-3 h-3 mr-1" />Applied</Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <Briefcase className="w-8 h-8" style={{ color: "#b45309" }} />
          </div>
          <p className="font-semibold text-[16px]" style={{ color: "var(--navy)" }}>No jobs found</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>{search || statusFilter || sourceFilter ? "Try adjusting your filters" : "Run a scraper to discover jobs"}</p>
          {!search && !statusFilter && !sourceFilter && <Link to="/scraper" className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold" style={{ color: "#FF6B35" }}>Go to Scraper <ArrowRight className="w-3 h-3"/></Link>}
        </div>
      )}
    </div>
  );
}
