'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: { id: string; name: string; color: string };
}

interface Company {
  id: string;
  name: string;
}

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', name: '', companyId: '', role: 'EMPLOYEE',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userList, roomList] = await Promise.all([
        api.admin.users.list(),
        api.rooms.list(), // reuse to get company info
      ]);
      setUsers(userList);
      // Extract unique companies from user list
      const companyMap = new Map<string, Company>();
      userList.forEach((u: User) => {
        if (!companyMap.has(u.company.id)) {
          companyMap.set(u.company.id, { id: u.company.id, name: u.company.name });
        }
      });
      setCompanies(Array.from(companyMap.values()));
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
      await api.admin.users.create(form);
      setForm({ email: '', password: '', name: '', companyId: '', role: 'EMPLOYEE' });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-700">All Users</h3>
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
              required value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.company.color }} />
                    <span className="text-slate-600">{u.company.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : u.role === 'COMPANY_ADMIN'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u.id, u.name)}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
