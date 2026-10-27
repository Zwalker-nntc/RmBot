import React from "react";
import { guildIconUrl, defaultAvatarColor } from "@/lib/discordClient";
import { MessagesSquare, Loader2 } from "lucide-react";

export default function Sidebar({ guilds, selectedGuildId, onSelectGuild, view, onToggleDm, loading }) {
  return (
    <div className="w-[76px] bg-zinc-950 flex flex-col items-center py-3 gap-2 border-r border-zinc-800/80 shrink-0">
      <button
        onClick={onToggleDm}
        title="Direct Messages"
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          view === "dm"
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl"
            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        }`}
      >
        <MessagesSquare className="w-5 h-5" />
      </button>

      <div className="w-8 h-0.5 bg-zinc-800 rounded-full my-1" />

      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 no-scrollbar py-1">
        {loading && <Loader2 className="w-5 h-5 text-zinc-500 animate-spin mt-3" />}
        {!loading &&
          guilds.map((g) => {
            const active = view === "guild" && selectedGuildId === g.id;
            const icon = guildIconUrl(g);
            return (
              <button
                key={g.id}
                onClick={() => onSelectGuild(g.id)}
                title={g.name}
                className={`group relative w-12 h-12 flex items-center justify-center transition-all ${
                  active ? "rounded-xl" : "rounded-2xl hover:rounded-xl"
                } ${active ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-zinc-900 hover:bg-zinc-800"}`}
              >
                {active && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-white rounded-r-full" />
                )}
                {icon ? (
                  <img src={icon} alt={g.name} className="w-full h-full rounded-[inherit] object-cover" />
                ) : (
                  <span
                    className="w-full h-full rounded-[inherit] flex items-center justify-center text-sm font-semibold text-white"
                    style={{ background: defaultAvatarColor(g.id) }}
                  >
                    {g.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}