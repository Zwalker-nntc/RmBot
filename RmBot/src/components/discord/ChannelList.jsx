import React from "react";
import { guildIconUrl, defaultAvatarColor } from "@/lib/discordClient";
import { Hash, Volume2, Megaphone, Mic, Lock, Loader2, MessageSquare, Image } from "lucide-react";

function channelIcon(type) {
  if (type === 2) return <Volume2 className="w-4 h-4" />;
  if (type === 13) return <Mic className="w-4 h-4" />;
  if (type === 5) return <Megaphone className="w-4 h-4" />;
  if (type === 15) return <MessageSquare className="w-4 h-4" />;
  if (type === 16) return <Image className="w-4 h-4" />;
  return <Hash className="w-4 h-4" />;
}

const CLICKABLE = new Set([0, 2, 5, 13, 15, 16]);

export default function ChannelList({ guild, channels, selectedChannelId, onSelect, loading }) {
  const categories = channels.filter((c) => c.type === 4).sort((a, b) => a.position - b.position);
  const orphans = channels
    .filter((c) => c.type !== 4 && !c.parent_id)
    .sort((a, b) => a.position - b.position);

  const renderChannel = (c) => {
    const active = selectedChannelId === c.id;
    const clickable = CLICKABLE.has(c.type);
    return (
      <button
        key={c.id}
        disabled={!clickable}
        onClick={() => clickable && onSelect(c.id)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
          active
            ? "bg-zinc-700/60 text-white"
            : clickable
            ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            : "text-zinc-600 cursor-not-allowed"
        }`}
      >
        <span className="shrink-0 text-zinc-500">{channelIcon(c.type)}</span>
        <span className="truncate">{c.name}</span>
        {!clickable && <Lock className="w-3 h-3 ml-auto text-zinc-600" />}
      </button>
    );
  };

  return (
    <div className="w-60 bg-zinc-900 flex flex-col border-r border-zinc-800/80 shrink-0">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-zinc-800/80 shrink-0">
        {guild && (
          <>
            {guildIconUrl(guild) ? (
              <img src={guildIconUrl(guild)} className="w-6 h-6 rounded-md object-cover" alt="" />
            ) : (
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ background: defaultAvatarColor(guild.id) }}
              >
                {guild.name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="text-sm font-semibold text-zinc-100 truncate">{guild.name}</span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && orphans.length > 0 && (
          <div className="space-y-0.5">{orphans.map(renderChannel)}</div>
        )}
        {!loading &&
          categories.map((cat) => (
            <div key={cat.id} className="space-y-0.5">
              <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {cat.name}
              </div>
              {channels
                .filter((c) => c.parent_id === cat.id)
                .sort((a, b) => a.position - b.position)
                .map(renderChannel)}
            </div>
          ))}
        {!loading && channels.length === 0 && (
          <p className="text-xs text-zinc-500 px-2 py-4">No channels found.</p>
        )}
      </div>
    </div>
  );
}