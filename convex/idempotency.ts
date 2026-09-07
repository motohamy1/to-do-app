import type { DocumentByName } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type LocalIdTable =
  | "projectCategories"
  | "projectSubCategories"
  | "projects"
  | "projectResources"
  | "projectChecklists"
  | "taskChecklists"
  | "yearlyGoals"
  | "yearlyAchievements"
  | "categoryItems";

type InsertFields<Table extends LocalIdTable> = Omit<
  DocumentByName<DataModel, Table>,
  "_id" | "_creationTime"
>;

// Replay-safe insert: a creation that was queued offline and replayed by the
// sync loop (or double-executed after a client timeout) resolves to the same
// document instead of duplicating it. The client sends its optimistic temp id
// as `localId`; the index guarantees a one-shot mapping.
export async function insertWithLocalId<Table extends LocalIdTable>(
  ctx: MutationCtx,
  table: Table,
  localId: string | undefined,
  fields: InsertFields<Table>
): Promise<Id<Table>> {
  const db = ctx.db as any;
  if (localId) {
    const existing = await db
      .query(table)
      .withIndex("by_local_id", (q: any) => q.eq("localId", localId))
      .first();
    if (existing) return existing._id;
  }
  return await db.insert(table, { ...fields, ...(localId ? { localId } : {}) });
}
