import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Authentication is not configured yet.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Authentication is not configured yet.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function updateDisplayName(name: string) {
  if (!supabase) throw new Error('Authentication is not configured yet.');
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 80) throw new Error('Name must be between 1 and 80 characters.');
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: cleanName } });
  if (error) throw error;
  return data.user;
}

export async function updateEmail(email: string) {
  if (!supabase) throw new Error('Authentication is not configured yet.');
  const { data, error } = await supabase.auth.updateUser({
    email: email.trim(),
  }, { emailRedirectTo: window.location.origin });
  if (error) throw error;
  return data.user;
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Authentication is not configured yet.');
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
