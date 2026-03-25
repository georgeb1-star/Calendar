import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

type BookingChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

export async function uploadRoomPhoto(file: File): Promise<string> {
  // Strip ALL whitespace (handles newlines, tabs, spaces inside Vercel env vars)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\s/g, '');
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/\s/g, '');

  if (!url || !key) throw new Error('Supabase is not configured');

  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Bypass the SDK — call the Supabase Storage REST API directly
  const res = await fetch(`${url}/storage/v1/object/room-photos/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': file.type || 'image/jpeg',
      'x-upsert': 'false',
    },
    body: file,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `Upload failed: ${res.status}`);
  }

  return `${url}/storage/v1/object/public/room-photos/${path}`;
}

export function subscribeToBookings(handler: BookingChangeHandler): (() => void) | null {
  if (!supabase) {
    console.warn('[Realtime] Supabase not configured — realtime updates disabled');
    return null;
  }

  const channel: RealtimeChannel = supabase
    .channel('booking-changes')
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'Booking' },
      (payload: any) => handler(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
