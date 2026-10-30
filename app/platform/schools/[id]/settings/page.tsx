import SchoolConfiguration from "@/components/school/SchoolConfiguration";

export default async function SchoolSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchoolConfiguration schoolId={id} />;
}
