'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface RoomDraft {
  name: string;
  capacity: string;
  amenities: string;
}

export default function NewLocationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [workspaceCompanyId, setWorkspaceCompanyId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [rooms, setRooms] = useState<RoomDraft[]>([{ name: '', capacity: '', amenities: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user?.role !== 'GLOBAL_ADMIN') {
      router.push('/calendar');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user?.role === 'GLOBAL_ADMIN') {
      api.globalAdmin.workspaceCompany()
        .then(c => setWorkspaceCompanyId(c.id))
        .catch(() => setError('Could not load workspace company'));
    }
  }, [user, loading]);

  if (loading || user?.role !== 'GLOBAL_ADMIN') return null;

  function addRoom() {
    setRooms(r => [...r, { name: '', capacity: '', amenities: '' }]);
  }

  function removeRoom(index: number) {
    setRooms(r => r.filter((_, i) => i !== index));
  }

  function updateRoom(index: number, field: keyof RoomDraft, value: string) {
    setRooms(r => r.map((room, i) => i === index ? { ...room, [field]: value } : room));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Location name is required'); return; }
    if (!workspaceCompanyId) { setError('Workspace company not loaded yet'); return; }

    const validRooms = rooms.filter(r => r.name.trim() && r.capacity.trim());

    setSubmitting(true);
    setError('');
    try {
      const location = await api.globalAdmin.createLocation({
        name: name.trim(),
        address: address.trim() || undefined,
        color,
        companyId: workspaceCompanyId,
      });

      await Promise.all(
        validRooms.map(r =>
          api.globalAdmin.createRoom(location.id, {
            name: r.name.trim(),
            capacity: parseInt(r.capacity, 10),
            amenities: r.amenities.split(',').map(a => a.trim()).filter(Boolean),
          })
        )
      );

      router.push('/global-admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/global-admin" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">New Location</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add a new office to Nammu Workplace</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-medium text-slate-700 text-sm uppercase tracking-wider">Location details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Shoreditch"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 123 Great Eastern Street, London"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-slate-200"
              />
              <span className="text-sm text-slate-500">{color}</span>
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-700 text-sm uppercase tracking-wider">Rooms</h2>
            <button
              type="button"
              onClick={addRoom}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add room
            </button>
          </div>

          {rooms.map((room, index) => (
            <div key={index} className="border border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Room {index + 1}</span>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(index)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={room.name}
                    onChange={e => updateRoom(index, 'name', e.target.value)}
                    placeholder="e.g. The Loft"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={room.capacity}
                    onChange={e => updateRoom(index, 'capacity', e.target.value)}
                    placeholder="8"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Amenities <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={room.amenities}
                  onChange={e => updateRoom(index, 'amenities', e.target.value)}
                  placeholder="e.g. Projector, Whiteboard, Video conferencing"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}

          <p className="text-xs text-slate-400">Rooms with no name or capacity will be skipped.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create location'}
          </button>
          <Link
            href="/global-admin"
            className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
