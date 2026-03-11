import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Shield, Mail, Loader2, User, Building2, CheckCircle, Award, Landmark, Building, CreditCard, IdCard, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  {
    id: "ISSUER_OFFICER" as UserRole,
    title: "Government Officer",
    desc: "Issue & manage national credential infrastructure.",
    icon: Landmark,
    fields: [
      { name: "employeeId",       label: "Employee / Badge ID",   placeholder: "GOV-2024-XXXX",    icon: IdCard     },
      { name: "department",       label: "Department / Ministry", placeholder: "Ministry of Education", icon: Building2  },
      { name: "organizationName", label: "Government Body Name",  placeholder: "e.g. NIC, MeitY",  icon: Landmark   },
    ]
  },
  {
    id: "APPROVER" as UserRole,
    title: "University / Approver",
    desc: "Issue verified degree certificates and approve records.",
    icon: Building,
    fields: [
      { name: "organizationName", label: "University / Institution Name", placeholder: "e.g. IIT Madras", icon: Building   },
      { name: "registrarId",      label: "Registrar / Staff ID",          placeholder: "REG-0001",        icon: IdCard     },
      { name: "licenseNumber",    label: "UGC / NAAC License No.",        placeholder: "UGC-XXXXXX",     icon: CreditCard },
    ]
  },
  {
    id: "ADMIN" as UserRole,
    title: "Verifier (Bank / Employer)",
    desc: "Instantly verify citizen credentials via secure API.",
    icon: Shield,
    fields: [
      { name: "organizationName", label: "Company / Bank Name",  placeholder: "e.g. HDFC Bank",   icon: Building2  },
      { name: "companyId",        label: "Company / CIN Number", placeholder: "CIN-XXXXXXXXXX",   icon: CreditCard },
      { name: "website",          label: "Official Website",     placeholder: "https://company.in", icon: Globe     },
    ]
  },
  {
    id: "CITIZEN" as UserRole,
    title: "Citizen",
    desc: "Securely store and share your verifiable identity.",
    icon: User,
    fields: []
  }
];

const Signup = () => {
  const { signup, loginWithWallet, isLoading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>("CITIZEN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const currentRole = ROLES.find(r => r.id === role)!;

  const setExtra = (key: string, val: string) =>
    setExtraFields(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill Full Name, Email & Password"); return; }
    try {
      await signup(email, password, name, role, extraFields);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    }
  };

  const handleWallet = async () => {
    try {
      await loginWithWallet(role, { name, ...extraFields });
      toast.success("Wallet connected!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Wallet connection failed");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-950">
      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className="relative w-full lg:w-[40%] bg-slate-900 border-r border-slate-800 p-8 lg:p-16 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='%2300c49a' fill-rule='evenodd'/%3E%3C/svg%3E\")" }}/>

        <div className="relative z-10 space-y-12">
          <Link to="/" className="flex items-center gap-3">
            <img src="/credora-high-resolution-logo-transparent.png" alt="Credora" className="h-8 logo-filter" />
          </Link>
          <div className="space-y-6">
            <h2 className="text-white text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Securing India's Credentials on the Blockchain
            </h2>
            <div className="space-y-4 pt-4">
              {[
                { title: "Hyperledger Fabric",      desc: "Enterprise-grade permissioned infrastructure." },
                { title: "Zero-Knowledge Privacy",  desc: "Secure data sovereignty with ZK-proofs." },
                { title: "Government Aligned",      desc: "Compliant with MeitY, UGC, and DigiLocker." },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4">
                  <CheckCircle className="text-teal-500 w-6 h-6 mt-1 shrink-0" />
                  <div>
                    <p className="text-white font-bold">{item.title}</p>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full text-xs font-bold text-teal-400 tracking-widest uppercase">
            <Award className="w-4 h-4" />
            Blockchain India Challenge 2024
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[60%] bg-slate-50 p-8 lg:px-24 lg:py-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8 w-full">

          {/* Header */}
          <div className="flex justify-between items-center mt-4">
            <h2 className="text-slate-900 font-bold text-3xl">Create Your Account</h2>
            <p className="text-slate-500 text-sm">
              Already registered?{" "}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">Login</Link>
            </p>
          </div>

          {/* ── Role Selector ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map(r => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => { setRole(r.id); setExtraFields({}); }}
                  className={cn(
                    "relative p-5 border-2 rounded-xl cursor-pointer transition-all",
                    isSelected
                      ? "bg-teal-500/5 border-teal-500"
                      : "bg-white border-slate-200 hover:border-blue-400"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-teal-500 text-white rounded-full p-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={cn("w-6 h-6 shrink-0", isSelected ? "text-teal-500" : "text-slate-400")} />
                    <h3 className={cn("font-bold text-sm tracking-tight uppercase", isSelected ? "text-slate-900" : "text-slate-700")}>
                      {r.title}
                    </h3>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Common fields */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Personal Information
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <Input value={name} onChange={e => setName(e.target.value)}
                  className="pl-12 py-6 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400"
                  placeholder="Full Name" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-12 py-6 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400"
                  placeholder="Email Address" required />
              </div>
              <div className="relative">
                <Shield className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-12 py-6 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400"
                  placeholder="Password (min 8 characters)" required />
              </div>
            </div>

            {/* Role-specific fields */}
            {currentRole.fields.length > 0 && (
              <div className="space-y-4 pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {currentRole.title} Details
                </label>
                {currentRole.fields.map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.name} className="relative">
                      <Icon className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                      <Input
                        value={extraFields[f.name] || ""}
                        onChange={e => setExtra(f.name, e.target.value)}
                        className="pl-12 py-6 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400"
                        placeholder={f.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* MetaMask connect section */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-3 text-center">Or Connect Your Wallet</p>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleWallet}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all font-semibold text-slate-700 text-sm disabled:opacity-50"
              >
                {isLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <img className="w-6 h-6" alt="MetaMask" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" />
                }
                Connect with MetaMask
              </button>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>⬡</span>}
              Create My Credora Identity
            </button>
          </form>

          {/* Trust Footer */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-slate-200 opacity-50">
            {[
              { icon: Shield,    label: "Hyperledger Fabric"   },
              { icon: Landmark,  label: "MeitY Aligned"        },
              { icon: CheckCircle, label: "ZK Privacy"         },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[10px] font-bold tracking-tighter text-slate-600 uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
