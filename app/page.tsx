import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-green-100/50 blur-3xl" />
        <div className="absolute right-[-200px] top-[500px] h-[500px] w-[500px] rounded-full bg-emerald-100/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-lg shadow-green-600/20 transition group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path d="M3 10.5 12 5l9 5.5-9 5-9-5Z" />
                <path d="M6 12.5V17c3.5 2.5 8.5 2.5 12 0v-4.5" />
                <path d="M21 10.5V16" />
              </svg>
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-slate-950">
                School<span className="text-green-600">MS</span>
              </div>
              <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                School Management
              </div>
            </div>
          </Link>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
          >
            Sign In
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M4 10h11M10.5 5.5 15 10l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-24 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32">
        <div className="mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/80 px-4 py-2 text-xs font-semibold text-green-700 shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Simple. Powerful. Built for Schools.
          </div>

          {/* Main heading */}
          <h1 className="mx-auto max-w-5xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            Run your school
            <span className="block bg-gradient-to-r from-green-600 via-emerald-500 to-green-700 bg-clip-text text-transparent">
              with confidence.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Everything you need to manage students, teachers, classes,
            attendance, results and school fees — all from one simple platform.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-green-600/20 transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-2xl hover:shadow-green-600/25 sm:w-auto"
            >
              Open Dashboard
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              >
                <path
                  d="M4 10h11M10.5 5.5 15 10l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <a
              href="#features"
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Explore Features
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-green-600"
              >
                <path
                  d="m5 10 3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Easy to use
            </div>

            <div className="hidden h-4 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-green-600"
              >
                <path
                  d="M10 2.5 16 5v4.5c0 3.7-2.5 6.7-6 8-3.5-1.3-6-4.3-6-8V5l6-2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m7.5 10 1.7 1.7 3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Secure
            </div>

            <div className="hidden h-4 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-green-600"
              >
                <path
                  d="M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 6v4l2.5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Built for everyday use
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-green-200/40 via-emerald-100/30 to-green-200/40 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              {/* Browser top */}
              <div className="flex h-11 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />

                <div className="mx-auto hidden h-6 max-w-md flex-1 rounded-md bg-white shadow-sm sm:block" />
              </div>

              {/* Dashboard preview */}
              <div className="grid min-h-[330px] grid-cols-[70px_1fr] bg-slate-50 sm:grid-cols-[190px_1fr]">
                <div className="border-r border-slate-200 bg-white p-3 sm:p-4">
                  <div className="mb-7 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-green-600" />
                    <div className="hidden h-3 w-20 rounded bg-slate-200 sm:block" />
                  </div>

                  <div className="space-y-2">
                    <PreviewNav active />
                    <PreviewNav />
                    <PreviewNav />
                    <PreviewNav />
                    <PreviewNav />
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="h-5 w-32 rounded bg-slate-900/90" />
                    <div className="mt-2 h-3 w-52 rounded bg-slate-200" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <PreviewStat number="1,248" label="Students" />
                    <PreviewStat number="86" label="Teachers" />
                    <PreviewStat number="24" label="Classes" />
                    <PreviewStat number="96%" label="Attendance" />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-5 h-3 w-28 rounded bg-slate-200" />
                      <div className="flex h-28 items-end gap-2">
                        <div className="h-[45%] flex-1 rounded-t bg-green-100" />
                        <div className="h-[65%] flex-1 rounded-t bg-green-200" />
                        <div className="h-[52%] flex-1 rounded-t bg-green-300" />
                        <div className="h-[80%] flex-1 rounded-t bg-green-400" />
                        <div className="h-[68%] flex-1 rounded-t bg-green-300" />
                        <div className="h-[90%] flex-1 rounded-t bg-green-500" />
                        <div className="h-[76%] flex-1 rounded-t bg-green-400" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 h-3 w-28 rounded bg-slate-200" />
                      <div className="space-y-3">
                        <PreviewRow />
                        <PreviewRow />
                        <PreviewRow />
                        <PreviewRow />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-y border-slate-200 bg-white px-5 py-24 sm:px-6 lg:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-700">
              Everything in one place
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              The tools your school needs
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Keep your everyday school operations organized without unnecessary
              complexity.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="student"
              title="Students"
              description="Add, manage and view student information quickly and easily."
            />

            <FeatureCard
              icon="teacher"
              title="Teachers"
              description="Keep teacher information organized and accessible in one place."
            />

            <FeatureCard
              icon="classes"
              title="Classes & Subjects"
              description="Organize classes and subjects without complicated workflows."
            />

            <FeatureCard
              icon="attendance"
              title="Attendance"
              description="Record and track daily student attendance with ease."
            />

            <FeatureCard
              icon="results"
              title="Results"
              description="Enter, manage and view academic results efficiently."
            />

            <FeatureCard
              icon="fees"
              title="School Fees"
              description="Track payments, outstanding balances and school fees."
            />
          </div>
        </div>
      </section>

      {/* Simple workflow */}
      <section className="bg-slate-50 px-5 py-24 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-700">
                Designed to be simple
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Less complexity.
                <span className="block text-green-600">More productivity.</span>
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                SchoolMS keeps the important things close at hand so school
                administrators can spend less time navigating software and more
                time running the school.
              </p>

              <div className="mt-8 space-y-5">
                <SimplePoint
                  number="01"
                  title="One central platform"
                  description="Keep your school's essential information together."
                />

                <SimplePoint
                  number="02"
                  title="Simple daily workflows"
                  description="Manage common school tasks without unnecessary steps."
                />

                <SimplePoint
                  number="03"
                  title="Clear information"
                  description="Find the information you need quickly when you need it."
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-green-100/60 blur-2xl" />

              <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <div className="h-4 w-28 rounded bg-slate-900" />
                    <div className="mt-2 h-2.5 w-40 rounded bg-slate-200" />
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    ✓
                  </div>
                </div>

                <div className="py-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="mt-2 h-6 w-36 rounded bg-slate-900" />
                    </div>

                    <div className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                      This month
                    </div>
                  </div>

                  <div className="space-y-3">
                    <DashboardLine
                      title="Student enrollment"
                      value="+12.4%"
                      width="82%"
                    />
                    <DashboardLine
                      title="Attendance"
                      value="96.2%"
                      width="96%"
                    />
                    <DashboardLine
                      title="Fee collection"
                      value="87.5%"
                      width="72%"
                    />
                    <DashboardLine
                      title="Results completed"
                      value="91.8%"
                      width="88%"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                      ✓
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Everything is organized
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Your school information is ready when you need it.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-950 px-5 py-24 sm:px-6 lg:py-28">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-green-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-green-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7"
            >
              <path d="M3 10.5 12 5l9 5.5-9 5-9-5Z" />
              <path d="M6 12.5V17c3.5 2.5 8.5 2.5 12 0v-4.5" />
              <path d="M21 10.5V16" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your school. One simple system.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-400">
            Sign in and manage the day-to-day operations of your school from one
            clean, centralized platform.
          </p>

          <Link
            href="/login"
            className="group mt-9 inline-flex items-center gap-3 rounded-xl bg-green-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-green-900/30 transition-all hover:-translate-y-0.5 hover:bg-green-500"
          >
            Go to SchoolMS
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            >
              <path
                d="M4 10h11M10.5 5.5 15 10l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 py-7 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M3 10.5 12 5l9 5.5-9 5-9-5Z" />
                <path d="M6 12.5V17c3.5 2.5 8.5 2.5 12 0v-4.5" />
              </svg>
            </div>

            <span className="text-sm font-bold text-slate-900">
              School<span className="text-green-600">MS</span>
            </span>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} TeamSufix.System Consulting & Engineering.
          </p>

          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 transition hover:text-green-600"
          >
            Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    student: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M4 19c0-3 2.5-5 6-5s6 2 6 5" />
        <circle cx="10" cy="7" r="3.5" />
        <path d="M16 11c2.2.2 4 1.7 4 4" />
        <path d="M16.5 4.5a3 3 0 0 1 0 5.8" />
      </svg>
    ),
    teacher: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5" />
        <path d="M15 6h5M17.5 4v5" />
      </svg>
    ),
    classes: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <rect x="3.5" y="4" width="17" height="16" rx="2" />
        <path d="M8 4v16M8 9h12M12 13h5M12 16h3" />
      </svg>
    ),
    attendance: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <path d="M8 8h8M8 12l2 2 4-4M8 17h4" />
      </svg>
    ),
    results: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M4 19V9M10 19V5M16 19v-8M22 19H2" />
      </svg>
    ),
    fees: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 14h3" />
      </svg>
    ),
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-slate-900/5">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-green-50 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-green-600/20">
          {icons[icon]}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-green-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
          Built into SchoolMS
          <span>→</span>
        </div>
      </div>
    </div>
  );
}

function SimplePoint({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-[11px] font-bold text-green-700">
        {number}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function DashboardLine({
  title,
  value,
  width,
}: {
  title: string;
  value: string;
  width: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{title}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-green-500" style={{ width }} />
      </div>
    </div>
  );
}

function PreviewNav({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`flex h-8 items-center gap-2 rounded-lg px-2 ${
        active ? "bg-green-50" : ""
      }`}
    >
      <div
        className={`h-4 w-4 rounded ${
          active ? "bg-green-500" : "bg-slate-200"
        }`}
      />
      <div
        className={`hidden h-2.5 w-20 rounded sm:block ${
          active ? "bg-green-200" : "bg-slate-100"
        }`}
      />
    </div>
  );
}

function PreviewStat({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-left">
      <div className="text-base font-bold text-slate-900">{number}</div>
      <div className="mt-1 text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function PreviewRow() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-full bg-slate-100" />

      <div className="flex-1">
        <div className="h-2.5 w-20 rounded bg-slate-200" />
        <div className="mt-1.5 h-2 w-12 rounded bg-slate-100" />
      </div>

      <div className="h-2.5 w-8 rounded bg-green-100" />
    </div>
  );
}
