"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, AlertCircle, UserPlus, CheckCircle, ShieldAlert, ArrowRight, ArrowLeft } from "lucide-react";

// Robust Zod Schema for Registration Constraints
const registrationSchema = z.object({
  first_name: z.string().regex(/^[A-Za-z]+$/, "First name must contain only letters"),
  last_name: z.string().regex(/^[A-Za-z]+$/, "Last name must contain only letters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  dob: z.string().min(1, "Date of birth is required"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN. Expected: ABCDE1234F"),
  aadhaar_number: z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  
  branch_id: z.string().min(1, "Please select a branch"),
  account_type: z.enum(["savings", "current"]),
  account_category: z.string().min(1, "Please select an account category"),

  username: z.string().min(5, "Username must be at least 5 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<{branch_id: number; ifsc_code: string; branch_name: string; city: string}[]>([]);

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: { account_type: "savings" }
  });

  const account_type = watch("account_type");
  const account_category = watch("account_category");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/branches")
      .then(res => res.json())
      .then(data => setBranches(data.branches || []))
      .catch(err => console.error("Failed to load branches", err));
  }, []);

  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["first_name", "last_name", "email", "phone", "dob", "address", "pan_number", "aadhaar_number"]);
    } else if (step === 2) {
      isValid = await trigger(["branch_id", "account_type", "account_category"]);
    }
    if (isValid) setStep(step + 1);
  };

  const getMinBalanceDisplay = () => {
    if (account_type === "savings") {
      if (account_category === "Senior Citizen") return "₹ 2,500";
      if (account_category === "Salary") return "₹ 0";
      if (account_category === "Regular") return "₹ 5,000";
    }
    if (account_type === "current") {
      if (account_category === "Premium") return "₹ 0 (OD Limit: ₹ 50K)";
      if (account_category === "Regular") return "₹ 10,000";
    }
    return "Select a category";
  };

  const onSubmit = async (data: RegistrationFormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      const payload = { ...data, branch_id: Number(data.branch_id) };
      const res = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.detail || "Registration failed.");

      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-white bg-[#0b0f19] overflow-hidden relative">
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full flex">
        {/* Left Side: Visual Panel */}
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative z-10 border-r border-slate-800 bg-slate-900/50">
           <div>
             <div className="flex items-center gap-2 mb-12">
               <div className="bg-brand-emerald/10 p-2 rounded-lg">
                 <Sparkles className="w-5 h-5 text-brand-emerald" />
               </div>
               <div className="text-xl font-bold text-white">Nexus Bank</div>
               <div className="text-xs tracking-widest uppercase text-slate-400 font-medium">Secure Net Banking Portal</div>
             </div>
             <h2 className="text-4xl font-bold leading-tight mb-6">
                Open your digital account instantly.
             </h2>
             <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                Experience next-level enterprise banking. Your KYC details are routed directly to our banking staff for real-time verification and secure onboarding.
             </p>
           </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-12 flex flex-col justify-center relative z-10 overflow-y-auto">
          <div className="max-w-xl w-full mx-auto">
            <button onClick={() => router.push('/')} className="text-slate-500 hover:text-white transition text-sm mb-8 flex items-center gap-1 font-medium">
              &larr; Back to Platform
            </button>

            {success ? (
               <div className="glass-card p-8 border-t-2 border-t-emerald-500 animate-in zoom-in duration-500 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                     <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Application Received</h2>
                  <p className="text-slate-400 text-sm">Your account setup is complete. You are in <span className="text-yellow-500 font-mono font-bold">KYC: PENDING</span> status until a branch officer verifies your Aadhaar/PAN details. Redirecting...</p>
               </div>
            ) : (
            <div className="glass-card p-8 border-t-2 border-t-indigo-500">
               <div className="flex items-center gap-3 mb-6">
                 <UserPlus className="w-6 h-6 text-indigo-400" />
                 <h2 className="text-2xl font-bold text-white">Account Registration</h2>
               </div>
               
               {/* Progress indicator */}
               <div className="flex gap-2 mb-8">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-indigo-500" : "bg-slate-800"}`} />
                  ))}
               </div>

               <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* STEP 1: IDENTITY & KYC */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-medium text-sm mb-4">Step 1: Identity & KYC Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">First Name</label>
                          <input {...register("first_name")} type="text" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                          {errors.first_name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.first_name.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Last Name</label>
                          <input {...register("last_name")} type="text" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                          {errors.last_name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.last_name.message}</p>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">PAN Number</label>
                          <input {...register("pan_number")} type="text" placeholder="e.g. ABCDE1234F" className="input-field border-slate-700 bg-slate-900/50 text-sm font-mono uppercase" />
                          {errors.pan_number && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.pan_number.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Aadhaar UIDAI</label>
                          <input {...register("aadhaar_number")} type="text" placeholder="12-digit number" className="input-field border-slate-700 bg-slate-900/50 text-sm font-mono" />
                          {errors.aadhaar_number && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.aadhaar_number.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Email</label>
                        <input {...register("email")} type="email" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                        {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.email.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Phone (10 Digits)</label>
                          <input {...register("phone")} type="tel" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                          {errors.phone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.phone.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Date of Birth</label>
                          <input {...register("dob")} type="date" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                          {errors.dob && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.dob.message}</p>}
                        </div>
                      </div>

                      <div>
                         <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Registered Address</label>
                         <textarea {...register("address")} className="input-field border-slate-700 bg-slate-900/50 h-16 resize-none text-sm" />
                         {errors.address && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.address.message}</p>}
                      </div>
                      
                      <button type="button" onClick={handleNextStep} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 mt-6">
                        Continue to Branch Selection <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* STEP 2: ACCOUNT SELECTION */}
                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-medium text-sm mb-4">Step 2: Account & Branch</h3>
                      
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Search Home Branch</label>
                        <div className="relative">
                          <select {...register("branch_id")} className="input-field border-slate-700 bg-slate-900/50 text-sm appearance-none cursor-pointer text-white">
                            <option value="">-- Choose Branch --</option>
                            {branches.map(b => (
                              <option key={b.branch_id} value={b.branch_id} className="bg-slate-900 text-white">
                                {b.branch_name} ({b.city}) — IFSC: {b.ifsc_code}
                              </option>
                            ))}
                          </select>
                        </div>
                        {errors.branch_id && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.branch_id.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Account Type</label>
                          <select {...register("account_type")} className="input-field border-slate-700 bg-slate-900/50 text-sm">
                            <option value="savings">Savings Account</option>
                            <option value="current">Current Account (Business)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Category</label>
                          <select {...register("account_category")} className="input-field border-slate-700 bg-slate-900/50 text-sm">
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
                          {errors.account_category && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.account_category.message}</p>}
                        </div>
                      </div>

                      {account_category && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                          <p className="text-xs text-indigo-300 font-medium uppercase tracking-wide mb-1">Required Min Balance / AMB</p>
                          <p className="text-xl font-bold text-white mb-2">{getMinBalanceDisplay()}</p>
                          {account_category === "Salary" && <p className="text-[11px] text-slate-400">Zero balance account. Valid employer required.</p>}
                          {account_category === "Senior Citizen" && <p className="text-[11px] text-slate-400">Discounted AMB. Age verification required by branch.</p>}
                          {account_type === "current" && <p className="text-[11px] text-slate-400">Business registration proof required by branch.</p>}
                        </div>
                      )}

                      <div className="flex gap-4 mt-6">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNextStep} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2">
                          Setup Digital Login <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SECURITY CREDENTIALS */}
                  {step === 3 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                      <h3 className="text-indigo-400 font-medium text-sm mb-4">Step 3: Internet Banking Setup</h3>
                      
                      <div>
                         <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Create Username</label>
                         <input {...register("username")} type="text" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                         {errors.username && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.username.message}</p>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Password</label>
                           <input {...register("password")} type="password" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                           {errors.password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.password.message}</p>}
                        </div>
                        <div>
                           <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Confirm Password</label>
                           <input {...register("confirm_password")} type="password" className="input-field border-slate-700 bg-slate-900/50 text-sm" />
                           {errors.confirm_password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> {errors.confirm_password.message}</p>}
                        </div>
                      </div>

                      {serverError && (
                         <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm animate-in shake">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-medium">{serverError}</p>
                         </div>
                      )}

                      <div className="flex gap-4 mt-6">
                        <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="submit" disabled={loading} className="w-2/3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50">
                           {loading ? "Submitting Application..." : "Complete Registration"}
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
