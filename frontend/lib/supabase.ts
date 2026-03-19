import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

type BookingChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

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
