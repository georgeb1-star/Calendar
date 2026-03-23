'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CompanyRow {
  id: string;
  name: string;
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;
  userCount: number;
}

export default function CompanyTokenTable() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.globalAdmin.locations();
      setCompanies(data);
    } catch {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(company: CompanyRow) {
    setEditingId(company.id);
    setEditValue(company.tokensTotal.toString());
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function saveEdit(id: string) {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid non-negative number');
      return;
    }
    setSaving(true);
    try {
      await api.globalAdmin.setLocationTokens(id, val);
      await load();
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Company Token Allowances</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Each company gets 3 tokens per day by default (1 token = 1 hour). Balances reset daily.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 text-sm border rounded" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily allowance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Used today</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Users</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{company.name}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === company.id ? (
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-20 px-2 py-1 border border-blue-400 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      autoFocus
                    />
                  ) : (
                    <span className="text-slate-700">{company.tokensTotal}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{company.tokensUsed.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold ${company.tokensRemaining <= 0 ? 'text-red-600' : company.tokensRemaining < 1 ? 'text-amber-600' : 'text-green-600'}`}
                  >
                    {company.tokensRemaining.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{company.userCount}</td>
                <td className="px-4 py-3 text-right">
                  {editingId === company.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => saveEdit(company.id)}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(company)}
                      className="px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded hover:text-slate-700 hover:border-slate-300 transition-colors"
                    >
                      Edit
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
