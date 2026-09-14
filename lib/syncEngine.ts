import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SYNC_QUEUE_KEY = 'wardrunner_sync_queue';
const DEFAULT_CAMPAIGN_ID = process.env.NEXT_PUBLIC_DEFAULT_CAMPAIGN_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncState: SyncState;
}

interface QueuedItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: any;
  timestamp: string;
}

/**
 * Safely get an item from localStorage.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('Error reading from localStorage', e);
    return null;
  }
}

/**
 * Safely set an item in localStorage.
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Error writing to localStorage', e);
  }
}

/**
 * Get the current offline write queue.
 */
function getQueue(): QueuedItem[] {
  const data = safeGetItem(SYNC_QUEUE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing sync queue', e);
    return [];
  }
}

/**
 * Save the offline write queue.
 */
function saveQueue(queue: QueuedItem[]): void {
  safeSetItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wardrunner_queue_updated'));
  }
}

/**
 * Add an item to the offline write queue.
 */
function enqueue(item: Omit<QueuedItem, 'timestamp'>): void {
  const queue = getQueue();
  queue.push({ ...item, timestamp: new Date().toISOString() });
  saveQueue(queue);
}

/**
 * Flush the offline write queue to Supabase.
 */
export async function flushQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  const remainingQueue: QueuedItem[] = [];

  for (const item of queue) {
    try {
      if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.id);
        if (error) throw error;
      } else {
        // Conflict resolution: check if server has newer updated_at
        const { data: serverRecord, error: fetchError } = await supabase
          .from(item.table)
          .select('updated_at')
          .eq('id', item.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "Row not found"
          throw fetchError;
        }

        if (serverRecord?.updated_at && item.payload?.updated_at) {
          const serverTime = new Date(serverRecord.updated_at).getTime();
          const localTime = new Date(item.payload.updated_at).getTime();
          if (serverTime > localTime) {
            console.warn(`Conflict: Skipping queued ${item.operation} for ${item.id} - server has newer data.`);
            continue;
          }
        }

        const { error } = await supabase.from(item.table).upsert(item.payload);
        if (error) throw error;
      }
    } catch (e) {
      console.error(`Failed to flush item ${item.id} to ${item.table}`, e);
      remainingQueue.push(item);
    }
  }

  saveQueue(remainingQueue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('wardrunner_sync_complete'));
  }
}

/**
 * Ping Supabase to verify connectivity.
 */
async function pingSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from('campaigns').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * React hook to track online/offline status and sync queue.
 */
export function useSyncStatus(): SyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const updateStatus = useCallback(() => {
    const queue = getQueue();
    setPendingCount(queue.length);
    if (queue.length > 0 && isOnline) {
      setSyncState('syncing');
      flushQueue();
    } else if (queue.length > 0) {
      setSyncState('offline');
    } else if (!isOnline) {
      setSyncState('offline');
    } else {
      setSyncState('synced');
    }
  }, [isOnline]);

  useEffect(() => {
    updateStatus();
    const handler = () => updateStatus();
    window.addEventListener('wardrunner_queue_updated', handler);
    return () => window.removeEventListener('wardrunner_queue_updated', handler);
  }, [updateStatus]);

  useEffect(() => {
    const handleSyncComplete = () => {
      setLastSyncAt(new Date().toISOString());
      updateStatus();
    };
    window.addEventListener('wardrunner_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('wardrunner_sync_complete', handleSyncComplete);
  }, [updateStatus]);

  useEffect(() => {
    const checkOnline = async () => {
      const actuallyOnline = await pingSupabase();
      setIsOnline(actuallyOnline);
      if (actuallyOnline) flushQueue();
    };
    const setOffline = () => setIsOnline(false);

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', setOffline);

    const interval = setInterval(() => {
      if (navigator.onLine) checkOnline();
    }, 30000); // 30s ping

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', setOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingCount, lastSyncAt, syncState };
}

/**
 * Fetch data from Supabase, falling back to localStorage if offline.
 */
export async function fetchFromSupabase<T>(table: string, storageKey: string, campaignId: string = DEFAULT_CAMPAIGN_ID): Promise<T[]> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;
    
    safeSetItem(storageKey, JSON.stringify(data));
    return data as T[];
  } catch (e) {
    console.error(`Error fetching ${table} from Supabase, falling back to cache.`, e);
    const cached = safeGetItem(storageKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Upsert data to Supabase, queuing for offline if necessary.
 */
export async function upsertToSupabase<T extends { id?: string }>(table: string, storageKey: string, record: T): Promise<T> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const id = record.id || crypto.randomUUID();
  const recordWithId = { ...record, id };

  // Optimistic local cache update
  const cached = safeGetItem(storageKey);
  let localData: any[] = [];
  if (cached) {
    try {
      localData = JSON.parse(cached);
    } catch (e) {}
  }
  const index = localData.findIndex((item) => item.id === id);
  const operation = index >= 0 ? 'update' : 'insert';
  
  if (index >= 0) {
    localData[index] = recordWithId;
  } else {
    localData.push(recordWithId);
  }
  safeSetItem(storageKey, JSON.stringify(localData));

  if (isOnline) {
    const { error } = await supabase.from(table).upsert(recordWithId);
    if (error) {
      console.error(`Error upserting ${table}, queueing.`, error);
      enqueue({ id, table, operation, payload: recordWithId });
    }
  } else {
    enqueue({ id, table, operation, payload: recordWithId });
  }

  return recordWithId as T;
}

/**
 * Delete data from Supabase, queuing for offline if necessary.
 */
export async function deleteFromSupabase(table: string, storageKey: string, id: string): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Optimistic local cache update
  const cached = safeGetItem(storageKey);
  if (cached) {
    try {
      const localData: any[] = JSON.parse(cached);
      const newData = localData.filter((item) => item.id !== id);
      safeSetItem(storageKey, JSON.stringify(newData));
    } catch (e) {}
  }

  if (isOnline) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Error deleting from ${table}, queueing.`, error);
      enqueue({ id, table, operation: 'delete', payload: null });
    }
  } else {
    enqueue({ id, table, operation: 'delete', payload: null });
  }
}

/**
 * Subscribe to Supabase Realtime changes for a table.
 */
export function subscribeToTable(table: string, campaignId: string = DEFAULT_CAMPAIGN_ID, onData: (records: any[]) => void): () => void {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` },
      async () => {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('campaign_id', campaignId);
        
        if (!error && data) {
          onData(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
