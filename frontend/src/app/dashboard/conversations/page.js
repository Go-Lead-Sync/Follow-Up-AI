"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subAccountApi } from "../../../lib/api";

export default function ConversationsPage() {
  const { subAccountId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [outbound, setOutbound] = useState("");
  const [inbound, setInbound] = useState("");
  const [autoReply, setAutoReply] = useState(true);

  const api = subAccountId ? subAccountApi(subAccountId) : null;
  const active = conversations.find((c) => c.id === activeId);

  const loadConversations = async () => {
    if (!api) return;
    const list = await api.get("/conversations");
    setConversations(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
  };

  const loadMessages = async () => {
    if (!api || !activeId) return;
    setMessages(await api.get(`/conversations/${activeId}/messages`));
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const sendOutbound = async () => {
    if (!api || !active || !outbound.trim()) return;
    await api.post("/conversations/messages", { contactId: active.contact_id, channel: active.channel, body: outbound });
    setOutbound("");
    await loadMessages();
    await loadConversations();
  };

  const simulateInbound = async () => {
    if (!api || !active || !inbound.trim()) return;
    await api.post("/conversations/inbound", {
      contactId: active.contact_id,
      channel: active.channel,
      body: inbound,
      autoReply,
    });
    setInbound("");
    await loadMessages();
    await loadConversations();
  };

  return (
    <section className="inbox">
      <div className="card inbox-list">
        <h2 className="section-title">Inbox</h2>
        <div className="list">
          {conversations.length === 0 && <p className="small">No conversations yet. Send a message from Contacts or simulate an inbound one here.</p>}
          {conversations.map((c) => (
            <div
              key={c.id}
              className="list-item"
              onClick={() => setActiveId(c.id)}
              style={{ cursor: "pointer", borderColor: c.id === activeId ? "rgba(139,92,246,0.6)" : undefined }}
            >
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <strong>{c.contact_name}</strong>
                <span className="chip">{c.channel}</span>
              </div>
              <div className="small">{c.last_message || "no messages"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card output">
        {!active && <p>Select a conversation.</p>}
        {active && (
          <>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span className="pill">{active.contact_name} &middot; {active.channel}</span>
            </div>
            <div className="thread">
              {messages.map((m) => (
                <div key={m.id} className={`message-card ${m.direction === "outbound" ? "outbound" : "inbound"}`}>
                  <div className="inline">
                    <span className="chip">{m.direction}</span>
                    <span className="small">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <strong>{m.body}</strong>
                  <small>{m.status} &middot; {m.provider}</small>
                </div>
              ))}
            </div>
            <div className="panel">
              <label>Reply</label>
              <textarea rows={2} value={outbound} onChange={(e) => setOutbound(e.target.value)} />
              <button className="cta" type="button" onClick={sendOutbound}>Send</button>
            </div>
            <div className="panel">
              <div className="small">Simulate inbound message (for testing without a live channel connection)</div>
              <textarea rows={2} value={inbound} onChange={(e) => setInbound(e.target.value)} placeholder="What the contact would say back..." style={{ marginTop: 8 }} />
              <label className="inline" style={{ marginTop: 8, alignItems: "center", textTransform: "none", fontSize: 13 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={autoReply} onChange={(e) => setAutoReply(e.target.checked)} />
                &nbsp;Auto-reply with AI
              </label>
              <button className="ghost" type="button" onClick={simulateInbound} style={{ marginTop: 8 }}>Simulate Inbound</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
