import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req: Request) => {
  try {
    console.log("Step 1: Creating base44 client");
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    console.log("Step 2: Checking env vars");
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const refreshToken = Deno.env.get("SPOTIFY_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      return Response.json({
        success: false,
        error: "Missing env vars",
        has_client_id: !!clientId,
        has_client_secret: !!clientSecret,
        has_refresh_token: !!refreshToken,
      });
    }

    console.log("Step 3: Querying recent tracks");
    const recent = await db.entities.ListeningHistory.filter({}, "-played_at", 1, 0);
    const lastPlayedAt = recent.length > 0 ? recent[0].played_at : null;
    console.log("Last played_at:", lastPlayedAt);

    console.log("Step 4: Refreshing access token");
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
      const err = await tokenRes.text();
      return Response.json({ success: false, error: `Token refresh failed: ${err}` });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    console.log("Step 5: Got access token");

    const params = new URLSearchParams({ limit: "50" });
    if (lastPlayedAt) {
      params.set("after", String(new Date(lastPlayedAt).getTime()));
    }

    console.log("Step 6: Fetching recently played");
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/me/player/recently-played?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!spotifyRes.ok) {
      const err = await spotifyRes.text();
      return Response.json({ success: false, error: `Spotify API: ${err}` });
    }

    const spotifyData = await spotifyRes.json();
    const items = spotifyData.items || [];
    console.log("Step 7: Got", items.length, "items");

    if (items.length === 0) {
      return Response.json({ success: true, message: "No new tracks", synced: 0 });
    }

    // Deduplicate
    const existing = await db.entities.ListeningHistory.filter({}, "-played_at", 50, 0);
    const existingSet = new Set(existing.map((r: any) => r.played_at));

    let synced = 0;
    for (const item of items) {
      if (existingSet.has(item.played_at)) continue;

      const images = item.track.album.images;
      const img = images.find((i: any) => i.height === 300) || images[0];

      await db.entities.ListeningHistory.create({
        track_name: item.track.name,
        artist_name: item.track.artists.map((a: any) => a.name).join(", "),
        album_name: item.track.album.name,
        album_image_url: img?.url || "",
        spotify_track_id: item.track.id,
        spotify_track_url: item.track.external_urls.spotify,
        duration_ms: item.track.duration_ms,
        played_at: item.played_at,
      });
      synced++;
    }

    // Keep only the 50 most recent tracks
    const MAX_TRACKS = 50;
    const allTracks = await db.entities.ListeningHistory.filter({}, "-played_at", MAX_TRACKS + 50, 0);
    if (allTracks.length > MAX_TRACKS) {
      const toDelete = allTracks.slice(MAX_TRACKS);
      let deleted = 0;
      for (const old of toDelete) {
        try {
          await db.entities.ListeningHistory.delete(old.id);
          deleted++;
        } catch (_) {
          // already deleted, skip
        }
      }
      console.log("Cleanup: deleted", deleted, "old tracks");
    }

    return Response.json({ success: true, synced, deleted: allTracks.length > MAX_TRACKS ? allTracks.length - MAX_TRACKS : 0, total_fetched: items.length });
  } catch (error: any) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
