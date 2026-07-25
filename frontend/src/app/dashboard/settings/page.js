"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi, api as rawApi } from "../../../lib/api";

const FIELD_TYPES = ["text", "textarea", "number", "phone", "dropdown", "checkbox", "radio", "date", "monetary", "signature"];

export default function SettingsPage() {
  const { subAccountId, currentSubAccount, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tags, setTags] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldForm, setFieldForm] = useState({ name: "", fieldKey: "", type: "text" });
  const [values, setValues] = useState([]);
  const [valueForm, setValueForm] = useState({ key: "", value: "" });
  const [scanUrl, setScanUrl] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const api = subAccountId ? subAccountApi(subAccountId) : null;

  useEffect(() => {
    if (currentSubAccount) {
      setProfile({
        name: currentSubAccount.name,
        tone: currentSubAccount.tone || "",
        instructionBlock: currentSubAccount.instruction_block || "",
        doList: currentSubAccount.do_list || "",
        dontList: currentSubAccount.dont_list || "",
        bookingLink: currentSubAccount.booking_link || "",
        hours: currentSubAccount.hours || "",
        policies: currentSubAccount.policies || "",
        faqs: currentSubAccount.faqs || "",
        leadconnectorLocationId: currentSubAccount.leadconnector_location_id || "",
      });
    }
  }, [currentSubAccount]);

  const load = async () => {
    if (!api) return;
    setTags(await api.get("/tags"));
    setFields(await api.get("/custom-fields"));
    setValues(await api.get("/custom-values"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  const saveProfile = async () => {
    if (!subAccountId || !profile) return;
    setSaving(true);
    setMessage("");
    try {
      await rawApi(`/api/agency/sub-accounts/${subAccountId}`, { method: "PUT", body: profile });
      await refresh();
      setMessage("Saved.");
    } catch {
      setMessage("Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const applyScan = () => {
    if (!scanResult?.profile) return;
    const p = scanResult.profile;
    setProfile((prev) => ({
      ...prev,
      name: p.name || prev.name,
      tone: p.tone || prev.tone,
      instructionBlock: p.instructionBlock || prev.instructionBlock,
      doList: p.doList || prev.doList,
      dontList: p.dontList || prev.dontList,
      bookingLink: p.bookingLink || prev.bookingLink,
      hours: p.hours || prev.hours,
      policies: p.policies || prev.policies,
      faqs: p.faqs || prev.faqs,
    }));
  };

  const runScan = async () => {
    if (!api || !scanUrl.trim()) return;
    setScanLoading(true);
    try {
      setScanResult(await api.post("/scan", { url: scanUrl, maxPages: 20 }));
    } catch {
      setMessage("Unable to scan site.");
    } finally {
      setScanLoading(false);
    }
  };

  const deleteTag = async (id) => {
    if (!api) return;
    await api.del(`/tags/${id}`);
    await load();
  };

  const createField = async (event) => {
    event.preventDefault();
    if (!api || !fieldForm.name.trim() || !fieldForm.fieldKey.trim()) return;
    await api.post("/custom-fields", fieldForm);
    setFieldForm({ name: "", fieldKey: "", type: "text" });
    await load();
  };

  const deleteField = async (id) => {
    if (!api) return;
    await api.del(`/custom-fields/${id}`);
    await load();
  };

  const saveValue = async (event) => {
    event.preventDefault();
    if (!api || !valueForm.key.trim()) return;
    await api.post("/custom-values", valueForm);
    setValueForm({ key: "", value: "" });
    await load();
  };

  const deleteValue = async (id) => {
    if (!api) return;
    await api.del(`/custom-values/${id}`);
    await load();
  };

  if (!profile) return null;

  return (
    <section className="grid">
      <div className="card">
        <h2 className="section-title">Business / Agent Profile</h2>
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label>Tone</label>
            <input value={profile.tone} onChange={(e) => setProfile({ ...profile, tone: e.target.value })} />
          </div>
          <div>
            <label>Instruction Block</label>
            <textarea rows={3} value={profile.instructionBlock} onChange={(e) => setProfile({ ...profile, instructionBlock: e.target.value })} />
          </div>
          <div>
            <label>Do List</label>
            <textarea rows={3} value={profile.doList} onChange={(e) => setProfile({ ...profile, doList: e.target.value })} />
          </div>
          <div>
            <label>Don&apos;t List</label>
            <textarea rows={3} value={profile.dontList} onChange={(e) => setProfile({ ...profile, dontList: e.target.value })} />
          </div>
          <div>
            <label>Booking Link</label>
            <input value={profile.bookingLink} onChange={(e) => setProfile({ ...profile, bookingLink: e.target.value })} />
          </div>
          <div>
            <label>LeadConnector Location ID</label>
            <input value={profile.leadconnectorLocationId} onChange={(e) => setProfile({ ...profile, leadconnectorLocationId: e.target.value })} />
          </div>
          <div>
            <label>Hours</label>
            <input value={profile.hours} onChange={(e) => setProfile({ ...profile, hours: e.target.value })} />
          </div>
          <div>
            <label>Policies</label>
            <textarea rows={3} value={profile.policies} onChange={(e) => setProfile({ ...profile, policies: e.target.value })} />
          </div>
          <div>
            <label>FAQs</label>
            <textarea rows={3} value={profile.faqs} onChange={(e) => setProfile({ ...profile, faqs: e.target.value })} />
          </div>
        </div>
        <button className="cta" type="button" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {message && <div className="footer">{message}</div>}

        <div className="panel" style={{ marginTop: 20 }}>
          <div className="small">Scan a website to auto-fill this profile</div>
          <div className="inline" style={{ marginTop: 8 }}>
            <input value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://example.com" />
            <button className="ghost" type="button" onClick={runScan} disabled={scanLoading}>
              {scanLoading ? "Scanning..." : "Scan"}
            </button>
          </div>
          {scanResult?.profile && (
            <div style={{ marginTop: 10 }}>
              <div className="small">Found: {scanResult.profile.name}</div>
              <button className="pill" type="button" onClick={applyScan} style={{ marginTop: 8 }}>Apply to Profile</button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="card">
          <h2 className="section-title">Tags</h2>
          <div className="inline">
            {tags.map((t) => (
              <span key={t.id} className="chip" onClick={() => deleteTag(t.id)} style={{ cursor: "pointer" }}>
                {t.name} ({t.contact_count}) &times;
              </span>
            ))}
            {tags.length === 0 && <p className="small">No tags yet &mdash; add one from a contact.</p>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Custom Fields</h2>
          <form onSubmit={createField} className="form-grid">
            <div>
              <label>Name</label>
              <input value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} />
            </div>
            <div>
              <label>Key (snake_case)</label>
              <input value={fieldForm.fieldKey} onChange={(e) => setFieldForm({ ...fieldForm, fieldKey: e.target.value })} />
            </div>
            <div>
              <label>Type</label>
              <select value={fieldForm.type} onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}>
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </form>
          <button className="cta" type="button" onClick={createField}>Add Field</button>
          <div className="list" style={{ marginTop: 12 }}>
            {fields.map((f) => (
              <div key={f.id} className="list-item">
                <strong>{f.name}</strong>
                <div className="small">{f.field_key} &middot; {f.type}</div>
                <button className="pill" type="button" onClick={() => deleteField(f.id)} style={{ marginTop: 8 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Custom Values</h2>
          <form onSubmit={saveValue} className="form-grid">
            <div>
              <label>Key</label>
              <input value={valueForm.key} onChange={(e) => setValueForm({ ...valueForm, key: e.target.value })} placeholder="support_phone" />
            </div>
            <div>
              <label>Value</label>
              <input value={valueForm.value} onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })} />
            </div>
          </form>
          <button className="cta" type="button" onClick={saveValue}>Save Value</button>
          <div className="list" style={{ marginTop: 12 }}>
            {values.map((v) => (
              <div key={v.id} className="list-item">
                <strong>{`{{custom_values.${v.key}}}`}</strong>
                <div className="small">{v.value}</div>
                <button className="pill" type="button" onClick={() => deleteValue(v.id)} style={{ marginTop: 8 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
