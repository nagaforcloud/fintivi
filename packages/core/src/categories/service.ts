import { and, eq, or } from 'drizzle-orm'
import { categories, categoryRules } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db'

export async function listCategories(db: Db, userId: string) {
  const rows = await db.select()
    .from(categories)
    .where(or(
      eq(categories.isSystem, true),
      and(eq(categories.userId, userId), eq(categories.isSystem, false)),
    ))
    .orderBy(categories.type, categories.name)
  return rows
}

export async function createCategoryRule(
  db: Db,
  userId: string,
  data: { categoryId: string; pattern: string; matchType: 'contains' | 'regex' | 'exact'; priority?: number },
) {
  const [row] = await db.insert(categoryRules).values({
    userId,
    categoryId: data.categoryId,
    pattern: data.pattern,
    matchType: data.matchType,
    priority: data.priority ?? 0,
  }).returning()
  return row!
}

export async function updateCategoryRule(
  db: Db,
  userId: string,
  ruleId: string,
  data: { categoryId?: string; pattern?: string; matchType?: 'contains' | 'regex' | 'exact'; priority?: number },
) {
  const [row] = await db.update(categoryRules)
    .set(data)
    .where(and(eq(categoryRules.id, ruleId), eq(categoryRules.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteCategoryRule(db: Db, userId: string, ruleId: string) {
  const [row] = await db.delete(categoryRules)
    .where(and(eq(categoryRules.id, ruleId), eq(categoryRules.userId, userId)))
    .returning()
  return row ?? null
}
