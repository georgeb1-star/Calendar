'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { api } from '@/lib/api';
import { uploadRoomPhoto } from '@/lib/supabase';

interface Room {
  id: string;
  name: string;
  capacity: number;
  amenities: string[];
  photoUrl?: string | null;
  isActive: boolean;
}

export default function RoomTable() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: '', amenities: '' });
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', capacity: '', amenities: '', photoUrl: '' as string | null, isActive: true });
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.admin.rooms.list();
      setRooms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleFormPhotoChange(file: File | null) {
    setFormPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setFormPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFormPhotoPreview(null);
    }
  }

  function handleEditPhotoChange(file: File | null) {
    setEditPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setEditPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setEditPhotoPreview(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const amenities = form.amenities
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      let photoUrl: string | undefined;
      if (formPhotoFile) {
        try {
          photoUrl = await uploadRoomPhoto(formPhotoFile);
        } catch {
          setFormError('Photo upload failed — room not created');
          return;
        }
      }
      await api.rooms.create({
        name: form.name,
        capacity: parseInt(form.capacity, 10),
        amenities,
        photoUrl,
      });
      setForm({ name: '', capacity: '', amenities: '' });
      setFormPhotoFile(null);
      setFormPhotoPreview(null);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setFormLoading(false);
    }
  }

  function startEdit(room: Room) {
    setEditingId(room.id);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditForm({
      name: room.name,
      capacity: room.capacity.toString(),
      amenities: room.amenities.join(', '),
      photoUrl: room.photoUrl ?? null,
      isActive: room.isActive,
    });
  }

  async function saveEdit(id: string) {
    try {
      const amenities = editForm.amenities
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      let photoUrl: string | null = editForm.photoUrl ?? null;
      if (editPhotoFile) {
        photoUrl = await uploadRoomPhoto(editPhotoFile);
      }
      await api.rooms.update(id, {
        name: editForm.name,
        capacity: parseInt(editForm.capacity, 10),
        amenities,
        photoUrl,
        isActive: editForm.isActive,
      });
      setEditingId(null);
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update room');
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Rooms</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage meeting rooms for this location.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add room
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Create new room</h4>
          {formError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input
              type="text" placeholder="Room name" required
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number" placeholder="Capacity" required min={1}
              value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Amenities (comma-separated, e.g. TV, Whiteboard)"
              value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })}
              className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Room photo · optional</label>
              <div className="flex items-center gap-3">
                <input
                  type="file" accept="image/*"
                  onChange={e => handleFormPhotoChange(e.target.files?.[0] ?? null)}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:border file:border-slate-200 file:rounded file:text-xs file:bg-white file:text-slate-600 hover:file:bg-slate-50"
                />
                {formPhotoPreview && (
                  <img src={formPhotoPreview} alt="Preview" className="w-12 h-12 object-cover rounded border border-slate-200" />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit" disabled={formLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm rounded-lg transition-colors"
              >
                {formLoading ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amenities</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Photo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No rooms yet. Add your first room above.
                </td>
              </tr>
            )}
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                {editingId === room.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number" min={1}
                        value={editForm.capacity}
                        onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                        className="w-16 px-2 py-1 border border-blue-400 rounded text-sm text-center focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.amenities}
                        onChange={e => setEditForm({ ...editForm, amenities: e.target.value })}
                        placeholder="Amenities (comma-separated)"
                        className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {(editPhotoPreview || editForm.photoUrl) && (
                          <img
                            src={editPhotoPreview ?? editForm.photoUrl!}
                            alt="Room"
                            className="w-10 h-10 object-cover rounded border border-blue-200"
                          />
                        )}
                        <input
                          type="file" accept="image/*"
                          onChange={e => handleEditPhotoChange(e.target.files?.[0] ?? null)}
                          className="text-[10px] text-slate-500 w-20 file:hidden cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <select
                        value={editForm.isActive ? 'true' : 'false'}
                        onChange={e => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                        className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveEdit(room.id)}
                          className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-800">{room.name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{room.capacity}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {room.amenities.length > 0 ? room.amenities.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {room.photoUrl ? (
                        <img
                          src={room.photoUrl}
                          alt={room.name}
                          className="w-10 h-10 object-cover rounded border border-slate-200 mx-auto"
                        />
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        room.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {room.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(room)}
                        className="px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded hover:text-slate-700 hover:border-slate-300 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
