"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sparkles, AlertCircle, UserPlus, CheckCircle, ShieldAlert,
  ArrowRight, ArrowLeft, Eye, EyeOff, Check, X as XIcon, Loader2
} from "lucide-react";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const registrationSchema = z.object({
  first_name: z.string().regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Letters, spaces, hyphens, and apostrophes only"),
  last_name: z.string().regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Letters, spaces, hyphens, and apostrophes only"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Must be a 10-digit Indian mobile number starting with 6–9"),
  dob: z.string().min(1, "Date of birth is required"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Format: ABCDE1234F (5 letters · 4 digits · 1 letter)"),
  aadhaar_number: z.string()
    .regex(/^[2-9]\d{11}$/, "12-digit number, cannot start with 0 or 1"),
  branch_id: z.string().min(1, "Please select a branch"),
  account_type: z.enum(["savings", "current"]),
  account_category: z.string().min(1, "Please select an account category"),
  username: z.string().min(5, "Username must be at least 5 characters"),
  password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[0-9]/, "At least one number")
    .regex(/[^A-Za-z0-9]/, "At least one special character"),
  confirm_password: z.string()
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

// ─── Helper: Field status icon ─────────────────────────────────────────────────
function FieldStatus({ valid, show }: { valid: boolean; show: boolean }) {
  if (!show) return null;
  return valid
    ? <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
    : <XIcon className="w-4 h-4 text-red-400 absolute right-3 top-1/2 -translate-y-1/2" />;
}

// ─── Helper: Password Strength Meter ──────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min. 8 characters", ok: password.length >= 8 },
    { label: "Uppercase letter (A–Z)", ok: /[A-Z]/.test(password) },
    { label: "Number (0–9)", ok: /[0-9]/.test(password) },
    { label: "Special character (!@#…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const strengthLabel = ["", "Weak", "Fair", "Strong", "Very Strong"][score];
  const barColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][score];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColor : "bg-slate-700"}`} />
        ))}
        <span className={`text-[10px] font-bold ml-1 ${barColor.replace("bg-", "text-")}`}>{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {checks.map((c) => (
          <div key={c.label} className={`flex items-center gap-1 text-[10px] ${c.ok ? "text-emerald-400" : "text-slate-500"}`}>
            {c.ok ? <Check className="w-2.5 h-2.5" /> : <XIcon className="w-2.5 h-2.5" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helper: Age Badge ─────────────────────────────────────────────────────────
function AgeBadge({ dob }: { dob: string }) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  if (isNaN(age) || age < 0 || age > 130) return null;
  const eligible = age >= 18;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 ${eligible ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
      Age: {age} {eligible ? "✓ Eligible" : "✗ Must be 18+"}
    </span>
  );
}

// ─── Helper: PAN Format Guide ─────────────────────────────────────────────────
function PanGuide({ value }: { value: string }) {
  const segments = [
    { chars: value.slice(0, 5), label: "5 Letters", valid: /^[A-Z]{5}$/.test(value.slice(0, 5)) },
    { chars: value.slice(5, 9), label: "4 Digits", valid: /^\d{4}$/.test(value.slice(5, 9)) },
    { chars: value.slice(9, 10), label: "1 Letter", valid: /^[A-Z]$/.test(value.slice(9, 10)) },
  ];
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      {segments.map((s, i) => (
        <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${s.valid ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-slate-600 text-slate-500 bg-slate-800/50"}`}>
          {s.chars || s.label}
        </span>
      ))}
    </div>
  );
}

