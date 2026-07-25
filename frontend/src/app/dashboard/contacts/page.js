"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

const emptyForm = { name: "", email: "", phone: "", status: "", notes: "" };

export default function ContactsPage() {
  const { subAccountId } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [newTag, setNewTag] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const api = subAccountId ? subAccountApi(subAccountId) : null;

  const load = async () => {
    if (!api) return;
    setContacts(await api.get("/contacts"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  const addContact = async (event) => {
    event.preventDefault();
    if (!api) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/contacts", form);
      setForm(emptyForm);
      await load();
    } catch {
      setError("Unable to add contact.");
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (contactId) => {
    const tag = (newTag[contactId] || "").trim();
    if (!tag || !api) return;
    await api.post(`/contacts/${contactId}/tags`, { tag });
    setNewTag((prev) => ({ ...prev, [contactId]: "" }));
    await load();
  };

  const removeTag = async (contactId, tag) => {
    if (!api) return;
    await api.del(`/contacts/${contactId}/tags/${encodeURIComponent(tag)}`);
    await load();
  };

  return (
    <section className="grid">
      <div className="card">
        <h2 className="section-title">Add Contact</h2>
        <form onSubmit={addContact}>
          <div className="form-grid">
            <div>
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label>Status</label>
              <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="new, no-show, rebook" />
            </div>
            <div>
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button className="cta" type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Contact"}
          </button>
        </form>
        {error && <div className="footer">{error}</div>}
      </div>

      <div className="card">
        <h2 className="section-title">Contacts ({contacts.length})</h2>
        <div className="list">
          {contacts.length === 0 && <p className="small">No contacts yet.</p>}
          {contacts.map((c) => (
            <div key={c.id} className="list-item">
              <strong>{c.name}</strong>
              <div className="small">{c.email || "no email"} &middot; {c.phone || "no phone"} &middot; {c.status || "no status"}</div>
              <div className="inline" style={{ marginTop: 8 }}>
                {c.tags.map((t) => (
                  <span key={t} className="chip" onClick={() => removeTag(c.id, t)} style={{ cursor: "pointer" }} title="Click to remove">
                    {t} &times;
                  </span>
                ))}
              </div>
              <div className="inline" style={{ marginTop: 8 }}>
                <input
                  placeholder="add tag"
                  value={newTag[c.id] || ""}
                  onChange={(e) => setNewTag((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  style={{ maxWidth: 140 }}
                  onKeyDown={(e) => e.key === "Enter" && addTag(c.id)}
                />
                <button type="button" className="pill" onClick={() => addTag(c.id)}>Add Tag</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
