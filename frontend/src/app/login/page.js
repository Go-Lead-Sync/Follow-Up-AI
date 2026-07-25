"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.data?.error === "invalid_credentials" ? "Incorrect email or password." : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="logo" style={{ marginBottom: 24 }}>
          <span className="logo-mark" />
          Follow-Up AI
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h2 className="section-title">Log in</h2>
          <div className="form-grid">
            <div>
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <button className="cta" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          {error && <div className="footer">{error}</div>}
          <div className="footer">
            No agency yet? <Link href="/signup">Create one</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
