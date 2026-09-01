type D1Result<T> = { results: T[] };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<unknown>;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<D1Result<T>>;
};
export type D1Binding = { prepare: (query: string) => D1Statement };

export async function getD1(): Promise<D1Binding> {
  const moduleId = "cloudflare:workers";
  const runtime = await import(/* @vite-ignore */ moduleId) as { env?: { DB?: D1Binding } };
  if (!runtime.env?.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return runtime.env.DB;
}
