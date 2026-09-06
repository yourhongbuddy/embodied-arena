import { type Metric, type RobotModel } from "./models.ts";

export type EnvironmentFilter = "all" | "REAL" | "SIM";
export type SortKey = Metric | "name";
export type ExplorerOptions = { query: string; openOnly: boolean; environment: EnvironmentFilter; sort: SortKey; ascending: boolean };

/** Filters never mutate the shared fixtures used by ArenaGPT. */
export function selectModels(source: readonly RobotModel[], options: ExplorerOptions): RobotModel[] {
  const query = options.query.trim().toLocaleLowerCase();
  return source.filter(model => (!options.openOnly || model.open) &&
    (options.environment === "all" || model.reality === options.environment) &&
    `${model.name} ${model.org} ${model.kind} ${model.task}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => {
      const value = options.sort === "name" ? a.name.localeCompare(b.name) : a[options.sort] - b[options.sort];
      return (options.ascending ? value : -value) || a.name.localeCompare(b.name);
    });
}

/** Competition rank stays tied to the active score, even when the table is sorted by name. */
export function scoreRank(model: RobotModel, source: readonly RobotModel[], metric: Metric): number {
  return 1 + source.filter(other => other[metric] > model[metric]).length;
}
