"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signup(agencyName, name, email, password);
    } catch (err) {
      if (err.data?.error === "email_taken") setError("That email is already registered.");
      else setError("Unable to create your agency. Password must be at least 8 characters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="logo" style={{ marginBottom: 24 }}>
          <span className="logo-mark" />
          Follow-Up AI
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h2 className="section-title">Create your agency</h2>
          <div className="form-grid">
            <div>
              <label>Agency Name</label>
              <input required value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Acme Marketing" />
            </div>
            <div>
              <label>Your Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <button className="cta" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Agency"}
          </button>
          {error && <div className="footer">{error}</div>}
          <div className="footer">
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
