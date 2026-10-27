import React, { useState } from "react";
import { userAvatarUrl, defaultAvatarColor } from "@/lib/discordClient";
import CreateDmModal from "@/components/discord/CreateDmModal";
import { Plus, RefreshCw, AtSign, Loader2 } from "lucide-react";

export default function DmPanel({ dms, selectedDmId, onSelectDm, onRefresh, onDmCreated, refreshing }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="w-60 bg-zinc-900 flex flex-col border-r border-zinc-800/80 shrink-0">
      <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
        <span className="text-sm font-semibold text-zinc-100">Direct Messages</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            title="Refresh"
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            title="New DM"
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
        {dms.length === 0 && (
          <div className="text-center py-8 px-3">
            <AtSign className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No conversations yet. Tap + to start one.</p>
          </div>
        )}
        {dms.map((dm) => {
          const r = dm.recipients && dm.recipients[0];
          const name = r?.global_name || r?.username || "Unknown";
          const avatar = userAvatarUrl(r);
          const active = selectedDmId === dm.id;
          return (
            <button
              key={dm.id}
              onClick={() => onSelectDm(dm.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-zinc-700/60 text-white" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {avatar ? (
                <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ background: defaultAvatarColor(r?.id) }}
                >
                  {name[0]?.toUpperCase()}
                </div>
              )}
              <span className="truncate">{name}</span>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <CreateDmModal
          onClose={() => setShowCreate(false)}
          onCreated={(dm) => {
            setShowCreate(false);
            onDmCreated(dm);
          }}
        />
      )}
    </div>
  );
}