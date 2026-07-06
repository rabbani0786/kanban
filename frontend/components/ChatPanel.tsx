"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ChatPanelProps = {
  onSend: (message: string) => Promise<string>;
};

export function ChatPanel({ onSend }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setIsSending(true);
    setError("");

    try {
      const reply = await onSend(trimmed);
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
    } catch {
      setError("The assistant could not process that. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="chat-panel" aria-label="AI assistant chat">
      <h2 className="chat-panel-title">AI Assistant</h2>
      <div className="chat-panel-messages">
        {messages.length === 0 ? (
          <p className="chat-panel-empty">
            Ask me to create, edit, or move cards — e.g. &quot;Add a card called &apos;Write
            tests&apos; to Backlog&quot;.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-message-${message.role}`}>
            {message.text}
          </div>
        ))}
        {isSending ? (
          <div className="chat-message chat-message-assistant">Thinking…</div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="chat-panel-error">
          {error}
        </p>
      ) : null}
      <form className="chat-panel-form" onSubmit={handleSubmit}>
        <input
          className="chat-panel-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message..."
          aria-label="Chat message"
          disabled={isSending}
        />
        <button type="submit" className="chat-panel-send" disabled={isSending}>
          Send
        </button>
      </form>
    </aside>
  );
}
