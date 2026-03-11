import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Shield, Wallet, Mail, Loader2, User, Building2, CheckCircle, Award, Landmark, Building } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Signup = () => {
  const { signup, loginWithWallet, isLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CITIZEN");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill all fields"); return; }
    try {
      await signup(email, password, name, role);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch { toast.error("Signup failed"); }
  };

  const handleWallet = async () => {
    try {
      await loginWithWallet(role);
      toast.success("Wallet connected!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Wallet connection failed");
    }
  };

  const roles = [
    {
      id: "ISSUER_OFFICER" as UserRole,
      title: "Government Officer",
      desc: "Access federal and state credential issuing portals.",
      icon: Landmark
    },
    {
      id: "APPROVER" as UserRole,
      title: "University / Approver",
      desc: "Manage student records and verified degree certificates.",
      icon: Building
    },
    {
      id: "ADMIN" as UserRole,
      title: "Verifier (Bank/Employer)",
      desc: "Instantly verify citizen credentials via secure API.",
      icon: Shield
    },
    {
      id: "CITIZEN" as UserRole,
      title: "Citizen",
      desc: "Securely store and share your verifiable IDs.",
      icon: User
    }
  ];

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row font-display bg-background-light dark:bg-slate-950">
      {/* LEFT PANEL */}
      <div className="relative w-full lg:w-[40%] bg-slate-900 border-r border-slate-800 p-8 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='%2300c49a' fill-rule='evenodd'/%3E%3C/svg%3E\")" }}></div>
        
        {/* Content */}
        <div className="relative z-10 space-y-12">
          <Link to="/" className="flex items-center gap-3">
            <img src="/credora-high-resolution-logo-transparent.png" alt="Credora" className="h-8 logo-filter invert brightness-0 pb-1" />
          </Link>
          <div className="space-y-6">
            <h2 className="text-white text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Securing India's Credentials on the Blockchain
            </h2>
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-teal-500 w-6 h-6 mt-1" />
                <div>
                  <p className="text-white font-bold">Hyperledger Fabric</p>
                  <p className="text-slate-400 text-sm">Enterprise-grade permissioned infrastructure.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-teal-500 w-6 h-6 mt-1" />
                <div>
                  <p className="text-white font-bold">Zero-Knowledge Privacy</p>
                  <p className="text-slate-400 text-sm">Secure data sovereignty with ZK-proofs.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-teal-500 w-6 h-6 mt-1" />
                <div>
                  <p className="text-white font-bold">Government Aligned</p>
                  <p className="text-slate-400 text-sm">Compliant with MeitY, UGC, and DigiLocker.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer Badge */}
        <div className="relative z-10 pt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full text-xs font-bold text-teal-400 tracking-widest uppercase">
            <Award className="w-4 h-4" />
            Blockchain India Challenge 2024
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[60%] bg-slate-50 dark:bg-slate-950 p-8 lg:px-24 lg:py-16 overflow-y-auto flexbox flex-col">
        <div className="max-w-2xl mx-auto space-y-10 w-full mt-auto mb-auto">
          <div className="flex justify-between items-center mt-4">
            <h2 className="text-slate-900 dark:text-white font-bold text-3xl">Create Your Account</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Already registered? <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Login</Link></p>
          </div>
          
          {/* Role Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <div 
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "relative p-5 border-2 rounded-xl cursor-pointer transition-all",
                    isSelected 
                      ? "bg-teal-500/5 border-teal-500" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-teal-500 text-white rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={cn("w-6 h-6", isSelected ? "text-teal-500" : "text-slate-400")} />
                    <h3 className={cn("font-bold text-sm tracking-tight uppercase", isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{r.title}</h3>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                <Input value={name} onChange={e => setName(e.target.value)} className="w-full pl-12 pr-4 py-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Full Name" type="text" />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                <Input value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Email Address" type="email" />
              </div>
              <div className="relative">
                <Building2 className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                <Input value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Password (••••••••)" type="password" />
              </div>
            </div>

            {/* Web3 Connect */}
            <div className="pt-4">
              <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-4 text-center">Or Connect Your Wallet</p>
              <div className="flex gap-4">
                <button disabled={isLoading} onClick={handleWallet} className="flex-1 flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-slate-700 dark:text-slate-200 text-sm disabled:opacity-50" type="button">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img className="w-5 h-5" alt="MetaMask Logo" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"/>}
                  MetaMask
                </button>
              </div>
            </div>

            {/* CTA */}
            <button disabled={isLoading} type="submit" className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>⬡</span>} Create My Credora Identity
            </button>
          </form>

          {/* Trust Footer */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-slate-200 dark:border-slate-800 opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold tracking-tighter text-slate-600 dark:text-slate-400 uppercase">Hyperledger Fabric</span>
            </div>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold tracking-tighter text-slate-600 dark:text-slate-400 uppercase">MeitY Aligned</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold tracking-tighter text-slate-600 dark:text-slate-400 uppercase">ZK Privacy Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
