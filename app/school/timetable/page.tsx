import TimetableManager from "@/components/school/TimetableManager";

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classId } = await searchParams;
  return <TimetableManager classId={typeof classId === "string" ? classId : undefined} />;
}
