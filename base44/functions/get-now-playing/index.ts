Deno.serve(async (_req: Request) => {
  try {
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const refreshToken = Deno.env.get("SPOTIFY_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      return Response.json({ playing: false, error: "Missing env vars" });
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      return Response.json({ playing: false, error: "Token refresh failed" });
    }

    const { access_token } = await tokenRes.json();

    // Try currently playing
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (res.ok && res.status !== 204 && res.status !== 202) {
      const data = await res.json();
      if (data.is_playing && data.item) {
        return trackResponse(data.item, true, "now_playing", data.progress_ms);
      }
    }

    // Fall back to recently played
    const recentRes = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (recentRes.ok) {
      const recentData = await recentRes.json();
      if (recentData.items?.length > 0) {
        return trackResponse(recentData.items[0].track, false, "last_played", 0);
      }
    }

    return Response.json({ playing: false, source: "none" });
  } catch (error: any) {
    return Response.json({ playing: false, error: error.message });
  }
});

function trackResponse(track: any, playing: boolean, source: string, progressMs: number) {
  const images = track.album?.images || [];
  const img = images.find((i: any) => i.height === 300) || images[0];

  return Response.json({
    playing,
    source,
    track_name: track.name,
    artist_name: track.artists.map((a: any) => a.name).join(", "),
    album_name: track.album.name,
    album_image_url: img?.url || "",
    spotify_track_url: track.external_urls.spotify,
    duration_ms: track.duration_ms,
    progress_ms: progressMs,
    preview_url: track.preview_url || "",
  });
}
