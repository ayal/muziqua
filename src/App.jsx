import { useState, useEffect, useCallback, useRef } from "react";
import base44 from "@/api/base44Client";

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function groupConsecutiveRepeats(tracks) {
  if (tracks.length === 0) return [];

  const grouped = [];
  let current = { ...tracks[0], _count: 1 };

  for (let i = 1; i < tracks.length; i++) {
    if (tracks[i].spotify_track_id && tracks[i].spotify_track_id === current.spotify_track_id) {
      current._count++;
    } else {
      grouped.push(current);
      current = { ...tracks[i], _count: 1 };
    }
  }
  grouped.push(current);

  return grouped;
}

function TrackCard({ track, isPlaying, onPlay }) {
  const hasPreview = track.preview_url && track.preview_url !== "";

  const handleRowClick = () => {
    if (hasPreview) {
      onPlay(track);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group ${hasPreview ? "cursor-pointer" : ""}`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={track.album_image_url}
          alt={track.album_name}
          className={`w-14 h-14 rounded-md shadow-lg transition-opacity ${isPlaying ? "opacity-70" : ""}`}
          loading="lazy"
        />
        {track._count > 1 && (
          <span className="absolute -top-2 -right-2 bg-white text-zinc-900 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center rounded-full px-1.5 shadow-md">
            {track._count}×
          </span>
        )}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </div>
        )}
        {!isPlaying && hasPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate transition-colors ${isPlaying ? "text-green-400" : "text-white group-hover:text-green-400"}`}>
          {track.track_name}
        </p>
        <p className="text-zinc-400 text-sm truncate">
          {track.artist_name}
          <span className="text-zinc-600 mx-1.5">&middot;</span>
          {track.album_name}
        </p>
      </div>
      <div className="flex-shrink-0 text-right hidden sm:block">
        <p className="text-zinc-500 text-xs">{timeAgo(track.played_at)}</p>
        {track.duration_ms > 0 && (
          <p className="text-zinc-600 text-xs">{formatDuration(track.duration_ms)}</p>
        )}
      </div>
      <a
        href={track.spotify_track_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open in Spotify"
      >
        <svg
          className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </a>
    </div>
  );
}

function DateGroup({ date, tracks, playingId, onPlay }) {
  const dateObj = new Date(date);
  const isToday =
    dateObj.toDateString() === new Date().toDateString();
  const isYesterday =
    dateObj.toDateString() ===
    new Date(Date.now() - 86400000).toDateString();

  let label;
  if (isToday) label = "Today";
  else if (isYesterday) label = "Yesterday";
  else
    label = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="mb-6">
      <h2 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
        {label}
      </h2>
      <div className="space-y-1">
        {groupConsecutiveRepeats(tracks).map((track, i) => (
          <TrackCard
            key={track.id || `${track.played_at}-${i}`}
            track={track}
            isPlaying={playingId === (track.id || track.played_at)}
            onPlay={onPlay}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const audioRef = useRef(null);
  const PAGE_SIZE = 50;

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("https://muziqua.base44.app/api/functions/get-now-playing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      setNowPlaying(data.playing ? data : null);
    } catch (_) {
      setNowPlaying(null);
    }
  }, []);

  const handlePlay = useCallback((track) => {
    const trackKey = track.id || track.played_at;

    if (playingId === trackKey) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(trackKey);
  }, [playingId]);

  const fetchTracks = useCallback(async (skip = 0) => {
    try {
      const results = await base44.entities.ListeningHistory.list(
        "-played_at",
        PAGE_SIZE,
        skip
      );
      if (skip === 0) {
        setTracks(results);
      } else {
        setTracks((prev) => [...prev, ...results]);
      }
      setHasMore(results.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
      setError("Failed to load listening history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const npInterval = setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(npInterval);
  }, [fetchNowPlaying]);

  const triggerSync = useCallback(() => {
    fetch("https://muziqua.base44.app/api/functions/sync-spotify-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.synced > 0) fetchTracks();
      })
      .catch(() => {});
  }, [fetchTracks]);

  useEffect(() => {
    triggerSync();
    const syncInterval = setInterval(triggerSync, 3 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [triggerSync]);

  useEffect(() => {
    fetchTracks();

    const unsubscribe = base44.entities.ListeningHistory.subscribe((event) => {
      if (event.type === "create") {
        setTracks((prev) => {
          const exists = prev.some((t) => t.id === event.data.id);
          if (exists) return prev;
          return [event.data, ...prev].sort(
            (a, b) => new Date(b.played_at) - new Date(a.played_at)
          );
        });
      }
    });

    return () => unsubscribe();
  }, [fetchTracks]);

  const loadMore = () => {
    fetchTracks(tracks.length);
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke("sync-spotify-history", {});
      await fetchTracks(0);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Group tracks by date
  const grouped = tracks.reduce((acc, track) => {
    const date = new Date(track.played_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(track);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <h1 className="text-white text-lg font-semibold">Muziqua</h1>
          <span className="text-zinc-500 text-sm">Ayal's Listening History</span>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="ml-auto p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Sync now"
          >
            <svg
              className={`w-4 h-4 text-zinc-400 ${syncing ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {nowPlaying && (
          <div
            onClick={() => nowPlaying.preview_url && handlePlay({ ...nowPlaying, id: "_now_playing" })}
            className={`mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 group ${nowPlaying.preview_url ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Now Playing</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={nowPlaying.album_image_url}
                  alt={nowPlaying.album_name}
                  className={`w-16 h-16 rounded-md shadow-lg transition-opacity ${playingId === "_now_playing" ? "opacity-70" : ""}`}
                />
                {playingId === "_now_playing" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  </div>
                )}
                {playingId !== "_now_playing" && nowPlaying.preview_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate transition-colors text-lg ${playingId === "_now_playing" ? "text-green-400" : "text-white group-hover:text-green-400"}`}>
                  {nowPlaying.track_name}
                </p>
                <p className="text-zinc-400 text-sm truncate">
                  {nowPlaying.artist_name}
                  <span className="text-zinc-600 mx-1.5">&middot;</span>
                  {nowPlaying.album_name}
                </p>
                {nowPlaying.duration_ms > 0 && (
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (nowPlaying.progress_ms / nowPlaying.duration_ms) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <a
                href={nowPlaying.spotify_track_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open in Spotify"
              >
                <svg
                  className="w-6 h-6 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">No tracks yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Listening history will appear here once syncing starts
            </p>
          </div>
        )}

        {!loading && dateKeys.map((date) => (
          <DateGroup key={date} date={date} tracks={grouped[date]} playingId={playingId} onPlay={handlePlay} />
        ))}

        {!loading && hasMore && tracks.length > 0 && (
          <div className="flex justify-center py-8">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 text-sm rounded-full transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
