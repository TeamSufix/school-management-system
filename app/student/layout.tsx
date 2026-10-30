import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import LogoutButton from "@/components/auth/LogoutButton";

const links = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/assessments", label: "Assignments & Quizzes" },
  { href: "/student/records", label: "My Records" },
  { href: "/student/timetable", label: "Timetable" },
  { href: "/student/notifications", label: "Notifications" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/unauthorized");

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-xs font-black text-white">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                School<span className="text-green-600">MS</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Student Portal · {user.school?.name ?? ""}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-2 sm:px-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-green-50 hover:text-green-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
