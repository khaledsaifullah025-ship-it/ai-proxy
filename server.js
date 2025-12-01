import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route (test)
app.get("/", (req, res) => {
  res.send("AI Proxy is running! Use /generate to POST requests.");
});

// POST /generate
app.post("/generate", async (req, res) => {
  try {
    const payload = req.body;

    // Submit job to Stable Horde (anonymous)
    const submit = await fetch("https://stablehorde.net/api/v2/generate/async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    const id = submit.id;
    if (!id) return res.status(500).json({ error: "Failed to get job id." });

    console.log("Job submitted:", id);

    // Poll until done
    let result;
    while (true) {
      await new Promise(r => setTimeout(r, 2500));
      const check = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`).then(r => r.json());
      if (check.done) {
        result = check.generations[0].img;
        break;
      }
    }

    res.json({ image: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed." });
  }
});

// Use Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
