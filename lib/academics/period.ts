export type AcademicTerm = "term_1" | "term_2" | "term_3";
export type AcademicPeriod = { academic_year: string; term: AcademicTerm };

export function normalizeAcademicYear(year: string) {
  const match = /^(\d{4})[/\-](\d{4})$/.exec(year.trim());
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;
  return `${match[1]}/${match[2]}`;
}

export function isTerm(term: string): term is AcademicTerm {
  return ["term_1", "term_2", "term_3"].includes(term);
}

export function validateAcademicPeriod(year: string, term: string) {
  if (!/^\d{4}\/\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) return "Use consecutive years, for example 2026/2027.";
  if (!["term_1", "term_2", "term_3"].includes(term)) return "Select a valid term.";
  return null;
}

export function defaultAcademicPeriod(): AcademicPeriod {
  const year = new Date().getFullYear();
  return { academic_year: `${year}/${year + 1}`, term: "term_1" };
}
