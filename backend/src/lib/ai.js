const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile";

export async function groqComplete(messages, { temperature = 0.4 } = {}) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, temperature, messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export function buildAgentPrompt(subAccount, contact, { channel, goal }) {
  return `You are the follow-up assistant for ${subAccount.name}.
Tone: ${subAccount.tone || "N/A"}
Instruction block: ${subAccount.instruction_block || "N/A"}
Do list: ${subAccount.do_list || "N/A"}
Don't list: ${subAccount.dont_list || "N/A"}
Hours: ${subAccount.hours || "N/A"}
Policies: ${subAccount.policies || "N/A"}
FAQs: ${subAccount.faqs || "N/A"}
Booking link: ${subAccount.booking_link || "N/A"}

Contact: ${contact.name}
Status: ${contact.status || "unknown"}
Last appointment: ${contact.last_appointment || "unknown"}
Notes: ${contact.notes || "none"}

${goal}
Respond with a concise, helpful ${channel.toUpperCase()} message.`;
}
