/**
 * Supabase Integration Module
 * 
 * This module provides Supabase integration for:
 * - PostgreSQL database (alternative to MySQL)
 * - File storage for resumes, certifications, cover letters
 * - Auth (optional, can be used alongside existing auth)
 * - Real-time subscriptions
 * 
 * To activate: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env
 * Get these from your Supabase dashboard: https://app.supabase.com
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

export function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env");
  }
  return supabase;
}

// ─── Storage Operations ──────────────────────────────────────────

export async function uploadFileToSupabase(
  bucket: string,
  path: string,
  file: Buffer | ArrayBuffer,
  contentType: string
) {
  const sb = getSupabase();
  const { data, error } = await sb.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData.publicUrl };
}

export async function deleteFileFromSupabase(bucket: string, path: string) {
  const sb = getSupabase();
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) throw error;
  return { success: true };
}

export async function listFilesInBucket(bucket: string, prefix: string) {
  const sb = getSupabase();
  const { data, error } = await sb.storage.from(bucket).list(prefix);
  if (error) throw error;
  return data || [];
}

// ─── Database Sync Operations ────────────────────────────────────

export async function syncUserToSupabase(userData: {
  id: string;
  email: string;
  name?: string;
  role?: string;
}) {
  const sb = getSupabase();
  const { error } = await (sb.from("users" as any) as any).upsert(
    {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role || "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  return { success: true };
}

export async function logActivityToSupabase(activity: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: Record<string, unknown>;
}) {
  const sb = getSupabase();
  const { error } = await (sb.from("activity_logs" as any) as any).insert({
    ...activity,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { success: true };
}

/*
SQL Setup Script - Run this in your Supabase SQL Editor:

enable row level security on users;
enable row level security on activity_logs;

create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  action text not null,
  entity_type text not null,
  entity_id bigint,
  details jsonb,
  created_at timestamptz default now()
);
*/
