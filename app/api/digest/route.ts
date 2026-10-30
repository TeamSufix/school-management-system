import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStudentAndParents } from "@/lib/notifications/fanout";

/**
 * Weekly digest: summarises the past 7 days of absences and newly posted
 * results into one notification per student/parent recipient.
 *
 * Call from a scheduler (e.g. Vercel cron) with:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Digest scheduling is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: absences }, { data: results }] = await Promise.all([
    admin.from("attendance").select("school_id, student_id, status").in("status", ["absent", "late"]).gte("created_at", since),
    admin.from("results").select("school_id, student_id, subjects(name)").gte("created_at", since),
  ]);

  const summaries = new Map<string, { absences: number; lates: number; subjects: Set<string> }>();
  const add = (schoolId: string, studentId: string) => {
    const key = `${schoolId}:${studentId}`;
    if (!summaries.has(key)) summaries.set(key, { absences: 0, lates: 0, subjects: new Set() });
    return summaries.get(key)!;
  };
  for (const row of absences ?? []) {
    const summary = add(row.school_id, row.student_id);
    if (row.status === "absent") summary.absences += 1;
    else summary.lates += 1;
  }
  for (const row of results ?? []) {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    if (subject?.name) add(row.school_id, row.student_id).subjects.add(subject.name);
  }

  const bySchool = new Map<string, Map<string, { absences: number; lates: number; subjects: Set<string> }>>();
  for (const [key, summary] of summaries) {
    const [schoolId, studentId] = key.split(":");
    if (!bySchool.has(schoolId)) bySchool.set(schoolId, new Map());
    bySchool.get(schoolId)!.set(studentId, summary);
  }

  let sent = 0;
  for (const [schoolId, students] of bySchool) {
    const parts = [...students.entries()].map(([studentId, s]) => {
      const bits = [
        s.absences ? `${s.absences} absence${s.absences === 1 ? "" : "s"}` : "",
        s.lates ? `${s.lates} late mark${s.lates === 1 ? "" : "s"}` : "",
        s.subjects.size ? `new results in ${[...s.subjects].join(", ")}` : "",
      ].filter(Boolean);
      return { studentId, body: `This week: ${bits.join("; ")}.` };
    }).filter((item) => item.body !== "This week: .");

    for (const item of parts) {
      await notifyStudentAndParents(admin, schoolId, [item.studentId], "Your weekly school summary", item.body);
      sent += 1;
    }
  }

  return NextResponse.json({ sent });
}
