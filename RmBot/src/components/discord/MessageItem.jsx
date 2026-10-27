import React, { useState } from "react";
import { discord, userAvatarUrl, defaultAvatarColor, formatTime } from "@/lib/discordClient";
import { Smile, Pencil, Trash2, X, Check } from "lucide-react";

const QUICK = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "🤔"];

function reactionKey(emoji) {
  return emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
}

function attachmentKind(attachment) {
  const contentType = attachment.content_type || ""
  if (contentType.startsWith("image/")) return "image"
  if (contentType.startsWith("video/")) return "video"
  if (contentType.startsWith("audio/")) return "audio"
  const extension = attachment.filename?.split(".").pop()?.toLowerCase()
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp"].includes(extension)) return "image"
  if (["mp4", "webm", "mov", "m4v"].includes(extension)) return "video"
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(extension)) return "audio"
  return "file"
}

export default function MessageItem({ message, botUserId, onUpdated }) {
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || "");
  const [busy, setBusy] = useState(false);

  const isOwn = message.author && message.author.id === botUserId;
  const avatar = userAvatarUrl(message.author);
  const name = message.author?.global_name || message.author?.username || "Unknown";
  const initials = name.slice(0, 1).toUpperCase();
  const reactions = message.reactions || [];

  const react = async (emojiStr) => {
    setBusy(true);
    try {
      await discord.addReaction(message.channel_id, message.id, emojiStr);
      onUpdated();
    } catch (e) {
    } finally {
      setBusy(false);
      setPicker(false);
    }
  };

  const toggleReaction = async (r) => {
    const key = reactionKey(r.emoji);
    setBusy(true);
    try {
      if (r.me) await discord.removeReaction(message.channel_id, message.id, key);
      else await discord.addReaction(message.channel_id, message.id, key);
      onUpdated();
    } catch (e) {
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await discord.editMessage(message.channel_id, message.id, draft.trim());
      setEditing(false);
      onUpdated();
    } catch (e) {
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Delete this message?")) return;
    setBusy(true);
    try {
      await discord.deleteMessage(message.channel_id, message.id);
      onUpdated();
    } catch (e) {
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group relative px-4 py-1.5 hover:bg-zinc-800/40 rounded-lg mx-1">
      <div className="flex gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="w-9 h-9 rounded-full mt-0.5 object-cover shrink-0" />
        ) : (
          <div
            className="w-9 h-9 rounded-full mt-0.5 flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ background: defaultAvatarColor(message.author?.id) }}
          >
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-100 truncate">{name}</span>
            {message.author?.bot && (
              <span className="text-[9px] uppercase font-bold bg-indigo-600 text-white px-1 py-0.5 rounded">
                Bot
              </span>
            )}
            <span className="text-[11px] text-zinc-500">{formatTime(message.timestamp)}</span>
          </div>

          {editing ? (
            <div className="mt-1 flex items-start gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={saveEdit}
                disabled={busy}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm text-zinc-300 break-words whitespace-pre-wrap leading-relaxed">
              {message.content || (message.attachments?.length ? "" : <span className="text-zinc-600 italic">empty</span>)}
            </div>
          )}

          {message.attachments?.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {message.attachments.map((a, i) => {
                const kind = attachmentKind(a)
                if (kind === "image") {
                  return (
                    <a key={a.id || i} href={a.url} target="_blank" rel="noreferrer" className="block w-fit max-w-full">
                      <img
                        src={a.url}
                        alt={a.filename || "Image attachment"}
                        loading="lazy"
                        className="max-h-[480px] max-w-full rounded-lg object-contain"
                      />
                      {a.filename && <span className="mt-1 block text-xs text-zinc-500">{a.filename}</span>}
                    </a>
                  )
                }
                if (kind === "video") {
                  return (
                    <video
                      key={a.id || i}
                      src={a.url}
                      controls
                      preload="metadata"
                      className="max-h-[480px] max-w-full rounded-lg"
                    >
                      <a href={a.url}>Download {a.filename || "video"}</a>
                    </video>
                  )
                }
                if (kind === "audio") {
                  return <audio key={a.id || i} src={a.url} controls preload="metadata" className="max-w-full" />
                }
                return (
                  <a
                    key={a.id || i}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:underline truncate"
                  >
                    📎 {a.filename || "Download attachment"}
                  </a>
                )
              })}
            </div>
          )}

          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {reactions.map((r, i) => (
                <button
                  key={i}
                  onClick={() => toggleReaction(r)}
                  disabled={busy}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs border transition-colors ${
                    r.me
                      ? "bg-indigo-600/30 border-indigo-500 text-zinc-100"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span>{r.emoji.id ? r.emoji.name : r.emoji.name}</span>
                  <span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute -top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-1 shadow-lg">
        <button
          onClick={() => setPicker((p) => !p)}
          title="React"
          className="p-1.5 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          <Smile className="w-4 h-4" />
        </button>
        {isOwn && (
          <>
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="p-1.5 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={del}
              title="Delete"
              className="p-1.5 rounded text-zinc-300 hover:bg-rose-600 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {picker && (
        <div className="absolute top-7 right-3 z-20 bg-zinc-800 border border-zinc-700 rounded-xl p-2 shadow-2xl">
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {QUICK.map((e) => (
              <button
                key={e}
                onClick={() => react(e)}
                disabled={busy}
                className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-zinc-700"
              >
                {e}
              </button>
            ))}
          </div>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              if (draft.trim()) react(draft.trim());
            }}
            className="mt-2 flex gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="👍 or :name:id"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <button type="submit" className="text-xs px-2 py-1 bg-indigo-600 rounded-md text-white">
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}