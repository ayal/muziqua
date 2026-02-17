import Jimp from "npm:jimp@0.22.12";

let font16: any = null;

Deno.serve(async (_req: Request) => {
  try {
    const res = await fetch("https://muziqua.base44.app/api/functions/get-now-playing");
    const track = await res.json();

    const trackName = track.track_name || "Nothing playing";
    const artistName = track.artist_name || "";
    const label = track.source === "now_playing" ? "NOW PLAYING:" : "LAST PLAYED:";

    const text = artistName ? `${trackName} - ${artistName}` : trackName;
    const line = `${label}  ${text}`;
    const w = 620;
    const h = 36;

    const image = new Jimp(w, h, 0x0F0F0FFF);

    // Inner panel
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        image.setPixelColor(0x1E1E1EFF, x, y);
      }
    }

    // Top highlight
    for (let x = 2; x < w - 2; x++) {
      image.setPixelColor(0x2A2A2AFF, x, 2);
    }

    // Bottom shadow
    for (let x = 2; x < w - 2; x++) {
      image.setPixelColor(0x0A0A0AFF, x, h - 2);
    }

    // Green accent bar + glow
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < 5; x++) {
        image.setPixelColor(0x1DB954FF, x, y);
      }
      image.setPixelColor(0x1DB95460, 5, y);
      image.setPixelColor(0x1DB95430, 6, y);
      image.setPixelColor(0x1DB95418, 7, y);
    }

    if (!font16) font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    image.print(font16, 14, 8, line, w - 22);

    // Tint label green
    for (let y = 8; y < 28; y++) {
      for (let x = 14; x < 120; x++) {
        const pixel = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(pixel);
        if (rgba.r > 50) {
          const tinted = Jimp.rgbaToInt(
            Math.floor(rgba.r * 0.25),
            Math.min(255, Math.floor(rgba.g * 0.7 + 100)),
            Math.floor(rgba.b * 0.25),
            rgba.a
          );
          image.setPixelColor(tinted, x, y);
        }
      }
    }

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
