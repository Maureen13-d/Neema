import { useEffect, useState } from 'react';
import type { Contact } from '@neema/core';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { listContacts, saveContact } from '../services/contacts';
import { LoadingScreen } from '../ui/LoadingScreen';

/** CHP / family / supervisor contacts for escalation. */
export function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Contact['role']>('chp');
  const [busy, setBusy] = useState(true);

  async function refresh() {
    setItems(await listContacts());
    setBusy(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function add() {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    await saveContact({
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      role,
      escalationOrder: items.length + 1,
    });
    setName('');
    setPhone('');
    await refresh();
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        Your people
      </h1>
      <p className="screen-sub">Who Neema should reach when you need help.</p>
      <div className="panel" style={{ marginBottom: '1rem' }}>
        {items.length === 0 ? <p style={{ margin: 0, opacity: 0.75 }}>No contacts yet.</p> : null}
        {items.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.65rem 0',
              borderBottom: '1px solid rgba(255,255,255,.08)',
            }}
          >
            <div>
              <strong>{c.name}</strong>
              <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                {c.role} · {c.phone}
              </div>
            </div>
            <span style={{ opacity: 0.6 }}>#{c.escalationOrder}</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="field">
          <label htmlFor="cname">Name</label>
          <input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cphone">Phone</label>
          <input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="crole">Role</label>
          <select id="crole" value={role} onChange={(e) => setRole(e.target.value as Contact['role'])}>
            <option value="chp">CHP</option>
            <option value="family">Family</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
        <Button variant="primary" onClick={() => void add()}>
          Add contact
        </Button>
      </div>
    </main>
  );
}