// ─── Register Page ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{ branch_id: number; ifsc_code: string; branch_name: string; city: string }[]>([]);

  // Extra local state for smart fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aadhaarRaw, setAadhaarRaw] = useState("");          // raw 12 digits
  const [aadhaarVisible, setAadhaarVisible] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const {
    register, handleSubmit, trigger, watch, setValue,
    formState: { errors }
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: { account_type: "savings" }
  });

  const account_type = watch("account_type");
  const account_category = watch("account_category");
  const passwordVal = watch("password") || "";
  const firstNameVal = watch("first_name") || "";
  const lastNameVal = watch("last_name") || "";
  const emailVal = watch("email") || "";
  const phoneVal = watch("phone") || "";
  const panVal = watch("pan_number") || "";
  const dobVal = watch("dob") || "";
  const addressVal = watch("address") || "";
  const usernameVal = watch("username") || "";

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(console.error);
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (usernameVal.length < 5) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/check-username/${usernameVal}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [usernameVal]);

  // Sync Aadhaar raw input → form field
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaarRaw(raw);
    setValue("aadhaar_number", raw, { shouldValidate: true });
  };

  const formatAadhaar = (raw: string) =>
    raw.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));

  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) isValid = await trigger(["first_name", "last_name", "email", "phone", "dob", "address", "pan_number", "aadhaar_number"]);
    else if (step === 2) isValid = await trigger(["branch_id", "account_type", "account_category"]);
    if (isValid) setStep(step + 1);
  };

  const getMinBalanceDisplay = () => {
    if (account_type === "savings") {
      if (account_category === "Senior Citizen") return "₹2,500";
      if (account_category === "Salary") return "₹0 (Zero Balance)";
      if (account_category === "Regular") return "₹5,000";
    }
    if (account_type === "current") {
      if (account_category === "Premium") return "₹0 · OD Limit: ₹50,000";
      if (account_category === "Regular") return "₹10,000";
    }
    return "Select a category";
  };

  const onSubmit = async (data: RegistrationFormValues) => {
    if (usernameStatus === "taken") { setServerError("Username is already taken. Please choose another."); return; }
    setServerError(null);
    setLoading(true);
    try {
      const payload = { ...data, branch_id: Number(data.branch_id) };
      const res = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.detail || "Registration failed.");
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-9 transition";

  return (
    <div className="min-h-screen flex text-white bg-[#0b0f19] overflow-hidden relative">
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full flex">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative z-10 border-r border-slate-800 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white">Nexus Bank</div>
              <div className="text-xs tracking-widest uppercase text-slate-400 font-medium">Secure Net Banking</div>
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-6">Open your digital account instantly.</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Experience next-level enterprise banking. Your KYC details are routed directly to our banking staff for real-time verification.
            </p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 flex flex-col justify-center relative z-10 overflow-y-auto max-h-screen">
          <div className="max-w-xl w-full mx-auto">
            <button onClick={() => router.push("/")} className="text-slate-500 hover:text-white transition text-sm mb-6 flex items-center gap-1">
              ← Back to Platform
            </button>

            {success ? (
              <div className="glass-card p-8 border-t-2 border-t-emerald-500 animate-in zoom-in duration-500 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold">Application Received</h2>
                <p className="text-slate-400 text-sm">Your account is in <span className="text-amber-400 font-bold font-mono">KYC: PENDING</span> status until a branch officer verifies your details. Redirecting to login…</p>
              </div>
            ) : (
              <div className="glass-card p-7 border-t-2 border-t-indigo-500">
                <div className="flex items-center gap-3 mb-5">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-xl font-bold">Account Registration</h2>
                </div>

                {/* Step Progress */}
                <div className="flex gap-2 mb-7">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? "bg-indigo-500" : "bg-slate-800"}`} />
                  ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                  {/* ── STEP 1: Identity & KYC ────────────────────────────────── */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-semibold text-xs uppercase tracking-wide mb-4">Step 1 of 3 · Identity & KYC Details</h3>

                      {/* Names */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">First Name</label>
                          <div className="relative">
                            <input {...register("first_name")} className={inputBase} placeholder="e.g Ramesh" />
                            <FieldStatus valid={!errors.first_name && firstNameVal.length > 0} show={firstNameVal.length > 0} />
                          </div>
                          {errors.first_name && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.first_name.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Last Name</label>
                          <div className="relative">
                            <input {...register("last_name")} className={inputBase} placeholder="e.g. Sharma" />
                            <FieldStatus valid={!errors.last_name && lastNameVal.length > 0} show={lastNameVal.length > 0} />
                          </div>
                          {errors.last_name && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.last_name.message}</p>}
                        </div>
                      </div>

                      {/* PAN & Aadhaar */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">PAN Card</label>
                          <div className="relative">
                            <input
                              {...register("pan_number")}
                              className={`${inputBase} uppercase`}
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              onChange={(e) => { e.target.value = e.target.value.toUpperCase(); register("pan_number").onChange(e); }}
                            />
                            <FieldStatus valid={!errors.pan_number && panVal.length === 10} show={panVal.length > 0} />
                          </div>
                          <PanGuide value={panVal} />
                          {errors.pan_number && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.pan_number.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Aadhaar UIDAI</label>
                          <div className="relative">
                            <input
                              type={aadhaarVisible ? "text" : "password"}
                              value={aadhaarVisible ? formatAadhaar(aadhaarRaw) : aadhaarRaw.replace(/./g, "•").replace(/(.{4})/g, "$1 ").trim()}
                              onChange={handleAadhaarChange}
                              className={`${inputBase} font-mono tracking-widest`}
                              placeholder="XXXX XXXX XXXX"
                              inputMode="numeric"
                            />
                            <button type="button" onClick={() => setAadhaarVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                              {aadhaarVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1">{aadhaarRaw.length}/12 digits</p>
                          {errors.aadhaar_number && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.aadhaar_number.message}</p>}
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Email Address</label>
                        <div className="relative">
                          <input {...register("email")} type="email" className={inputBase} placeholder="you@example.com" />
                          <FieldStatus valid={!errors.email && emailVal.includes("@")} show={emailVal.length > 0} />
                        </div>
                        {errors.email && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.email.message}</p>}
                      </div>

                      {/* Phone & DOB */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Mobile Number</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">+91</span>
                            <input {...register("phone")} type="tel" maxLength={10} inputMode="numeric" className={`${inputBase} pl-9`} placeholder="98765 43210" />
                            <FieldStatus valid={!errors.phone && /^[6-9]\d{9}$/.test(phoneVal)} show={phoneVal.length > 0} />
                          </div>
                          {errors.phone && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.phone.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5 flex items-center">
                            Date of Birth <AgeBadge dob={dobVal} />
                          </label>
                          <input {...register("dob")} type="date" max={new Date().toISOString().split("T")[0]} className={inputBase} />
                          {errors.dob && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.dob.message}</p>}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-semibold uppercase text-slate-400">Registered Address</label>
                          <span className={`text-[10px] font-mono ${addressVal.length >= 10 ? "text-emerald-400" : "text-slate-600"}`}>
                            {addressVal.length} / 10 min {addressVal.length >= 10 ? "✓" : ""}
                          </span>
                        </div>
                        <textarea {...register("address")} rows={2} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="House/Flat No., Street, City, State, PIN" />
                        {errors.address && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.address.message}</p>}
                      </div>

                      <button type="button" onClick={handleNextStep} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 mt-2">
                        Continue to Branch Selection <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* ── STEP 2: Account & Branch ──────────────────────────────── */}
                  {step === 2 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-semibold text-xs uppercase tracking-wide mb-4">Step 2 of 3 · Account & Branch Setup</h3>

                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Home Branch</label>
                        <select {...register("branch_id")} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">-- Select Branch --</option>
                          {branches.map((b) => (
                            <option key={b.branch_id} value={b.branch_id} className="bg-slate-900">
                              {b.branch_name} · {b.city} · {b.ifsc_code}
                            </option>
                          ))}
                        </select>
                        {errors.branch_id && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.branch_id.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Account Type</label>
                          <select {...register("account_type")} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="savings">Savings Account</option>
                            <option value="current">Current (Business)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Category</label>
                          <select {...register("account_category")} className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Select --</option>
                            {account_type === "savings" ? (
                              <>
                                <option value="Regular">Regular Savings</option>
                                <option value="Salary">Salary Account</option>
                                <option value="Senior Citizen">Senior Citizen (60+)</option>
                              </>
                            ) : (
                              <>
                                <option value="Regular">Regular Current</option>
                                <option value="Premium">Premium Current</option>
                              </>
                            )}
                          </select>
                          {errors.account_category && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.account_category.message}</p>}
                        </div>
                      </div>

                      {account_category && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                          <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold mb-1">Minimum Balance / AMB Requirement</p>
                          <p className="text-xl font-bold text-white mb-1">{getMinBalanceDisplay()}</p>
                          {account_category === "Salary" && <p className="text-[11px] text-slate-400">Zero balance account. Valid employer letter required.</p>}
                          {account_category === "Senior Citizen" && <p className="text-[11px] text-slate-400">Discounted AMB. Age proof required at branch.</p>}
                          {account_type === "current" && <p className="text-[11px] text-slate-400">Business registration documents required by branch.</p>}
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNextStep} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2">
                          Set Up Login <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Security Credentials ─────────────────────────── */}
                  {step === 3 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-semibold text-xs uppercase tracking-wide mb-4">Step 3 of 3 · Internet Banking Setup</h3>

                      {/* Username with availability check */}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Username</label>
                        <div className="relative">
                          <input {...register("username")} className={`${inputBase} pr-24`} placeholder="min. 5 characters" autoComplete="off" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {usernameStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                            {usernameStatus === "available" && <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" />Available</span>}
                            {usernameStatus === "taken" && <span className="text-[10px] text-red-400 font-bold flex items-center gap-1"><XIcon className="w-3 h-3" />Taken</span>}
                          </div>
                        </div>
                        {errors.username && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.username.message}</p>}
                      </div>

                      {/* Password with strength meter */}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Password</label>
                        <div className="relative">
                          <input {...register("password")} type={showPassword ? "text" : "password"} className={inputBase} placeholder="Create a strong password" />
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={passwordVal} />
                        {errors.password && !passwordVal && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.password.message}</p>}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <input {...register("confirm_password")} type={showConfirmPassword ? "text" : "password"} className={inputBase} placeholder="Re-enter password" />
                          <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.confirm_password && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{errors.confirm_password.message}</p>}
                      </div>

                      {serverError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>{serverError}</p>
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading || usernameStatus === "taken"}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Complete Registration"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
