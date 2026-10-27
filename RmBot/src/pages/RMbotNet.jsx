import React, { useState, useEffect } from "react";
import {
  discord,
  getToken,
  setToken,
  clearToken,
  userAvatarUrl,
  defaultAvatarColor,
} from "@/lib/discordClient";
import TokenGate from "@/components/discord/TokenGate";
import Sidebar from "@/components/discord/Sidebar";
import ChannelList from "@/components/discord/ChannelList";
import ForumPanel from "@/components/discord/ForumPanel";
import MessageArea from "@/components/discord/MessageArea";
import DmPanel from "@/components/discord/DmPanel";
import { LogOut, Bot, Loader2 } from "lucide-react";

export default function RMbotNet() {
  const [botUser, setBotUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState("guild");
  const [guilds, setGuilds] = useState([]);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [dms, setDms] = useState([]);
  const [selectedDmId, setSelectedDmId] = useState(null);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [refreshingDms, setRefreshingDms] = useState(false);
  const [dmStorageError, setDmStorageError] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setBooting(false);
      return;
    }
    setToken(t);
    discord
      .getMe()
      .then((me) => {
        setBotUser(me);
        restoreDmState();
        loadGuilds();
      })
      .catch(() => {
        clearToken();
        setBooting(false);
      });
  }, []);

  const restoreDmState = async () => {
    try {
      const savedState = await discord.getSavedDmState();
      setDms(savedState.conversations);
      if (savedState.selectedDmId) {
        setSelectedDmId(savedState.selectedDmId);
        setSelectedChannelId(null);
        setView("dm");
      }
      setDmStorageError("");
    } catch (e) {
      setDmStorageError(e.discordData?.message || e.message || "Could not load saved DM information.");
    }

    try {
      const liveDms = await discord.getDms();
      setDms((savedDms) => {
        const merged = new Map(savedDms.map((dm) => [dm.id, dm]));
        for (const dm of liveDms) merged.set(dm.id, dm);
        return Array.from(merged.values());
      });
      const savedState = await discord.syncDmConversations(liveDms);
      setDms(savedState.conversations);
      setDmStorageError("");
    } catch (e) {
      setDmStorageError(e.discordData?.message || e.message || "Could not synchronize DM information.");
    }
  };

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    try {
      const g = await discord.getGuilds();
      setGuilds(g);
    } catch (e) {
    } finally {
      setLoadingGuilds(false);
      setBooting(false);
    }
  };

  const handleConnected = (me) => {
    setBotUser(me);
    restoreDmState();
    loadGuilds();
  };

  const selectGuild = async (gid) => {
    setView("guild");
    setSelectedGuildId(gid);
    setSelectedChannelId(null);
    setSelectedThread(null);
    setLoadingChannels(true);
    try {
      const ch = await discord.getChannels(gid);
      setChannels(ch);
    } catch (e) {
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const selectChannel = (cid) => {
    setSelectedChannelId(cid);
    setSelectedThread(null);
  };
  const selectDm = (dmId) => {
    setSelectedDmId(dmId);
    setSelectedChannelId(null);
    setSelectedThread(null);
    setView("dm");
    discord.saveSelectedDm(dmId).then(() => setDmStorageError("")).catch((e) => {
      setDmStorageError(e.discordData?.message || e.message || "Could not save the selected DM.");
    });
  };

  const toggleDm = async () => {
    setView("dm");
    setSelectedChannelId(null);
    setSelectedThread(null);
    if (dms.length === 0) refreshDms();
  };

  const refreshDms = async () => {
    setRefreshingDms(true);
    try {
      const liveDms = await discord.getDms();
      setDms(liveDms);
      const savedState = await discord.syncDmConversations(liveDms);
      setDms(savedState.conversations);
      setDmStorageError("");
    } catch (e) {
      setDmStorageError(e.discordData?.message || e.message || "Could not refresh DM information.");
    } finally {
      setRefreshingDms(false);
    }
  };

  const handleDmCreated = (dm) => {
    setDms((prev) => [dm, ...prev.filter((d) => d.id !== dm.id)]);
    setSelectedDmId(dm.id);
    setSelectedChannelId(null);
    setView("dm");
    discord.syncDmConversations([dm]).then(() => discord.saveSelectedDm(dm.id)).then(() => {
      setDmStorageError("");
    }).catch((e) => {
      setDmStorageError(e.discordData?.message || e.message || "Could not save the new DM.");
    });
  };

  const handleLogout = () => {
    clearToken();
    setBotUser(null);
    setGuilds([]);
    setChannels([]);
    setDms([]);
    setSelectedChannelId(null);
    setSelectedDmId(null);
    setSelectedThread(null);
    setSelectedGuildId(null);
    setView("guild");
    setDmStorageError("");
  };

  const selectedGuild = guilds.find((g) => g.id === selectedGuildId) || null;
  const selectedGuildChannel = channels.find((c) => c.id === selectedChannelId) || null;
  const activeChannel =
    view === "guild"
      ? selectedThread || selectedGuildChannel
      : dms.find((d) => d.id === selectedDmId);

  let activeLabel = "";
  let activeSublabel = "";
  let activeIcon = "hash";
  if (view === "guild" && activeChannel) {
    activeLabel = activeChannel.name;
    activeSublabel = selectedThread
      ? `${selectedGuildChannel?.name || "Forum"} · ${selectedGuild?.name || ""}`
      : selectedGuild?.name || "";
    activeIcon = selectedGuildChannel && [15, 16].includes(selectedGuildChannel.type) && !selectedThread
      ? "forum"
      : "hash";
  } else if (view === "dm" && activeChannel) {
    const r = activeChannel.recipients?.[0];
    activeLabel = r?.global_name || r?.username || "Unknown";
    activeSublabel = "Direct Message";
    activeIcon = "dm";
  }

  const activeChannelId =
    view === "guild"
      ? selectedGuildChannel && [15, 16].includes(selectedGuildChannel.type)
        ? selectedThread?.id || null
        : selectedChannelId
      : selectedDmId;

  if (booting) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  if (!botUser) {
    return <TokenGate onSuccess={handleConnected} />;
  }

  const botName = botUser.global_name || botUser.username || "Bot";
  const botAvatar = userAvatarUrl(botUser);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="h-12 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">RMbotNet</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {botAvatar ? (
              <img src={botAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: defaultAvatarColor(botUser.id) }}
              >
                {botName[0]?.toUpperCase()}
              </div>
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-medium text-zinc-100">{botName}</span>
              <span className="text-[10px] text-zinc-500">@{botUser.username}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Disconnect"
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {dmStorageError && (
        <div className="px-4 py-2 text-xs text-amber-200 bg-amber-950/40 border-b border-amber-900/60">
          DM sync: {dmStorageError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          guilds={guilds}
          selectedGuildId={selectedGuildId}
          onSelectGuild={selectGuild}
          view={view}
          onToggleDm={toggleDm}
          loading={loadingGuilds}
        />

        {view === "guild" ? (
          selectedGuildChannel && [15, 16].includes(selectedGuildChannel.type) ? (
            <ForumPanel
              guildId={selectedGuildId}
              channel={selectedGuildChannel}
              selectedThreadId={selectedThread?.id || null}
              onSelectThread={setSelectedThread}
              onThreadCreated={setSelectedThread}
            />
          ) : (
            <ChannelList
              guild={selectedGuild}
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelect={selectChannel}
              loading={loadingChannels}
            />
          )
        ) : (
          <DmPanel
            dms={dms}
            selectedDmId={selectedDmId}
            onSelectDm={selectDm}
            onRefresh={refreshDms}
            onDmCreated={handleDmCreated}
            refreshing={refreshingDms}
          />
        )}

        <MessageArea
          channelId={activeChannelId}
          label={activeLabel}
          sublabel={activeSublabel}
          icon={activeIcon}
          botUserId={botUser.id}
        />
      </div>
    </div>
  );
}