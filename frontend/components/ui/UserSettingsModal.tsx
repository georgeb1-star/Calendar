'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserSettingsModalProps {
  onClose: () => void;
}

export default function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { user, updateUser } = useAuth();
  const [emailReminders, setEmailReminders] = useState(user?.emailReminders ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.auth.updateMe({ emailReminders });
      updateUser({ emailReminders: updated.emailReminders });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(26,26,26,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--th-border)' }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--th-muted)' }}>
              Account
            </p>
            <h2 className="text-base font-medium tracking-wide" style={{ color: 'var(--th-text)' }}>Settings</h2>
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

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--th-muted)' }}>
              Email notifications
            </p>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>Booking reminders</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--th-muted)' }}>
                  Receive an email 30 minutes before your booking starts
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailReminders}
                onClick={() => setEmailReminders(v => !v)}
                className="relative flex-shrink-0 ml-4 w-10 h-5 rounded-full transition-colors duration-200"
                style={{ backgroundColor: emailReminders ? 'var(--th-pink)' : '#D1C9C5' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: emailReminders ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border text-xs font-semibold tracking-[0.15em] uppercase transition-colors"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-50"
              style={{ backgroundColor: saved ? '#4CAF50' : 'var(--th-pink)', color: '#ffffff' }}
            >
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
