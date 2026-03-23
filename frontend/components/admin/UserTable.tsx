'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  location?: { id: string; name: string } | null;
}

export default function UserTable() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', name: '', role: 'EMPLOYEE',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const locationId = currentUser?.locationId ?? '';

  const load = useCallback(async () => {
    try {
      const userList = await api.admin.users.list();
      setUsers(userList);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.admin.users.create({ ...form, locationId });
      setForm({ email: '', password: '', name: '', role: 'EMPLOYEE' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.admin.users.delete(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'OFFICE_ADMIN': return 'Office Admin';
      case 'GLOBAL_ADMIN': return 'Global Admin';
      case 'COMPANY_ADMIN': return 'Company Admin';
      case 'ADMIN': return 'Admin (legacy)';
      default: return 'Employee';
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'OFFICE_ADMIN' || role === 'ADMIN') return 'bg-purple-100 text-purple-700';
    if (role === 'GLOBAL_ADMIN') return 'bg-red-100 text-red-700';
    if (role === 'COMPANY_ADMIN') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-700">Users in this location</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add user
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Create new user</h4>
          {formError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input
              type="text" placeholder="Full name" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email" placeholder="Email address" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password" placeholder="Password" required minLength={6}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="OFFICE_ADMIN">Office Admin</option>
              <option value="COMPANY_ADMIN">Company Admin</option>
            </select>
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
