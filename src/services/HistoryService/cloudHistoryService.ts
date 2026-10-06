import { supabase } from '../Auth/supabase';
import type { AnalysisResult } from '../ResultAI/resultai';
import type { HistoryItem } from './historyService';

interface HistoryRow {
  id: string;
  type: HistoryItem['type'];
  query_text: string;
  thumbnail: string | null;
  result: AnalysisResult;
  created_at: string;
}

function requireClient() {
  if (!supabase) throw new Error('Cloud history is not configured.');
  return supabase;
}

function toHistoryItem(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    timestamp: new Date(row.created_at).getTime(),
    type: row.type,
    queryText: row.query_text,
    thumbnail: row.thumbnail || undefined,
    result: row.result,
  };
}

export async function listUserHistory(): Promise<HistoryItem[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('diagnosis_history')
    .select('id, type, query_text, thumbnail, result, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as HistoryRow[]).map(toHistoryItem);
}

export async function addUserHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<HistoryItem> {
  const client = requireClient();
  const { data, error } = await client
    .from('diagnosis_history')
    .insert({
      type: item.type,
      query_text: item.queryText,
      thumbnail: item.thumbnail || null,
      result: item.result,
    })
    .select('id, type, query_text, thumbnail, result, created_at')
    .single();
  if (error) throw error;
  return toHistoryItem(data as HistoryRow);
}

export async function renameUserHistory(id: string, queryText: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('diagnosis_history').update({ query_text: queryText }).eq('id', id);
  if (error) throw error;
}

export async function deleteUserHistory(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('diagnosis_history').delete().eq('id', id);
  if (error) throw error;
}

export async function clearUserHistory(): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('diagnosis_history').delete().not('id', 'is', null);
  if (error) throw error;
}
