"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const NAV_STRUCTURE = [
  {
    label: "Accounts & Deposits",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h10M3 18h6" />
      </svg>
    ),
    items: [
      { label: "Account Summary",    description: "View balances & account details",   route: ""                },
      { label: "Transaction History", description: "Full statements & channel filters", route: "transactions"    },
      { label: "Fixed Deposits",      description: "FD calculator & maturity tracker",  route: "fixed-deposits"  },
      { label: "Nominees",            description: "Add, view & remove nominees",        route: "nominees"        },
    ],
  },
  {
    label: "Fund Transfer",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    items: [
      { label: "Initiate Transfer",    description: "IMPS / NEFT / RTGS payments",      route: "transfers"       },
      { label: "Saved Beneficiaries",  description: "Manage payees & cooling period",   route: "beneficiaries"   },
      { label: "Scheduled Payments",   description: "Loan EMIs & AutoPay mandates",     route: "scheduled"       },
    ],
  },
  {
    label: "Cards & Services",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h.01M11 15h.01M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" />
      </svg>
    ),
    items: [
      { label: "Card Management",   description: "Limits, international & block card", route: "cards"    },
      { label: "Transaction PIN",   description: "Set or reset your 6-digit MPIN",     route: "security" },
      { label: "Loan Management",   description: "EMI schedule & amortization",        route: "loans"    },
    ],
  },
];

interface MegaNavbarProps {
  customerId: string;
  username: string;
  lastLogin?: string;
  onSectionChange?: (section: string) => void;
}

export default function MegaNavbar({ customerId, username, lastLogin, onSectionChange }: MegaNavbarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("customer_id");
    localStorage.removeItem("username");
    router.push("/auth/login");
  };

  const handleItemClick = (route: string) => {
    setOpenMenu(null);
    setMobileOpen(false);
    if (route === "") {
      router.push(`/dashboard/${customerId}`);
    } else {
      router.push(`/dashboard/${customerId}/${route}`);
    }
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 shadow-lg shadow-black/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <button
            onClick={() => router.push(`/dashboard/${customerId}`)}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-tight">Nexus Bank</p>
              <p className="text-emerald-500/80 text-[9px] leading-none font-semibold tracking-widest uppercase">Secure Net Banking</p>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_STRUCTURE.map((menu) => (
              <div key={menu.label} className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    openMenu === menu.label
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  {menu.icon}
                  {menu.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === menu.label ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openMenu === menu.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2">
                      {menu.items.map((item: any) => (
                        <button
                          key={item.label}
                          onClick={() => handleItemClick(item.route)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-left group"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <div>
                            <div className="text-sm font-medium text-slate-100 group-hover:text-white">{item.label}</div>
                            <div className="text-xs text-slate-500 group-hover:text-slate-400">{item.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side: user info + profile + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-slate-200 text-xs font-semibold">{username}</p>
              {lastLogin && (
                <p className="text-slate-600 text-[10px]">Last login: {lastLogin}</p>
              )}
            </div>

            {/* Profile link */}
            <button
              onClick={() => router.push(`/dashboard/${customerId}/profile`)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition shadow-lg shadow-emerald-500/20"
              title="My Profile"
            >
              {username.charAt(0).toUpperCase()}
            </button>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 pb-4">
          {NAV_STRUCTURE.map((menu) => (
            <div key={menu.label} className="px-4 pt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                {menu.icon} {menu.label}
              </div>
              <div className="space-y-1 pl-2 border-l border-slate-800">
                {menu.items.map((item: any) => (
                  <button
                    key={item.label}
                    onClick={() => handleItemClick(item.route)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="px-4 pt-4 border-t border-slate-800 mt-3">
            <button onClick={() => router.push(`/dashboard/${customerId}/profile`)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition mb-1">My Profile</button>
            <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition">Sign Out</button>
          </div>
        </div>
      )}
    </nav>
  );
}
