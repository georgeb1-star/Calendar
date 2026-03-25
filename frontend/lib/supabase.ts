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
  if (!supabase) throw new Error('Supabase is not configured');
  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('room-photos').upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('room-photos').getPublicUrl(path);
  return data.publicUrl;
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
