const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

const publicDir = __dirname;
app.use(express.static(publicDir));

function mustGetApiKey() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  return key || null;
}

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = mustGetApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "Server is missing GEMINI_API_KEY. Set it in .env then restart the server."
      });
    }

    const msg = (req.body && req.body.message ? String(req.body.message) : "").trim();
    const systemInstruction = (req.body && req.body.systemInstruction ? String(req.body.systemInstruction) : "").trim();

    if (!msg) return res.status(400).json({ error: "Missing message" });

    const model = req.body && req.body.model ? String(req.body.model) : "gemini-2.0-flash";

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: msg }]
        }
      ]
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: data && (data.error?.message || data.error) ? (data.error?.message || data.error) : "Gemini request failed",
        raw: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim() || "";

    return res.json({ text });
  } catch (e) {
    return res.status(500).json({ error: e && e.message ? e.message : "Server error" });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/map", (_req, res) => {
  res.redirect(302, "/map.html");
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`TASHEEL server running on http://localhost:${port}`);
});

