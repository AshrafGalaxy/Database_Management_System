"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronRight, ChevronLeft, ChevronDown, MapPin, Phone, HelpCircle,
  Tag, Shield, Search, Globe, CreditCard, TrendingUp, Briefcase, Calculator,
  ArrowRight, Star, CheckCircle, Smartphone, BarChart2, Landmark, Lock,
  Zap, Users, BadgeCheck, Wifi, ArrowUp
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slide { id: number; tag: string; title: string; sub: string; cta: string; accent: string; }
interface MegaItem { label: string; icon: React.ReactNode; desc: string; }
interface MegaSection { title: string; items: MegaItem[]; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const SLIDES: Slide[] = [
  { id: 1, tag: "Instant Approval", title: "Personal Loan\nUp to ₹40 Lakhs", sub: "Paperless. Digital. Disbursed in 4 hours to your account.", cta: "Check Eligibility", accent: "from-indigo-500 via-purple-500 to-pink-500" },
  { id: 2, tag: "High Yield Savings", title: "Earn 7.1%\nInterest Per Annum", sub: "India's highest guaranteed savings rate. DICGC insured up to ₹5 Lakhs.", cta: "Open Account", accent: "from-emerald-500 via-teal-500 to-cyan-500" },
  { id: 3, tag: "Festive Offer", title: "10% Cashback on\nAll Credit Cards", sub: "Valid on 1,500+ merchant partners. No minimum spend required this season.", cta: "Know More", accent: "from-amber-500 via-orange-500 to-rose-500" },
];

const RATES = [
  { term: "7-14 Days", rate: "3.50%" }, { term: "15-29 Days", rate: "4.00%" },
  { term: "30-45 Days", rate: "4.50%" }, { term: "46-90 Days", rate: "5.50%" },
  { term: "91-180 Days", rate: "6.25%" }, { term: "181-364 Days", rate: "6.75%" },
  { term: "1 Year", rate: "7.10%" }, { term: "2 Years", rate: "7.00%" },
  { term: "3 Years", rate: "6.90%" }, { term: "5 Years", rate: "6.50%" },
];

const MEGA_MENU: Record<string, MegaSection[]> = {
  "Personal Banking": [
    { title: "Accounts & Deposits", items: [
      { label: "Savings Account", icon: <Building2 className="w-4 h-4" />, desc: "7.1% p.a. interest, zero fees" },
      { label: "Current Account", icon: <Briefcase className="w-4 h-4" />, desc: "Unlimited transactions" },
      { label: "Fixed Deposits", icon: <Lock className="w-4 h-4" />, desc: "Up to 7.10% returns" },
    ]},
    { title: "Cards", items: [
      { label: "Debit Cards", icon: <CreditCard className="w-4 h-4" />, desc: "Contactless NFC enabled" },
      { label: "Credit Cards", icon: <CreditCard className="w-4 h-4" />, desc: "Up to 5% cashback" },
      { label: "Prepaid Cards", icon: <Wifi className="w-4 h-4" />, desc: "Travel & forex ready" },
    ]},
    { title: "Loans & Insurance", items: [
      { label: "Personal Loans", icon: <Zap className="w-4 h-4" />, desc: "₹40L in 4 hours" },
      { label: "Home Loans", icon: <Landmark className="w-4 h-4" />, desc: "From 8.40% p.a." },
      { label: "Life Insurance", icon: <Shield className="w-4 h-4" />, desc: "RBI regulated cover" },
    ]},
  ],
  "Corporate": [
    { title: "Business Banking", items: [
      { label: "Trade Finance", icon: <Globe className="w-4 h-4" />, desc: "LC, BG, SBLC services" },
      { label: "Cash Management", icon: <BarChart2 className="w-4 h-4" />, desc: "Sweeping & pooling" },
      { label: "MSME Loans", icon: <Briefcase className="w-4 h-4" />, desc: "Up to ₹5 Cr" },
    ]},
    { title: "Corporate Solutions", items: [
      { label: "Payroll Banking", icon: <Users className="w-4 h-4" />, desc: "Bulk disbursements" },
      { label: "Corporate FD", icon: <TrendingUp className="w-4 h-4" />, desc: "Higher yield rates" },
      { label: "Tax & GST", icon: <BadgeCheck className="w-4 h-4" />, desc: "Integrated filing" },
    ]},
  ],
  "Investments": [
    { title: "Market Instruments", items: [
      { label: "Mutual Funds", icon: <TrendingUp className="w-4 h-4" />, desc: "SIP from ₹500/month" },
      { label: "Demat Account", icon: <BarChart2 className="w-4 h-4" />, desc: "One-click stock trading" },
      { label: "FD & RD", icon: <Lock className="w-4 h-4" />, desc: "Guaranteed returns" },
    ]},
    { title: "Insurance & Pension", items: [
      { label: "NPS", icon: <Shield className="w-4 h-4" />, desc: "Government pension scheme" },
      { label: "Health Insurance", icon: <BadgeCheck className="w-4 h-4" />, desc: "Cashless across India" },
    ]},
  ],
};

const QUICK_LINKS = [
  { icon: <Smartphone className="w-6 h-6" />, label: "Mobile Recharge", color: "text-indigo-400" },
  { icon: <Zap className="w-6 h-6" />, label: "Pay Electricity", color: "text-amber-400" },
  { icon: <MapPin className="w-6 h-6" />, label: "IFSC Finder", color: "text-emerald-400" },
  { icon: <BadgeCheck className="w-6 h-6" />, label: "Tax Payments", color: "text-purple-400" },
  { icon: <Globe className="w-6 h-6" />, label: "Forex Services", color: "text-cyan-400" },
  { icon: <BarChart2 className="w-6 h-6" />, label: "Investments", color: "text-rose-400" },
  { icon: <CreditCard className="w-6 h-6" />, label: "Apply for Card", color: "text-orange-400" },
  { icon: <Landmark className="w-6 h-6" />, label: "Loan EMI", color: "text-teal-400" },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PublicHomepage() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [emiPrincipal, setEmiPrincipal] = useState(500000);
  const [emiRate, setEmiRate] = useState(10.5);
  const [emiTenure, setEmiTenure] = useState(24);
  const [fdPrincipal, setFdPrincipal] = useState(100000);
  const [fdRate, setFdRate] = useState(7.1);
  const [fdTenure, setFdTenure] = useState(12);
  const [showTop, setShowTop] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate hero
  useEffect(() => {
    timerRef.current = setInterval(() => setActiveSlide(p => (p + 1) % SLIDES.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goSlide = (dir: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveSlide(p => (p + dir + SLIDES.length) % SLIDES.length);
    timerRef.current = setInterval(() => setActiveSlide(p => (p + 1) % SLIDES.length), 5000);
  };

  // Back-to-top
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mega on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setActiveMega(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // EMI Calculation
  const calcEmi = useCallback(() => {
    const r = emiRate / 12 / 100;
    const n = emiTenure;
    if (r === 0) return emiPrincipal / n;
    return (emiPrincipal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [emiPrincipal, emiRate, emiTenure]);

  const emi = calcEmi();
  const totalPay = emi * emiTenure;
  const totalInterest = totalPay - emiPrincipal;

  // FD Calculation
  const fdMaturity = fdPrincipal * Math.pow(1 + (fdRate / 100 / 4), 4 * (fdTenure / 12));
  const fdInterest = fdMaturity - fdPrincipal;

  const slide = SLIDES[activeSlide];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">

      {/* ── Security Alert Marquee ── */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-1.5 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex gap-16 text-[11px] text-amber-300 font-medium">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span>Nexus Wealth Bank never asks for your OTP, PIN, CVV or Internet Banking Password. Beware of phishing attempts.</span>
              <span className="text-amber-500/40">|</span>
              <Lock className="w-3 h-3" />
              <span>Always verify the URL before logging in. Official site: nexuswealth.bank</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Utility Bar ── */}
      <div className="bg-slate-950 border-b border-slate-800/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-1.5 hover:text-indigo-400 transition"><MapPin className="w-3 h-3" /> Locate ATM / Branch</button>
            <button className="flex items-center gap-1.5 hover:text-indigo-400 transition"><Phone className="w-3 h-3" /> Contact Us</button>
            <button className="flex items-center gap-1.5 hover:text-indigo-400 transition"><HelpCircle className="w-3 h-3" /> Help &amp; Support</button>
            <button className="flex items-center gap-1.5 hover:text-indigo-400 transition"><Tag className="w-3 h-3" /> Offers</button>
            <button className="flex items-center gap-1.5 hover:text-indigo-400 transition"><Shield className="w-3 h-3" /> Security Tips</button>
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-transparent text-slate-400 text-[11px] border-none outline-none cursor-pointer">
              <option>🇮🇳 English</option>
              <option>हिन्दी</option>
              <option>தமிழ்</option>
              <option>తెలుగు</option>
            </select>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-semibold">24/7 Helpline: 1800-209-6116</span>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <nav ref={megaRef} className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-16 flex items-center justify-between gap-6">

            {/* Logo */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 flex-shrink-0">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-1.5">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold tracking-widest text-white">NEXUS WEALTH</div>
                <div className="text-[9px] text-slate-500 tracking-widest">COMMERCIAL BANK</div>
              </div>
            </button>

            {/* Mega Menu */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {Object.keys(MEGA_MENU).map(key => (
                <button
                  key={key}
                  onMouseEnter={() => setActiveMega(key)}
                  onMouseLeave={() => setActiveMega(null)}
                  onClick={() => setActiveMega(activeMega === key ? null : key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition ${activeMega === key ? "text-indigo-400 bg-indigo-500/10" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}
                >
                  {key} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeMega === key ? "rotate-180" : ""}`} />
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-slate-400 hover:text-white transition">
                <Search className="w-4 h-4" />
              </button>
              <button onClick={() => router.push("/auth/login")} className="px-5 py-2 text-[13px] font-semibold rounded-lg border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-200 transition">
                Login
              </button>
              <button onClick={() => router.push("/auth/register")} className="px-5 py-2 text-[13px] font-bold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition">
                Open Account
              </button>
            </div>
          </div>

          {/* Mega Dropdown Panel */}
          {activeMega && MEGA_MENU[activeMega] && (
            <div
              onMouseEnter={() => setActiveMega(activeMega)}
              onMouseLeave={() => setActiveMega(null)}
              className="absolute left-0 right-0 bg-[#0a0f1e] border-b border-slate-800 shadow-2xl py-8 px-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8">
                {MEGA_MENU[activeMega].map(section => (
                  <div key={section.title}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{section.title}</p>
                    <div className="space-y-1">
                      {section.items.map(item => (
                        <button key={item.label} onClick={() => router.push("/auth/login")} className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/70 transition group text-left">
                          <span className="mt-0.5 text-indigo-400 group-hover:text-indigo-300 flex-shrink-0">{item.icon}</span>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-200 group-hover:text-white">{item.label}</p>
                            <p className="text-[11px] text-slate-500">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Search Bar */}
        {showSearch && (
          <div className="border-t border-slate-800 py-3 px-6 animate-in fade-in">
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input autoFocus placeholder="Search products, services, IFSC codes..." className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Carousel ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 520 }}>
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} opacity-10 transition-all duration-1000`} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]" />

        {/* Slides */}
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left z-10">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${slide.accent} text-white text-[11px] font-bold mb-6 shadow-lg`}>
              <Star className="w-3 h-3" /> {slide.tag}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
              {slide.title.split("\n").map((line, i) => (
                <span key={i} className={`block ${i === 1 ? `text-transparent bg-clip-text bg-gradient-to-r ${slide.accent}` : ""}`}>{line}</span>
              ))}
            </h1>
            <p className="text-slate-400 text-sm md:text-base mb-8 max-w-lg leading-relaxed">{slide.sub}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button onClick={() => router.push("/auth/register")} className={`flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r ${slide.accent} text-white shadow-lg hover:opacity-90 transition`}>
                {slide.cta} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => router.push("/auth/login")} className="px-7 py-3.5 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-800 transition text-slate-300">
                Existing Customer? Login
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 z-10">
            {[
              { v: "₹2.4L Cr", l: "Assets Under Management" },
              { v: "98.7%", l: "Customer Satisfaction" },
              { v: "1,200+", l: "Branch Network" },
              { v: "₹5 Lakh", l: "DICGC Insured" },
            ].map(({ v, l }) => (
              <div key={l} className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 min-w-[140px]">
                <p className="text-2xl font-extrabold text-white mb-1">{v}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          <button onClick={() => goSlide(-1)} className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setActiveSlide(i); }} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? "w-8 bg-white" : "w-2 bg-slate-600"}`} />
          ))}
          <button onClick={() => goSlide(1)} className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Quick Links ── */}
      <section className="py-12 px-6 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">Quick Access</p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {QUICK_LINKS.map(({ icon, label, color }) => (
              <button key={label} onClick={() => router.push("/auth/login")} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition group">
                <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
                <span className="text-[11px] font-medium text-slate-400 text-center leading-snug">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interest Rate Ticker ── */}
      <section className="py-4 bg-slate-900/60 border-y border-slate-800 overflow-hidden">
        <div className="flex items-center gap-3 mb-2 px-6 max-w-7xl mx-auto">
          <span className="text-[11px] font-bold text-emerald-400 flex-shrink-0 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> LIVE FD RATES
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="animate-marquee flex gap-8 whitespace-nowrap px-6">
          {[...RATES, ...RATES].map((r, i) => (
            <span key={i} className="text-[12px] text-slate-300 flex-shrink-0">
              <span className="text-slate-500">{r.term}:</span>{" "}
              <span className="font-bold text-emerald-400">{r.rate}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Product Showcase ── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Our Products</p>
            <h2 className="text-3xl md:text-4xl font-bold">Banking Built for Your Life</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">From zero-fee savings to unlimited current accounts — find the perfect fit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Nexus Savings", tagline: "For Individuals", rate: "7.10%", perks: ["Zero minimum balance*", "Free NEFT/IMPS transfers", "Contactless debit card", "DICGC insured up to ₹5 Lakh"], gradient: "from-indigo-500/20 to-purple-500/10", border: "border-indigo-500/30" },
              { name: "Nexus Salary", tagline: "For Salaried Professionals", rate: "6.80%", perks: ["Auto salary credit alerts", "Overdraft up to 3x salary", "Premium debit + credit card", "Interest waiver on loans"], gradient: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/30" },
              { name: "Nexus Current", tagline: "For Businesses", rate: "4.00%", perks: ["Unlimited transactions", "Multi-city cheque clearing", "Trade finance integration", "Dedicated RM support"], gradient: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30" },
            ].map(p => (
              <div key={p.name} className={`relative rounded-2xl bg-gradient-to-br ${p.gradient} border ${p.border} p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform`}>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{p.tagline}</p>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="text-3xl font-extrabold mt-2">{p.rate}<span className="text-sm font-normal text-slate-400"> p.a.</span></p>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.perks.map(perk => (
                    <li key={perk} className="flex items-center gap-2 text-[13px] text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push("/auth/register")} className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold transition">
                  Apply Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calculators ── */}
      <section className="py-20 px-6 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest mb-2">Planning Tools</p>
            <h2 className="text-3xl md:text-4xl font-bold">Financial Calculators</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* EMI Calculator */}
            <fieldset className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7">
              <legend className="sr-only">EMI Loan Calculator</legend>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20" aria-hidden="true"><Calculator className="w-5 h-5 text-indigo-400" /></div>
                <h3 className="text-lg font-bold tracking-tight">EMI Calculator</h3>
              </div>

              <div className="space-y-6">
                {/* Loan Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="emi-amount" className="text-sm font-medium text-slate-300">Loan Amount</label>
                    <div className="flex items-center">
                      <span className="text-slate-500 text-sm mr-1">₹</span>
                      <input
                        id="emi-amount-num"
                        type="number" min={10000} max={5000000} step={10000}
                        value={emiPrincipal}
                        onChange={e => setEmiPrincipal(Math.max(10000, Math.min(5000000, Number(e.target.value))))}
                        aria-label="Loan amount in rupees"
                        className="w-24 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <input id="emi-amount" type="range" min={10000} max={5000000} step={10000} value={emiPrincipal}
                    onChange={e => setEmiPrincipal(Number(e.target.value))}
                    aria-valuemin={10000} aria-valuemax={5000000} aria-valuenow={emiPrincipal} aria-label="Loan amount slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>₹10K</span><span>₹50L</span></div>
                </div>

                {/* Interest Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="emi-rate" className="text-sm font-medium text-slate-300">Interest Rate <span className="text-slate-500 font-normal">(p.a.)</span></label>
                    <div className="flex items-center">
                      <input
                        type="number" min={5} max={25} step={0.1}
                        value={emiRate}
                        onChange={e => setEmiRate(Math.max(5, Math.min(25, Number(e.target.value))))}
                        aria-label="Interest rate percentage"
                        className="w-16 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-500 text-sm ml-1">%</span>
                    </div>
                  </div>
                  <input id="emi-rate" type="range" min={5} max={25} step={0.1} value={emiRate}
                    onChange={e => setEmiRate(Number(e.target.value))}
                    aria-valuemin={5} aria-valuemax={25} aria-valuenow={emiRate} aria-label="Interest rate slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>5%</span><span>25%</span></div>
                </div>

                {/* Tenure */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="emi-tenure" className="text-sm font-medium text-slate-300">Loan Tenure</label>
                    <div className="flex items-center">
                      <input
                        type="number" min={3} max={360} step={1}
                        value={emiTenure}
                        onChange={e => setEmiTenure(Math.max(3, Math.min(360, Number(e.target.value))))}
                        aria-label="Tenure in months"
                        className="w-16 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-500 text-sm ml-1">mo</span>
                    </div>
                  </div>
                  <input id="emi-tenure" type="range" min={3} max={360} step={1} value={emiTenure}
                    onChange={e => setEmiTenure(Number(e.target.value))}
                    aria-valuemin={3} aria-valuemax={360} aria-valuenow={emiTenure} aria-label="Tenure slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>3 mo</span><span>360 mo</span></div>
                </div>
              </div>

              {/* Results */}
              <div className="mt-7 pt-6 border-t border-slate-800" aria-live="polite" aria-label="EMI calculation results">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Monthly EMI</p>
                    <p className="text-2xl font-black text-indigo-400 tabular-nums">₹{Math.round(emi).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-center border-x border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Interest</p>
                    <p className="text-2xl font-black text-rose-400 tabular-nums">₹{Math.round(totalInterest).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Payment</p>
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">₹{Math.round(totalPay).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="mt-4 h-2 rounded-full overflow-hidden flex" role="img" aria-label={`Principal ${Math.round((emiPrincipal/totalPay)*100)}%, Interest ${Math.round((totalInterest/totalPay)*100)}%`}>
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(emiPrincipal/totalPay)*100}%` }} />
                  <div className="bg-rose-500 h-full transition-all flex-1" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Principal {Math.round((emiPrincipal/totalPay)*100)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Interest {Math.round((totalInterest/totalPay)*100)}%</span>
                </div>
              </div>
            </fieldset>

            {/* FD Calculator */}
            <fieldset className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7">
              <legend className="sr-only">Fixed Deposit Interest Calculator</legend>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20" aria-hidden="true"><TrendingUp className="w-5 h-5 text-emerald-400" /></div>
                <h3 className="text-lg font-bold tracking-tight">FD Interest Calculator</h3>
              </div>

              <div className="space-y-6">
                {/* FD Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="fd-principal" className="text-sm font-medium text-slate-300">Deposit Amount</label>
                    <div className="flex items-center">
                      <span className="text-slate-500 text-sm mr-1">₹</span>
                      <input
                        type="number" min={1000} max={10000000} step={1000}
                        value={fdPrincipal}
                        onChange={e => setFdPrincipal(Math.max(1000, Math.min(10000000, Number(e.target.value))))}
                        aria-label="Deposit amount in rupees"
                        className="w-24 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input id="fd-principal" type="range" min={1000} max={10000000} step={1000} value={fdPrincipal}
                    onChange={e => setFdPrincipal(Number(e.target.value))}
                    aria-valuemin={1000} aria-valuemax={10000000} aria-valuenow={fdPrincipal} aria-label="Deposit amount slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>₹1K</span><span>₹1 Cr</span></div>
                </div>

                {/* FD Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="fd-rate" className="text-sm font-medium text-slate-300">Interest Rate <span className="text-slate-500 font-normal">(p.a.)</span></label>
                    <div className="flex items-center">
                      <input
                        type="number" min={3} max={9} step={0.1}
                        value={fdRate}
                        onChange={e => setFdRate(Math.max(3, Math.min(9, Number(e.target.value))))}
                        aria-label="FD interest rate percentage"
                        className="w-16 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 text-sm ml-1">%</span>
                    </div>
                  </div>
                  <input id="fd-rate" type="range" min={3} max={9} step={0.1} value={fdRate}
                    onChange={e => setFdRate(Number(e.target.value))}
                    aria-valuemin={3} aria-valuemax={9} aria-valuenow={fdRate} aria-label="FD interest rate slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>3%</span><span>9%</span></div>
                </div>

                {/* FD Tenure */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="fd-tenure" className="text-sm font-medium text-slate-300">Tenure</label>
                    <div className="flex items-center">
                      <input
                        type="number" min={1} max={120} step={1}
                        value={fdTenure}
                        onChange={e => setFdTenure(Math.max(1, Math.min(120, Number(e.target.value))))}
                        aria-label="FD tenure in months"
                        className="w-16 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 text-sm ml-1">mo</span>
                    </div>
                  </div>
                  <input id="fd-tenure" type="range" min={1} max={120} step={1} value={fdTenure}
                    onChange={e => setFdTenure(Number(e.target.value))}
                    aria-valuemin={1} aria-valuemax={120} aria-valuenow={fdTenure} aria-label="FD tenure slider"
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>1 mo</span><span>10 yr</span></div>
                </div>
              </div>

              {/* Results */}
              <div className="mt-7 pt-6 border-t border-slate-800" aria-live="polite" aria-label="FD calculation results">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
                    <p className="text-2xl font-black text-slate-200 tabular-nums">₹{fdPrincipal.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-center border-x border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Interest Earned</p>
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">+₹{Math.round(fdInterest).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Maturity Value</p>
                    <p className="text-2xl font-black text-purple-400 tabular-nums">₹{Math.round(fdMaturity).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                {/* Gain bar */}
                <div className="mt-4 h-2 rounded-full overflow-hidden flex" role="img" aria-label={`Principal ${Math.round((fdPrincipal/fdMaturity)*100)}%, Growth ${Math.round((fdInterest/fdMaturity)*100)}%`}>
                  <div className="bg-slate-600 h-full transition-all" style={{ width: `${(fdPrincipal/fdMaturity)*100}%` }} />
                  <div className="bg-emerald-500 h-full transition-all flex-1" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />Principal {Math.round((fdPrincipal/fdMaturity)*100)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Growth {Math.round((fdInterest/fdMaturity)*100)}%</span>
                </div>
              </div>
            </fieldset>

          </div>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Shield className="w-7 h-7" />, title: "RBI Regulated", sub: "Licensed & supervised by the Reserve Bank of India", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { icon: <Lock className="w-7 h-7" />, title: "256-bit Encryption", sub: "Military-grade SSL/TLS encryption on all transactions", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: <BadgeCheck className="w-7 h-7" />, title: "DICGC Insured", sub: "Deposits insured up to ₹5 Lakhs by DICGC", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
              { icon: <Zap className="w-7 h-7" />, title: "99.99% Uptime", sub: "24/7 banking with 4-nines availability SLA", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            ].map(t => (
              <div key={t.title} className={`p-5 rounded-2xl border ${t.bg} flex flex-col gap-3`}>
                <span className={t.color}>{t.icon}</span>
                <div>
                  <p className="font-bold text-sm">{t.title}</p>
                  <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{t.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-1.5">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold tracking-widest text-sm">NEXUS WEALTH</span>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-4">Premier commercial banking for individuals, businesses, and institutions across India.</p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700 transition">App Store</button>
                <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700 transition">Google Play</button>
              </div>
            </div>
            {/* Links */}
            {[
              { title: "Personal", links: ["Savings Account", "Fixed Deposits", "Personal Loans", "Debit Cards", "Credit Cards"] },
              { title: "Business", links: ["Current Account", "Trade Finance", "MSME Loans", "Payroll Banking", "Corporate FD"] },
              { title: "Investments", links: ["Mutual Funds", "Demat Account", "NPS Pension", "Health Insurance", "Life Cover"] },
              { title: "Company", links: ["About Us", "Careers", "Media Center", "Investor Relations", "Branches & ATMs"] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map(l => <li key={l}><button className="text-[13px] text-slate-500 hover:text-slate-300 transition">{l}</button></li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-slate-600">
            <p>© 2025 Nexus Wealth Commercial Bank Ltd. All rights reserved. | DBMS Course Project</p>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms & Conditions", "RBI Kehta Hai", "Disclaimer", "Grievance Redressal"].map(l => (
                <button key={l} className="hover:text-slate-400 transition">{l}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Back to Top ── */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/30 transition animate-in fade-in">
          <ArrowUp className="w-4 h-4 text-white" />
        </button>
      )}

    </div>
  );
}
