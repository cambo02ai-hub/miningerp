import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { MessageSquare, X, Send, Bot, Loader2 } from "lucide-react";
import { chatAPI } from "../services/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  loading?: boolean;
}

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Halo! Saya Hestia, asisten AI jpmonitor. Ada yang bisa saya bantu?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await chatAPI.sendMessage(userMsg.content);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== "loading");
        return [...filtered, { id: Date.now().toString(), role: "assistant", content: data.reply || data.message || "Maaf, saya tidak bisa memproses permintaan Anda.", timestamp: new Date() }];
      });
    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== "loading");
        return [...filtered, { id: Date.now().toString(), role: "assistant", content: "Terjadi kesalahan. Silakan coba lagi.", timestamp: new Date() }];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 p-3.5 sm:p-4 bg-jpmonitor-red text-white rounded-pill shadow-elevated hover:bg-jpmonitor-red-hover transition-colors z-50 flex items-center gap-2"
        aria-label="AI လက်ထောက် ဖွင့်ရန်"
      >
        <MessageSquare size={20} />
        <span className="text-sm font-medium">Atia AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-bg-surface border border-border rounded-jpa-xl shadow-elevated z-50 flex flex-col" style={{ maxHeight: "32rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-jpmonitor-red rounded-t-jpmonitor-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-jpb">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Atia AI လက်ထောက်</h3>
            <p className="text-xs text-white/70">jpmonitor</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-jpmonitor transition-colors" aria-label="စကားပြောခန်း ပိတ်ရန်">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: "20rem" }}>
        {messages.map((msg) => (
          <div key={msg.id} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={"max-w-[85%] px-3.5 py-2.5 rounded-jpmonitor-md text-sm " +
              (msg.role === "user"
                ? "bg-jpmonitor-red text-white rounded-br-jpmonitor-lg"
                : "bg-bg-elevated text-text-primary border border-border rounded-bl-jpmonitor-lg")
            }>
              {msg.loading ? (
                <div className="flex items-center gap-2 text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Atia စဉ်းစားနေသည်</span>
                </div>
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc ml-4 mb-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal ml-4 mb-1">{children}</ol>,
                      li: ({children}) => <li className="text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-bg-page px-1 py-0.5 rounded text-xs">{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              <p className={"text-[10px] mt-1 " + (msg.role === "user" ? "text-white/60" : "text-text-muted")}>
                {msg.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="စာရိုက်ပါ..."
            className="flex-1 px-3 py-2 text-sm bg-bg-page border border-border rounded-jpmonitor-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jpmonitor-red focus:ring-1 focus:ring-jpmonitor-red/20 transition-colors disabled:opacity-50"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-jpmonitor-red text-white rounded-jpmonitor-md hover:bg-jpmonitor-red-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="စာပို့ရန်"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWidget;
