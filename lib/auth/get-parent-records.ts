import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

async function readAll<T>(query: {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }>;
}) {
  const records: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query.range(from, from + 499);
    if (error) throw new Error("Unable to load family records.");
    records.push(...(data ?? []));
    if (!data || data.length < 500) return { data: records, error: null };
  }
}

export async function getParentRecords() {
  const user = await getCurrentUser();
  if (!user || user.role !== "parent" || !user.schoolId) return null;

  const client = await createClient();
  const { data: links, error: linksError } = await client
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", user.id);
  if (linksError) throw new Error("Unable to load linked children.");

  const ids = [...new Set((links ?? []).map((link) => link.student_id))];
  if (!ids.length) return { user, children: [], attendance: [], results: [], fees: [], payments: [] };

  const responses = await Promise.all([
    readAll(client.from("students").select("id, first_name, last_name, student_id").eq("school_id", user.schoolId).in("id", ids).order("id")),
    readAll(client.from("attendance").select("id, student_id, date, status").eq("school_id", user.schoolId).in("student_id", ids).order("date", { ascending: false }).order("id")),
    readAll(client.from("results").select("id, student_id, academic_year, term, score, grade, subjects(name)").eq("school_id", user.schoolId).in("student_id", ids).order("academic_year", { ascending: false }).order("id")),
    readAll(client.from("fees").select("id, student_id, academic_year, term, amount_due").eq("school_id", user.schoolId).in("student_id", ids).order("academic_year", { ascending: false }).order("id")),
    readAll(client.from("payments").select("id, fee_id, student_id, amount, date, payment_method, reference").eq("school_id", user.schoolId).in("student_id", ids).order("date", { ascending: false }).order("id")),
  ]);
  if (responses.some((response) => response.error)) throw new Error("Unable to load family records. Please contact your school administrator.");

  const [studentsResponse, attendanceResponse, resultsResponse, feesResponse, paymentsResponse] = responses;
  const results = resultsResponse.data ?? [];
  const resultIds = results.map((result) => result.id);
  const amendments = resultIds.length
    ? await readAll(client.from("result_amendments").select("id, result_id, new_score, new_grade, created_at").eq("school_id", user.schoolId).in("result_id", resultIds).order("created_at", { ascending: true }).order("id", { ascending: true }))
    : { data: [], error: null };
  if (amendments.error) throw new Error("Unable to load amended results.");
  const latest = new Map((amendments.data ?? []).map((amendment) => [amendment.result_id, amendment]));

  return {
    user,
    children: studentsResponse.data ?? [],
    attendance: attendanceResponse.data ?? [],
    results: results.map((result) => ({ ...result, score: Number(latest.get(result.id)?.new_score ?? result.score), grade: latest.get(result.id)?.new_grade ?? result.grade })),
    fees: feesResponse.data ?? [],
    payments: paymentsResponse.data ?? [],
  };
}
