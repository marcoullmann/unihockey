// Vercel Serverless Function (Hobby-Plan): liest die öffentliche Google-Photos-
// Album-Seite serverseitig (kein CORS), extrahiert die Foto-URLs und liefert sie
// als JSON. Voraussetzung: Album ist "Jeder mit Link" freigegeben.
//
// Hinweis: Google bietet keine offizielle API/Embed für geteilte Alben. Wir
// parsen die HTML-Seite – wenn Google deren Struktur ändert, muss das Regex
// unten ggf. angepasst werden. Die Galerie fällt dann auf cfg.GALLERY zurück.

const ALBUM_URL =
  process.env.ALBUM_URL ||
  "https://photos.google.com/share/AF1QipOR7bgTmzxJHAo9Z2g6t9aH6zN6A93ek4kmTEqNvpdvbpXHKxllNI7-aQg-LPu6vg?key=MVFCOG5tN3piSkVvbHV3dGloV3dHdUhhUkNDbTN3";

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(ALBUM_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "de,en;q=0.8",
      },
      redirect: "follow",
    });
    const html = await r.text();

    // Foto-Basis-URLs (ohne Grössen-Suffix wie "=w600-h315-p-k").
    // Avatar-Bilder liegen unter /a/ und werden so automatisch ausgeschlossen.
    const re = /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_\-]+/g;
    const seen = new Set();
    const photos = [];
    let m;
    while ((m = re.exec(html))) {
      if (!seen.has(m[0])) { seen.add(m[0]); photos.push(m[0]); }
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // Edge-Caching: 15 Min frisch ausliefern, bis zu 1 h im Hintergrund erneuern.
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({ count: photos.length, photos });
  } catch (e) {
    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json({ count: 0, photos: [], error: "fetch_failed" });
  }
};
