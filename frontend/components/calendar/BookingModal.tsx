'use client';

import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface Room {
  id: string;
  name: string;
  capacity: number;
}

interface Colleague {
  id: string;
  name: string;
  email: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillRoomId?: string;
  prefillStart?: string;
  prefillEnd?: string;
  rooms: Room[];
}

// 08:00 → 18:00 in 30-min steps
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 18 && m > 0) break;
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

// ISO weekday names
const DOW_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function isoToDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function isoToTimeSlot(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = Math.round(d.getMinutes() / 30) * 30 === 60 ? 0 : Math.round(d.getMinutes() / 30) * 30;
  const adjustedH = Math.round(d.getMinutes() / 30) * 30 === 60 ? h + 1 : h;
  const slot = `${adjustedH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return TIME_SLOTS.includes(slot) ? slot : '09:00';
}

function calcDuration(start: string, end: string): { label: string; hours: number } {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return { label: '', hours: 0 };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = h > 0 && m > 0 ? `${h}h ${m}min` : h > 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${m} min`;
  return { label, hours: mins / 60 };
}

function getIsoDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day; // Sunday=7
}

export default function BookingModal({
  isOpen, onClose, onSuccess,
  prefillRoomId, prefillStart, prefillEnd,
  rooms,
}: BookingModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<{ tokensTotal: number; tokensUsed: number; tokensRemaining: number } | null>(null);

  // Invite state
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteeConflicts, setInviteeConflicts] = useState<Record<string, { bookingTitle: string; roomName: string; startTime: string }>>({});

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringResult, setRecurringResult] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setNotes('');
    setError('');
    setTokenBalance(null);
    setSelectedInvitees([]);
    setInviteOpen(false);
    setInviteeConflicts({});
    setIsRecurring(false);
    setRecurringEndDate('');
    setRecurringResult(null);
    setRoomId(prefillRoomId || rooms[0]?.id || '');
    if (prefillStart) {
      setDate(isoToDateStr(prefillStart));
      setStartTime(isoToTimeSlot(prefillStart));
    } else {
      setDate(todayStr());
      setStartTime('09:00');
    }
    if (prefillEnd) {
      setEndTime(isoToTimeSlot(prefillEnd));
    } else {
      setEndTime('10:00');
    }
    api.bookings.tokenBalance().then(setTokenBalance).catch(() => {});
    api.bookings.colleagues().then(setColleagues).catch(() => {});
  }, [isOpen, prefillRoomId, prefillStart, prefillEnd, rooms]);

  // Debounced invitee conflict check
  useEffect(() => {
    if (selectedInvitees.length === 0 || !date || endTime <= startTime) {
      setInviteeConflicts({});
      return;
    }
    const startISO = new Date(`${date}T${startTime}:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00`).toISOString();
    const timer = setTimeout(() => {
      api.bookings.checkInviteeConflicts({ inviteeIds: selectedInvitees, startTime: startISO, endTime: endISO })
        .then(conflicts => {
          const map: Record<string, { bookingTitle: string; roomName: string; startTime: string }> = {};
          for (const c of conflicts) map[c.userId] = { bookingTitle: c.bookingTitle, roomName: c.roomName, startTime: c.startTime };
          setInviteeConflicts(map);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedInvitees, date, startTime, endTime]);

  if (!isOpen) return null;

  const selectedRoom = rooms.find(r => r.id === roomId);
  const endOptions = TIME_SLOTS.filter(t => t > startTime);
  const { label: durationLabel, hours: durationHours } = calcDuration(startTime, endTime);
  const tokenCost = Math.round((durationHours) * 100) / 100;
  const tokensAfter = tokenBalance ? tokenBalance.tokensRemaining - tokenCost : null;
  const insufficientTokens = tokenBalance !== null && tokenCost > tokenBalance.tokensRemaining;

  const dayOfWeek = getIsoDayOfWeek(date);
  const dayName = DOW_NAMES[dayOfWeek];

  function handleStartChange(val: string) {
    setStartTime(val);
    const [sh, sm] = val.split(':').map(Number);
    const newEndMins = sh * 60 + sm + 60;
    const newEndH = Math.floor(newEndMins / 60);
    const newEndM = newEndMins % 60;
    const newEnd = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
    if (TIME_SLOTS.includes(newEnd)) setEndTime(newEnd);
  }

  function toggleInvitee(id: string) {
    setSelectedInvitees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!roomId) { setError('Please select a room.'); return; }
    if (!date) { setError('Please select a date.'); return; }
    if (endTime <= startTime) { setError('End time must be after start time.'); return; }
    if (isRecurring && !recurringEndDate) { setError('Please select a repeat end date.'); return; }
    if (selectedRoom) {
      const attendeeCount = 1 + selectedInvitees.length;
      if (attendeeCount > selectedRoom.capacity) {
        setError(`This room fits ${selectedRoom.capacity} people. You have ${attendeeCount} attendees (including yourself).`);
        return;
      }
    }

    setLoading(true);
    try {
      if (isRecurring) {
        const result = await api.bookings.createRecurring({
          title,
          roomId,
          startTime,
          endTime,
          notes: notes || undefined,
          dayOfWeek,
          endDate: new Date(recurringEndDate).toISOString(),
        });
        setRecurringResult({ created: result.created, skipped: result.skipped });
        onSuccess();
        // Don't close immediately — show result
        return;
      }

      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();
      await api.bookings.create({
        title,
        roomId,
        startTime: startISO,
        endTime: endISO,
        notes: notes || undefined,
        inviteeIds: selectedInvitees.length > 0 ? selectedInvitees : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  // Pending users can view but not book
  if (isOpen && user?.status === 'PENDING') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(26,26,26,0.45)' }}
        onClick={onClose}
      >
        <div className="bg-white w-full max-w-md shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--th-pink-light)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-pink)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-medium mb-2" style={{ color: 'var(--th-text)' }}>Account Pending Approval</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--th-muted)' }}>
            Your account is awaiting approval from your company admin. You'll be able to book rooms once approved.
          </p>
          <button
            onClick={onClose}
            className="text-xs font-medium tracking-[0.1em] uppercase px-6 py-2.5 border transition-colors"
            style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Recurring success screen
  if (recurringResult) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(26,26,26,0.45)' }}
      >
        <div className="bg-white w-full max-w-md shadow-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E8F5E9' }}>
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-base font-medium mb-2" style={{ color: 'var(--th-text)' }}>Recurring Series Created</h2>
          <p className="text-sm mb-1" style={{ color: 'var(--th-muted)' }}>
            <strong>{recurringResult.created}</strong> booking{recurringResult.created !== 1 ? 's' : ''} created
          </p>
          {recurringResult.skipped > 0 && (
            <p className="text-sm mb-4" style={{ color: 'var(--th-muted)' }}>
              <strong>{recurringResult.skipped}</strong> skipped due to conflicts
            </p>
          )}
          <button
            onClick={onClose}
            className="text-xs font-medium tracking-[0.1em] uppercase px-6 py-2.5 border transition-colors"
            style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(26,26,26,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--th-border)' }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--th-muted)' }}>
              Reserve a room
            </p>
            <h2 className="text-base font-medium tracking-wide" style={{ color: 'var(--th-text)' }}>New Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 transition-colors"
            style={{ color: 'var(--th-muted)' }}
            onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-text)')}
            onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-muted)')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 text-xs tracking-wide border" style={{ backgroundColor: 'var(--th-pink-light)', borderColor: 'var(--th-pink-mid)', color: '#B85A45' }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
              Meeting title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Q1 Planning"
              className="w-full px-3 py-2.5 border text-sm focus:outline-none bg-white placeholder-[#C5BDB9]"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
            />
          </div>

          {/* Room selector */}
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
              Room
            </label>
            <div className={`grid gap-2 ${rooms.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {rooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setRoomId(room.id)}
                  className="px-4 py-3 border-2 text-left transition-all"
                  style={{
                    borderColor: roomId === room.id ? 'var(--th-pink)' : 'var(--th-border)',
                    backgroundColor: roomId === room.id ? 'var(--th-pink-light)' : '#ffffff',
                  }}
                >
                  <p className="text-xs font-semibold tracking-wide" style={{ color: roomId === room.id ? 'var(--th-pink)' : 'var(--th-text)' }}>
                    {room.name}
                  </p>
                  <p className="text-[10px] mt-0.5 tracking-wide" style={{ color: 'var(--th-muted)' }}>
                    Up to {room.capacity} people
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 border text-sm focus:outline-none bg-white"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
                Start time
              </label>
              <select
                value={startTime}
                onChange={e => handleStartChange(e.target.value)}
                className="w-full px-3 py-2.5 border text-sm focus:outline-none bg-white"
                style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
              >
                {TIME_SLOTS.slice(0, -1).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
                End time
              </label>
              <select
                value={endOptions.includes(endTime) ? endTime : endOptions[0] ?? endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 border text-sm focus:outline-none bg-white"
                style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
              >
                {endOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration summary */}
          {durationLabel && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs tracking-wide border" style={{
              backgroundColor: durationHours > 3 ? '#FFF8F0' : 'var(--th-warm)',
              borderColor: durationHours > 3 ? '#F0C080' : 'var(--th-border)',
              color: durationHours > 3 ? '#A06020' : 'var(--th-muted)',
            }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Duration: <strong>{durationLabel}</strong>
                {selectedRoom && <span> · {selectedRoom.name}</span>}
                {durationHours > 3 && <span className="font-semibold"> · Requires admin approval</span>}
              </span>
            </div>
          )}

          {/* Token cost info */}
          {durationHours > 0 && tokenBalance !== null && (
            <div
              className="px-3 py-2.5 text-xs tracking-wide border"
              style={{
                backgroundColor: insufficientTokens ? 'var(--th-pink-light)' : 'var(--th-warm)',
                borderColor: insufficientTokens ? 'var(--th-pink-mid)' : 'var(--th-border)',
                color: insufficientTokens ? '#B85A45' : 'var(--th-muted)',
              }}
            >
              {insufficientTokens ? (
                <span className="font-semibold">
                  Not enough tokens — this booking will be sent to the office admin for approval
                </span>
              ) : (
                <span>
                  Cost: <strong>{tokenCost} token{tokenCost !== 1 ? 's' : ''}</strong>
                  {tokensAfter !== null && (
                    <> — <strong>{tokensAfter.toFixed(2)}</strong> remaining after this booking</>
                  )}
                </span>
              )}
              <div className="mt-1 opacity-75">
                Cancellations receive a refund only if made 2+ hours before the start time
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
              Notes <span className="font-normal normal-case tracking-normal">· optional</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Agenda, attendees, requirements…"
              className="w-full px-3 py-2.5 border text-sm focus:outline-none resize-none bg-white placeholder-[#C5BDB9]"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
            />
          </div>

          {/* Invite colleagues */}
          {colleagues.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setInviteOpen(o => !o)}
                className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--th-muted)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite colleagues
                {selectedInvitees.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full" style={{ backgroundColor: 'var(--th-pink)', color: '#fff' }}>
                    {selectedInvitees.length}
                  </span>
                )}
              </button>
              {inviteOpen && (
                <div className="border max-h-36 overflow-y-auto" style={{ borderColor: 'var(--th-border)' }}>
                  {colleagues.map(c => {
                    const conflict = inviteeConflicts[c.id];
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm"
                        style={{ color: 'var(--th-text)' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInvitees.includes(c.id)}
                          onChange={() => toggleInvitee(c.id)}
                          className="w-3.5 h-3.5"
                          style={{ accentColor: 'var(--th-pink)' }}
                        />
                        <span className="font-medium text-xs">{c.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--th-muted)' }}>{c.email}</span>
                        {conflict && (
                          <span
                            className="ml-auto text-[10px] flex items-center gap-1"
                            style={{ color: '#A06020' }}
                            title={`Already booked: ${conflict.roomName} at ${new Date(conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            Conflict
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedInvitees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedInvitees.map(id => {
                    const c = colleagues.find(x => x.id === id);
                    const conflict = inviteeConflicts[id];
                    return c ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] border"
                        style={{
                          borderColor: conflict ? '#F0C080' : 'var(--th-pink-mid)',
                          color: conflict ? '#A06020' : 'var(--th-pink)',
                          backgroundColor: conflict ? '#FFF8F0' : 'var(--th-pink-light)',
                        }}
                      >
                        {conflict && (
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                        )}
                        {c.name}
                        <button type="button" onClick={() => toggleInvitee(id)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {Object.keys(inviteeConflicts).filter(id => selectedInvitees.includes(id)).length > 0 && (
                <div className="mt-2 px-3 py-2 text-xs border" style={{ backgroundColor: '#FFF8F0', borderColor: '#F0C080', color: '#A06020' }}>
                  {Object.keys(inviteeConflicts).filter(id => selectedInvitees.includes(id)).length === 1
                    ? '1 invitee has a conflicting booking — you can still proceed'
                    : `${Object.keys(inviteeConflicts).filter(id => selectedInvitees.includes(id)).length} invitees have conflicting bookings — you can still proceed`}
                </div>
              )}
            </div>
          )}

          {/* Repeat weekly toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="w-3.5 h-3.5"
                style={{ accentColor: 'var(--th-pink)' }}
              />
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--th-muted)' }}>
                Repeat weekly
              </span>
            </label>
            {isRecurring && (
              <div className="mt-3 pl-5 space-y-2">
                <p className="text-xs" style={{ color: 'var(--th-muted)' }}>
                  Repeats every <strong>{dayName}</strong> at {startTime}–{endTime}
                </p>
                <div>
                  <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: 'var(--th-muted)' }}>
                    Repeat until
                  </label>
                  <input
                    type="date"
                    value={recurringEndDate}
                    min={date}
                    onChange={e => setRecurringEndDate(e.target.value)}
                    required={isRecurring}
                    className="w-full px-3 py-2 border text-sm focus:outline-none bg-white"
                    style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border text-xs font-semibold tracking-[0.15em] uppercase transition-colors"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-muted)' }}
              onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-text)')}
              onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-muted)')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title || !roomId}
              className="flex-1 py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
            >
              {loading ? 'Booking…' : isRecurring ? 'Create series' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
