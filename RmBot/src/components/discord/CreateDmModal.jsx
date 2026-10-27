import React, { useState, useEffect } from "react";
import { discord, userAvatarUrl, defaultAvatarColor } from "@/lib/discordClient";
import { X, Search, Loader2 } from "lucide-react";

export default function CreateDmModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    discord
      .getDmTargets()
      .then((u) => {
        setUsers(u);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.discordData?.message || e.message || "Failed to load members");
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) =>
    (u.global_name || u.username || "").toLowerCase().includes(query.toLowerCase())
  );

  const pick = async (u) => {
    setCreating(u.id);
    setError("");
    try {
      const dm = await discord.createDm(u.id);
      onCreated(dm);
    } catch (e) {
      setError(e.discordData?.message || e.message || "Could not create DM");
      setCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Start a Direct Message</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members across all servers"
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-8">
              No members found. Make sure the Server Members intent is enabled.
            </p>
          )}
          {!loading &&
            filtered.map((u) => {
              const name = u.global_name || u.username;
              const avatar = userAvatarUrl(u);
              return (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  disabled={creating !== null}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: defaultAvatarColor(u.id) }}
                    >
                      {name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">{name}</span>
                  <span className="text-xs text-zinc-500 truncate">@{u.username}</span>
                  {creating === u.id && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}