"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

const CALENDAR_TYPES = ["personal", "round_robin", "collective", "class", "service", "event"];
const STATUS_OPTIONS = ["booked", "confirmed", "cancelled", "showed", "no_show", "reschedule_requested"];

export default function CalendarsPage() {
  const { subAccountId } = useAuth();
  const [calendars, setCalendars] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [calendarForm, setCalendarForm] = useState({ name: "", type: "personal" });
  const [apptForm, setApptForm] = useState({ calendarId: "", contactId: "", startTime: "", endTime: "" });
  const [error, setError] = useState("");

  const api = subAccountId ? subAccountApi(subAccountId) : null;

  const load = async () => {
    if (!api) return;
    setCalendars(await api.get("/calendars"));
    setAppointments(await api.get("/appointments"));
    setContacts(await api.get("/contacts"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  const createCalendar = async (event) => {
    event.preventDefault();
    if (!api || !calendarForm.name.trim()) return;
    await api.post("/calendars", calendarForm);
    setCalendarForm({ name: "", type: "personal" });
    await load();
  };

  const bookAppointment = async (event) => {
    event.preventDefault();
    if (!api) return;
    setError("");
    try {
      await api.post("/appointments", {
        calendarId: apptForm.calendarId || null,
        contactId: apptForm.contactId,
        startTime: new Date(apptForm.startTime).toISOString(),
        endTime: new Date(apptForm.endTime).toISOString(),
      });
      setApptForm({ calendarId: "", contactId: "", startTime: "", endTime: "" });
      await load();
    } catch (err) {
      setError(err.data?.error === "slot_unavailable" ? "That time slot is already booked." : "Unable to book appointment.");
    }
  };

  const setApptStatus = async (id, statusValue) => {
    if (!api) return;
    await api.post(`/appointments/${id}/status`, { status: statusValue });
    await load();
  };

  return (
    <section className="grid">
      <div className="card">
        <h2 className="section-title">Calendars</h2>
        <form onSubmit={createCalendar} className="form-grid">
          <div>
            <label>Name</label>
            <input value={calendarForm.name} onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })} />
          </div>
          <div>
            <label>Type</label>
            <select value={calendarForm.type} onChange={(e) => setCalendarForm({ ...calendarForm, type: e.target.value })}>
              {CALENDAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </form>
        <button className="cta" type="button" onClick={createCalendar}>Create Calendar</button>
        <div className="list" style={{ marginTop: 16 }}>
          {calendars.map((c) => (
            <div key={c.id} className="list-item">
              <strong>{c.name}</strong>
              <div className="small">{c.type}</div>
            </div>
          ))}
        </div>

        <h2 className="section-title" style={{ marginTop: 20 }}>Book Appointment</h2>
        <form onSubmit={bookAppointment} className="form-grid">
          <div>
            <label>Calendar</label>
            <select value={apptForm.calendarId} onChange={(e) => setApptForm({ ...apptForm, calendarId: e.target.value })}>
              <option value="">No calendar</option>
              {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Contact</label>
            <select required value={apptForm.contactId} onChange={(e) => setApptForm({ ...apptForm, contactId: e.target.value })}>
              <option value="">Select contact</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Start</label>
            <input required type="datetime-local" value={apptForm.startTime} onChange={(e) => setApptForm({ ...apptForm, startTime: e.target.value })} />
          </div>
          <div>
            <label>End</label>
            <input required type="datetime-local" value={apptForm.endTime} onChange={(e) => setApptForm({ ...apptForm, endTime: e.target.value })} />
          </div>
        </form>
        <button className="cta" type="button" onClick={bookAppointment}>Book</button>
        {error && <div className="footer">{error}</div>}
      </div>

      <div className="card">
        <h2 className="section-title">Appointments</h2>
        <div className="list">
          {appointments.length === 0 && <p className="small">No appointments booked yet.</p>}
          {appointments.map((a) => (
            <div key={a.id} className="list-item">
              <strong>{new Date(a.start_time).toLocaleString()}</strong>
              <div className="small">{a.status}</div>
              <select
                value={a.status}
                onChange={(e) => setApptStatus(a.id, e.target.value)}
                style={{ marginTop: 8, maxWidth: 220 }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
