import React, { useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowDown, FilePlus2, Loader2, Plus, RefreshCw, X } from "lucide-react"
import { discord, MAX_MEDIA_UPLOAD_BYTES } from "@/lib/discordClient"

export default function ForumPanel({ guildId, channel, selectedThreadId, onSelectThread, onThreadCreated }) {
  const [threads, setThreads] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [archivedBefore, setArchivedBefore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [file, setFile] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const requestId = useRef(0)
  const currentLocation = useRef({ guildId, channelId: channel.id })
  currentLocation.current = { guildId, channelId: channel.id }

  const loadThreads = async (append = false) => {
    const request = ++requestId.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError("")
    try {
      const before = append ? archivedBefore : undefined
      const [activeResult, archivedResult] = await Promise.all([
        discord.getActiveThreads(guildId),
        discord.getArchivedThreads(channel.id, before),
      ])
      if (request !== requestId.current) return
      const activeThreads = (activeResult.threads || []).filter((thread) => thread.parent_id === channel.id)
      const archivedThreads = archivedResult.threads || []
      setThreads((previous) => {
        const merged = new Map((append ? previous : []).map((thread) => [thread.id, thread]))
        for (const thread of [...activeThreads, ...archivedThreads]) merged.set(thread.id, thread)
        return Array.from(merged.values()).sort((a, b) => {
          const aId = BigInt(a.last_message_id || a.id)
          const bId = BigInt(b.last_message_id || b.id)
          return aId === bId ? 0 : aId > bId ? -1 : 1
        })
      })
      setArchivedBefore(archivedThreads.at(-1)?.thread_metadata?.archive_timestamp || null)
      setHasMore(Boolean(archivedResult.has_more))
    } catch (e) {
      if (request === requestId.current) {
        setError(e.discordData?.message || e.message || "Could not load forum posts.")
      }
    } finally {
      if (request === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    setThreads([])
    setArchivedBefore(null)
    loadThreads()
    return () => {
      requestId.current += 1
    }
  }, [guildId, channel.id])

  const toggleTag = (tagId) => {
    setSelectedTags((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    )
  }

  const chooseFile = (event) => {
    const chosen = event.target.files?.[0] || null
    event.target.value = ""
    if (!chosen) return
    if (!["image/", "video/", "audio/"].some((type) => chosen.type.startsWith(type))) {
      setFile(null)
      setError("Choose an image, video, or audio file.")
      return
    }
    if (chosen.size > MAX_MEDIA_UPLOAD_BYTES) {
      setFile(null)
      setError("Media uploads must be 2 MB or smaller.")
      return
    }
    setFile(chosen)
    setError("")
  }

  const createThread = async (event) => {
    event.preventDefault()
    if (!name.trim() || (!content.trim() && !file)) {
      setError("Add a post title and either a message or media attachment.")
      return
    }
    setCreating(true)
    setError("")
    const location = currentLocation.current
    try {
      const thread = await discord.createForumThread(
        channel.id,
        name.trim(),
        content.trim(),
        selectedTags,
        file,
      )
      if (
        location.guildId !== currentLocation.current.guildId ||
        location.channelId !== currentLocation.current.channelId
      ) {
        return
      }
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)])
      setShowCreate(false)
      setName("")
      setContent("")
      setSelectedTags([])
      setFile(null)
      onThreadCreated(thread)
    } catch (e) {
      setError(e.discordData?.message || e.message || "Could not create forum post.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-72 bg-zinc-900 flex flex-col border-r border-zinc-800/80 shrink-0">
      <div className="h-12 px-3 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
        <span className="text-sm font-semibold text-zinc-100 truncate">{channel.name}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => loadThreads()}
            title="Refresh posts"
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            title="New post"
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-2 flex items-start gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-2 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {loading && (
          <div className="flex justify-center py-8 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && threads.length === 0 && (
          <p className="text-xs text-zinc-500 px-2 py-4">No posts yet. Create one with +.</p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread)}
            className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
              selectedThreadId === thread.id
                ? "bg-zinc-700/60 text-white"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="block truncate text-sm font-medium">{thread.name}</span>
            <span className="block truncate text-[11px] text-zinc-500">
              {thread.thread_metadata?.archived ? "Archived post" : "Active post"}
              {thread.message_count != null ? ` · ${thread.message_count} messages` : ""}
            </span>
          </button>
        ))}
        {!loading && hasMore && (
          <button
            onClick={() => loadThreads(true)}
            disabled={loadingMore}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDown className="w-3 h-3" />}
            Load older posts
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={createThread}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">New post in {channel.name}</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="Post title"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Write the first message (optional when attaching media)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-y focus:outline-none focus:border-indigo-500"
              />
              {channel.available_tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {channel.available_tags.map((tag) => {
                    const active = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          active
                            ? "border-indigo-500 bg-indigo-600/30 text-white"
                            : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                <FilePlus2 className="w-4 h-4" />
                Attach image, video, or audio (2 MB max)
                <input type="file" accept="image/*,video/*,audio/*" className="sr-only" onChange={chooseFile} />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-2 text-xs text-zinc-400 hover:text-white"
                >
                  {file.name} · remove
                </button>
              )}
              {error && <p className="text-xs text-rose-300">{error}</p>}
              <p className="text-[11px] text-zinc-500">The bot needs permission to view, create, and send messages in this channel.</p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create post
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
