import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const loginMut = trpc.localAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Welcome back!");
      window.location.href = "/";
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMut = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created! Signing you in...");
      loginMut.mutate({ username: email, password });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (mode === "signin") {
      loginMut.mutate({ username: email, password });
    } else {
      registerMut.mutate({
        username: email,
        password,
        displayName: name || email,
        email: email,
      });
    }
  };

  const isPending = loginMut.isPending || registerMut.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFFBF7 0%, #fff7ed 50%, #fef3c7 100%)" }}>
      <div className="w-full max-w-[400px] mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FF6B35, #FFB800)", boxShadow: "0 8px 24px rgba(255,107,53,0.25)" }}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold" style={{ color: "#0f1629" }}>MissionControl</h1>
          <p className="text-[13px] mt-1" style={{ color: "#94a3b8" }}>AI-Powered Job Hunt Platform</p>
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#f1f5f9", boxShadow: "0 8px 32px rgba(15,22,41,0.08)" }}>
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "#f8fafc" }}>
            <button onClick={() => setMode("signin")}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${mode === "signin" ? "text-white" : "text-[#94a3b8]"}`}
              style={{ background: mode === "signin" ? "linear-gradient(135deg, #FF6B35, #ff8c5a)" : "transparent" }}>
              Sign In
            </button>
            <button onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${mode === "signup" ? "text-white" : "text-[#94a3b8]"}`}
              style={{ background: mode === "signup" ? "linear-gradient(135deg, #FF6B35, #ff8c5a)" : "transparent" }}>
              Get Started
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#475569" }}>
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"
                  className="h-11 rounded-xl border text-[14px]" style={{ background: "#faf8f5", borderColor: "#e2e8f0" }} />
              </div>
            )}

            <div>
              <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#475569" }}>
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="h-11 rounded-xl border text-[14px]" style={{ background: "#faf8f5", borderColor: "#e2e8f0" }} required />
            </div>

            <div>
              <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#475569" }}>
                <Lock className="w-3.5 h-3.5" /> Password
              </label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className="h-11 rounded-xl border text-[14px]" style={{ background: "#faf8f5", borderColor: "#e2e8f0" }} required />
            </div>

            <button type="submit" disabled={isPending}
              className="w-full h-11 rounded-xl font-semibold text-[14px] text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #FF6B35, #ff8c5a)", boxShadow: "0 2px 8px rgba(255,107,53,0.25)" }}>
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Please wait...</>
                : <>{mode === "signin" ? "Sign In" : "Create Account"} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] mt-6" style={{ color: "#94a3b8" }}>
          Your data is securely stored and never shared.
        </p>
      </div>
    </div>
  );
}