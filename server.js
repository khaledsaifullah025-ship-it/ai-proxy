import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Root route – friendly message
app.get("/", (req, res) => {
  res.send("AI Proxy is running! Use the frontend to generate images via POST /generate.");
});

// POST /generate
app.post("/generate", async (req, res) => {
  try {
    const { prompt, params } = req.body;
    if (!prompt || !params) {
      return res.status(400).json({ error: "Prompt and params required" });
    }

    // Use safe defaults if width/height not provided
    const width = params.width || 1024;
    const height = params.height || 1024;

    const payload = {
      prompt,
      params: {
        width,
        height,
        n: 1,
        steps: 30,
        sampler_name: "k_euler"
      }
    };

    // Submit generation job to Stable Horde
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

    // Poll for result (max 2 minutes)
    while (attempts < 48) {
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

    if (!result) {
      return res.status(500).json({ error: "Generation timed out. Try smaller image size or wait longer." });
    }

    // Return base64 image
    res.json({ image: result });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Generation failed: " + err.message });
  }
});

// Use Render port or local port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
