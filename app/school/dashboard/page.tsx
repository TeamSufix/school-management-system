import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

export default async function SchoolDashboard() {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  const { school, schoolId, role } = current;

  const supabase = await createClient();

  // TEACHER

  if (role === "teacher") {
    const teacherLinks = [
      {
        title: "My Classes",
        description: "View the classes assigned to you.",
        href: "/school/classes",
        icon: "class",
      },
      {
        title: "My Students",
        description: "View students in your classes.",
        href: "/school/students",
        icon: "student",
      },
      {
        title: "Attendance",
        description: "Record and view student attendance.",
        href: "/school/attendance",
        icon: "attendance",
      },
      {
        title: "Results",
        description: "Enter and manage student results.",
        href: "/school/results",
        icon: "results",
      },
      {
        title: "Assessments",
        description: "Create tests, assignments and exams with weighted scores.",
        href: "/school/assessments",
        icon: "results",
      },
      {
        title: "Announcements",
        description: "Read school announcements.",
        href: "/school/announcements",
        icon: "class",
      },
      {
        title: "Notifications",
        description: "View your notifications.",
        href: "/school/notifications",
        icon: "class",
      },
      {
        title: "Timetable",
        description: "View your class timetable.",
        href: "/school/timetable",
        icon: "class",
      },
    ];

    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <DashboardHero
          eyebrow="Teacher Dashboard"
          title="Welcome"
          subtitle={school.name}
          description="Everything you need to manage your classes and student records."
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {teacherLinks.map((item) => (
            <DashboardCard key={item.href} {...item} />
          ))}
        </section>
      </main>
    );
  }

  // ACCOUNTANT

  if (role === "accountant") {
    const { count: paymentCount } = await supabase
      .from("payments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("school_id", schoolId);

    return (
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <DashboardHero
          eyebrow="Accountant Dashboard"
          title="Welcome"
          subtitle={school.name}
          description="Manage school fees and keep payment records organized."
        />

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 6h18" />
                <path d="M5 6v14h14V6" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
              </svg>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Recorded Payments
            </p>

            <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
              {paymentCount ?? 0}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Payment records in the system
            </p>
          </div>

          <Link
            href="/school/fees"
            className="group rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
                $
              </div>

              <span className="text-slate-300 transition group-hover:text-green-600">
                →
              </span>
            </div>

            <h2 className="mt-5 font-bold text-slate-900">Fees & Payments</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage school fees and record student payments.
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-green-600">
              Open workspace
            </p>
          </Link>

          <Link
            href="/school/announcements"
            className="group rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <h2 className="font-bold text-slate-900">Announcements</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Read school announcements.
            </p>
          </Link>

          <Link
            href="/school/notifications"
            className="group rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <h2 className="font-bold text-slate-900">Notifications</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              View your notifications.
            </p>
          </Link>
        </section>
      </main>
    );
  }

  // SCHOOL ADMIN

  if (role !== "school_admin") {
    redirect("/login");
  }

  const [studentsResult, teachersResult, classesResult, attendanceResult, feesResult, paymentsResult, attendanceTotal] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId),

      supabase
        .from("teachers")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId),

      supabase
        .from("classes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId),

      supabase
        .from("attendance")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId)
        .eq("date", new Date().toISOString().split("T")[0]),

      supabase
        .from("fees")
        .select("id, amount_due")
        .eq("school_id", schoolId),

      supabase
        .from("payments")
        .select("amount")
        .eq("school_id", schoolId),

      supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["present", "late"]),
    ]);

  const totalDue = (feesResult.data ?? []).reduce((sum, fee) => sum + Number(fee.amount_due), 0);
  const totalPaid = (paymentsResult.data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = totalDue - totalPaid;
  const activeStudents = studentsResult.count ?? 0;
  const attendanceRate = activeStudents ? Math.round(((attendanceTotal.count ?? 0) / Math.max(1, activeStudents)) * 100) : 0;
  const currency = (value: number) => `GH₵ ${value.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;

  const stats = [
    {
      label: "Students",
      value: studentsResult.count ?? 0,
      href: "/school/students",
      icon: "student",
    },
    {
      label: "Teachers",
      value: teachersResult.count ?? 0,
      href: "/school/teachers",
      icon: "teacher",
    },
    {
      label: "Classes",
      value: classesResult.count ?? 0,
      href: "/school/classes",
      icon: "class",
    },
    {
      label: "Today's Attendance",
      value: `${attendanceResult.count ?? 0} (${attendanceRate}%)`,
      href: "/school/attendance",
      icon: "attendance",
    },
    {
      label: "Fees Collected",
      value: currency(totalPaid),
      href: "/school/fees",
      icon: "fees",
    },
    {
      label: "Outstanding Fees",
      value: currency(outstanding),
      href: "/school/reports",
      icon: "fees",
    },
  ];

  const managementLinks = [
    {
      title: "Academic Settings",
      description: "Set the current year and term, and assign teachers.",
      href: "/school/settings",
      icon: "class",
    },
    {
      title: "Students",
      description: "Add and manage student records.",
      href: "/school/students",
      icon: "student",
    },
    {
      title: "Teachers",
      description: "Manage teachers and their accounts.",
      href: "/school/teachers",
      icon: "teacher",
    },
    {
      title: "Classes",
      description: "Configure your school classes.",
      href: "/school/classes",
      icon: "class",
    },
    {
      title: "Subjects",
      description: "Manage subjects taught at school.",
      href: "/school/subjects",
      icon: "subject",
    },
    {
      title: "Attendance",
      description: "Record and view attendance.",
      href: "/school/attendance",
      icon: "attendance",
    },
    {
      title: "Results",
      description: "Enter and view academic results.",
      href: "/school/results",
      icon: "results",
    },
    {
      title: "Assessments",
      description: "Create tests, assignments and exams with weighted scores.",
      href: "/school/assessments",
      icon: "results",
    },
    {
      title: "Announcements",
      description: "Publish and read school announcements.",
      href: "/school/announcements",
      icon: "class",
    },
    {
      title: "Notifications",
      description: "View your notifications.",
      href: "/school/notifications",
      icon: "class",
    },
    {
      title: "Timetable",
      description: "Build and view class timetables.",
      href: "/school/timetable",
      icon: "class",
    },
    {
      title: "Fees",
      description: "Manage fees and payments.",
      href: "/school/fees",
      icon: "fees",
    },
    {
      title: "Accountants",
      description: "Manage financial staff accounts.",
      href: "/school/accountants",
      icon: "accountant",
    },
    {
      title: "Parents",
      description: "Manage parent accounts and children.",
      href: "/school/parents",
      icon: "parent",
    },
    {
      title: "Reports",
      description: "Attendance reports, fee collection and exports.",
      href: "/school/reports",
      icon: "results",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      {/* Hero */}

      <DashboardHero
        eyebrow="School Administration"
        title={school.name}
        description="Manage your school's people, academic records, attendance and finances from one place."
      />

      {/* Stats */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <DashboardIcon type={stat.icon} />
              </div>

              <span className="text-slate-300 transition group-hover:text-green-600">
                →
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              {stat.label}
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </p>
          </Link>
        ))}
      </section>

      {/* Management */}

      <section className="mt-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
            Operations
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            School Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage the main operations of your school.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managementLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-green-50 group-hover:text-green-600">
                  <DashboardIcon type={item.icon} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">{item.title}</h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <span className="text-slate-300 transition group-hover:text-green-600">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}


function DashboardHero({
  eyebrow,
  title,
  subtitle,
  description,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#07130d] px-6 py-8 text-white shadow-xl shadow-slate-900/5 sm:px-8 sm:py-9">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />

      <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-300">
            {eyebrow}
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-2 text-sm font-medium text-green-300">{subtitle}</p>
        )}

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          {description}
        </p>
      </div>
    </section>
  );
}


function DashboardCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <DashboardIcon type={icon} />
        </div>

        <span className="text-slate-300 transition group-hover:text-green-600">
          →
        </span>
      </div>

      <h2 className="mt-5 font-bold text-slate-900">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-green-600">
        Open workspace
      </p>
    </Link>
  );
}


function DashboardIcon({ type }: { type: string }) {
  if (type === "student") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 11h5" />
        <path d="M18.5 8.5v5" />
      </svg>
    );
  }

  if (type === "teacher") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === "class") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  if (type === "attendance") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  if (type === "subject") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (type === "results") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-3 3 2 5-6" />
      </svg>
    );
  }

  if (type === "fees") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }

  if (type === "accountant") {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M19 5v4" />
        <path d="M17 7h4" />
      </svg>
    );
  }

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}
