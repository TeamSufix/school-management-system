export async function readAllRows<T>(query: {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }>;
}) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query.range(from, from + 499);
    if (error) throw new Error("Unable to load database records.");
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
