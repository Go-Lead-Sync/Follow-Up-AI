"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";

export default function AgencyPage() {
  const { user, refresh } = useAuth();
  const [subAccounts, setSubAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [newSubAccount, setNewSubAccount] = useState("");
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "agency_admin" || user?.role === "admin";

  const load = async () => {
    setSubAccounts(await api("/api/agency/sub-accounts"));
    setUsers(await api("/api/agency/users"));
    setOverview(await api("/api/agency/overview"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSubAccount = async (event) => {
    event.preventDefault();
    if (!newSubAccount.trim()) return;
    setError("");
    try {
      await api("/api/agency/sub-accounts", { method: "POST", body: { name: newSubAccount } });
      setNewSubAccount("");
      await load();
      await refresh();
    } catch {
      setError("Unable to create sub-account.");
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/api/agency/users", { method: "POST", body: userForm });
      setUserForm({ name: "", email: "", password: "", role: "user" });
      await load();
    } catch (err) {
      setError(err.data?.error === "email_taken" ? "That email is already in use." : "Unable to create user.");
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h2 className="section-title">Agency Overview</h2>
        {overview && (
          <div className="stats">
            <div className="stat"><strong>{overview.subAccounts}</strong>Sub-Accounts</div>
            <div className="stat"><strong>{overview.contacts}</strong>Total Contacts</div>
            {overview.opportunities.map((o) => (
              <div key={o.status} className="stat"><strong>{o.count}</strong>{o.status} (${o.value})</div>
            ))}
          </div>
        )}

        <h2 className="section-title" style={{ marginTop: 24 }}>Sub-Accounts</h2>
        {isAdmin && (
          <form onSubmit={createSubAccount} className="inline">
            <input value={newSubAccount} onChange={(e) => setNewSubAccount(e.target.value)} placeholder="New client location name" />
            <button className="cta" type="submit" style={{ marginTop: 0, width: "auto" }}>Create</button>
          </form>
        )}
        <div className="list" style={{ marginTop: 12 }}>
          {subAccounts.map((s) => (
            <div key={s.id} className="list-item">
              <strong>{s.name}</strong>
              <div className="small">{new Date(s.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        {error && <div className="footer">{error}</div>}
      </div>

      <div className="card">
        <h2 className="section-title">Team</h2>
        {isAdmin && (
          <form onSubmit={createUser} className="form-grid">
            <div>
              <label>Name</label>
              <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
            <div>
              <label>Role</label>
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="agency_view">Agency View-Only</option>
                <option value="agency_admin">Agency Admin</option>
              </select>
            </div>
          </form>
        )}
        {isAdmin && <button className="cta" type="button" onClick={createUser}>Add Team Member</button>}
        <div className="list" style={{ marginTop: 12 }}>
          {users.map((u) => (
            <div key={u.id} className="list-item">
              <strong>{u.name}</strong>
              <div className="small">{u.email} &middot; {u.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
