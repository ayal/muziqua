Deno.serve(async (_req: Request) => {
  try {
    const slackToken = Deno.env.get("SLACK_TOKEN");
    if (!slackToken) {
      return Response.json({ success: false, error: "Missing SLACK_TOKEN" });
    }

    const res = await fetch("https://muziqua.base44.app/api/functions/get-now-playing");
    const track = await res.json();

    if (!track.track_name) {
      return Response.json({ success: false, error: "No track data" });
    }

    const statusText = `${track.track_name} - ${track.artist_name} | https://muziqua.base44.app/`;

    const slackRes = await fetch("https://slack.com/api/users.profile.set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        profile: {
          status_text: statusText,
          status_emoji: ":musical_note:",
          status_expiration: 0,
        },
      }),
    });

    const slackData = await slackRes.json();
    return Response.json({ success: slackData.ok === true, source: track.source, status_text: statusText });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
