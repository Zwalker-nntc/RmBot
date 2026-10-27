import React, { useState, useEffect, useRef } from "react";
import { discord } from "@/lib/discordClient";
import MessageItem from "@/components/discord/MessageItem";
import { Send, Loader2, AlertCircle, ArrowUp, Hash, AtSign } from "lucide-react";

export default function MessageArea({ channelId, label, sublabel, icon, botUserId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  const refresh = async () => {
    if (!channelId) return;
    try {
      const msgs = await discord.getMessages(channelId, 50);
      setMessages(msgs.reverse());
      setError("");
    } catch (e) {
      setError(e.discordData?.message || e.message);
    }
  };

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const msgs = await discord.getMessages(channelId, 50);
        if (active) {
          setMessages(msgs.reverse());
          setError("");
        }
      } catch (e) {
        if (active) setError(e.discordData?.message || e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [channelId]);

  useEffect(() => {
    if (scrollRef.current) {
      const nearBottom =
        scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 200;
      if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, channelId]);

  const loadMore = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const older = await discord.getMessages(channelId, 50, oldest.id);
      setMessages((prev) => [...older.reverse(), ...prev]);
    } catch (e) {
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !channelId) return;
    setSending(true);
    try {
      const msg = await discord.sendMessage(channelId, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput("");
      setError("");
    } catch (e) {
      setError(e.discordData?.message || e.message);
    } finally {
      setSending(false);
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 gap-3">
        {icon === "dm" ? <AtSign className="w-10 h-10" /> : <Hash className="w-10 h-10" />}
        <p className="text-sm">Select a {icon === "dm" ? "conversation" : "channel"} to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 min-w-0">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-zinc-800/80 shrink-0">
        {icon === "dm" ? <AtSign className="w-4 h-4 text-zinc-400" /> : <Hash className="w-4 h-4 text-zinc-400" />}
        <span className="text-sm font-semibold text-zinc-100 truncate">{label}</span>
        {sublabel && <span className="text-xs text-zinc-500 truncate hidden sm:inline">— {sublabel}</span>}
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            {messages.length > 0 && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-zinc-800"
                >
                  {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                  Load older
                </button>
              </div>
            )}
            <div className="space-y-0.5">
              {messages.map((m) => (
                <MessageItem key={m.id} message={m} botUserId={botUserId} onUpdated={refresh} />
              ))}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="p-4 shrink-0">
        <div className="flex items-end gap-2 bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Message ${label}`}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none max-h-32"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-400 hover:to-violet-500 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}