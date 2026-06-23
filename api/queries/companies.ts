import { eq, like, and, desc, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertCompany } from "@db/schema";
import { getDb } from "./connection";

export async function findAllCompanies(filters?: {
  atsPlatform?: string;
  tier?: string;
  isActive?: boolean;
  search?: string;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.atsPlatform) {
    conditions.push(eq(schema.companies.atsPlatform, filters.atsPlatform as "greenhouse" | "lever" | "workday" | "custom" | "indeed" | "linkedin"));
  }
  if (filters?.tier) {
    conditions.push(eq(schema.companies.tier, filters.tier as "1" | "2" | "3"));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(schema.companies.isActive, filters.isActive));
  }
  if (filters?.search) {
    conditions.push(like(schema.companies.name, `%${filters.search}%`));
  }

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(schema.companies)
          .where(and(...conditions))
          .orderBy(desc(schema.companies.tier), schema.companies.name)
      : db
          .select()
          .from(schema.companies)
          .orderBy(desc(schema.companies.tier), schema.companies.name);

  return query;
}

export async function findCompanyById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findCompanyByName(name: string) {
  const rows = await getDb()
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.name, name))
    .limit(1);
  return rows.at(0);
}

export async function createCompany(data: InsertCompany) {
  const result = await getDb().insert(schema.companies).values(data);
  return result;
}

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  await getDb()
    .update(schema.companies)
    .set(data)
    .where(eq(schema.companies.id, id));
}

export async function deleteCompany(id: number) {
  await getDb()
    .delete(schema.companies)
    .where(eq(schema.companies.id, id));
}

export async function updateCompanyLastScraped(id: number) {
  await getDb()
    .update(schema.companies)
    .set({ lastScraped: new Date() })
    .where(eq(schema.companies.id, id));
}

export async function countCompanies() {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.companies);
  return rows[0]?.count ?? 0;
}
