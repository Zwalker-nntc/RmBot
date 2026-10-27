import React, { useState } from "react";
import { discord, setToken, clearToken } from "@/lib/discordClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bot, ShieldAlert, KeyRound } from "lucide-react";

export default function TokenGate({ onSuccess }) {
  const [token, setTokenVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");
    setToken(token.trim());
    try {
      const me = await discord.getMe();
      onSuccess(me);
    } catch (e) {
      setError(e.discordData?.message || e.message || "Invalid or unauthorized token");
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-600 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">RMbotNet</h1>
            <p className="text-xs text-zinc-400">Discord bot control panel</p>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur p-7 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-1">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            Connect your bot
          </div>
          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
            Paste a Discord bot token to drive the bot from this panel. The token is kept only in this
            browser session and is sent to Discord through the local API proxy.
          </p>

          <Input
            type="password"
            value={token}
            onChange={(e) => setTokenVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="MTk4NjIyNDgzNDcxOTI1MjQ4.GH7t2x.s3cr3t..."
            className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 font-mono text-sm h-12"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-xl px-3 py-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="w-full mt-5 h-12 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter Panel"}
          </Button>

          <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">
            Tip: enable the <span className="text-zinc-300">Message Content</span> and{" "}
            <span className="text-zinc-300">Server Members</span> intents in the Discord Developer Portal so
            messages and member lists come through.
          </p>
        </div>
      </div>
    </div>
  );
}