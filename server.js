import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("AI Proxy is running! Use /generate to POST requests.");
});

// POST /generate
app.post("/generate", async (req, res) => {
  try {
    const { prompt, params } = req.body;
    if (!prompt || !params) {
      return res.status(400).json({ error: "Prompt and params required" });
    }

    const payload = {
      prompt,
      params: {
        ...params,
        steps: 30,             // Optional: generation quality
        sampler_name: "k_euler",
        n: 1
      }
    };

    // Submit job
    const submit = await fetch("https://stablehorde.net/api/v2/generate/async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    console.log("Submit response:", submit);

    if (!submit.id) {
      return res.status(500).json({ error: "Failed to submit job.", details: submit });
    }

    const jobId = submit.id;
    let attempts = 0;
    let result;

    // Polling loop (max 60s)
    while (attempts < 24) {
      await new Promise(r => setTimeout(r, 2500));
      const status = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`)
        .then(r => r.json());

      console.log("Poll status:", status);

      if (status.done && status.generations?.length > 0) {
        result = status.generations[0].img;
        break;
      }

      attempts++;
    }

    if (!result) return res.status(500).json({ error: "Generation timed out." });

    res.json({ image: result });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Generation failed: " + err.message });
  }
});

// Use Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
