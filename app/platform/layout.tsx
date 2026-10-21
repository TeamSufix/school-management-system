import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["super_admin"]);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900">
      {/* DESKTOP SIDEBAR */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/10 bg-[#07130d] text-white lg:flex lg:flex-col">
        {/* Brand */}

        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link
            href="/platform/dashboard"
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/20">
              <span className="text-lg font-black text-white">S</span>

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#07130d] bg-green-300" />
            </div>

            <div>
              <p className="text-[15px] font-bold tracking-tight text-white">
                School<span className="text-green-400">MS</span>
              </p>

              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Platform
          </p>

          <nav className="space-y-1">
            <SidebarLink
              href="/platform/dashboard"
              icon="grid"
              label="Overview"
            />

            <SidebarLink
              href="/platform/schools"
              icon="school"
              label="Schools"
            />
          </nav>

          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Management
          </p>

          <nav className="space-y-1">
            <SidebarLink
              href="/platform/schools"
              icon="users"
              label="School Records"
            />

            <SidebarLink
              href="/platform/schools"
              icon="shield"
              label="Administration"
            />
          </nav>
        </div>

        {/* Admin Profile */}

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-xs font-bold text-green-400">
                SA
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#07130d] bg-green-400" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Super Admin
                </p>

                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  Platform Administrator
                </p>
              </div>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>


      <div className="lg:pl-[260px]">
        {/* TOP BAR */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8">
            {/* Mobile Brand */}

            <Link
              href="/platform/dashboard"
              className="flex items-center gap-2.5 lg:hidden"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-sm font-black text-white shadow-md shadow-green-600/20">
                S
              </div>

              <span className="font-bold tracking-tight text-slate-900">
                School<span className="text-green-600">MS</span>
              </span>
            </Link>

            {/* Desktop Context */}

            <div className="hidden lg:block">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  School Management Platform
                </p>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Platform Administration
              </p>
            </div>

            {/* Right Side */}

            <div className="flex items-center gap-3">
              <div className="hidden h-9 items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3.5 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>

                <span className="text-xs font-semibold text-green-700">
                  System Operational
                </span>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* PAGE */}

        <main className="min-h-[calc(100vh-80px)]">{children}</main>
      </div>
    </div>
  );
}


function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "grid" | "school" | "users" | "shield";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-slate-500 transition group-hover:bg-green-500/10 group-hover:text-green-400">
        <NavIcon type={icon} />
      </span>

      <span>{label}</span>
    </Link>
  );
}


function NavIcon({ type }: { type: "grid" | "school" | "users" | "shield" }) {
  if (type === "grid") {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (type === "school") {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 21h18" />
        <path d="M5 21V8l7-4 7 4v13" />
        <path d="M9 21v-6h6v6" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
