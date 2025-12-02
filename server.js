import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// ======== CONFIG ========
const STABLE_HORDE_KEY = "ZnSuFFs1CaDzGlN0IxmLVA"; // your API key

// ======== ROOT ========
app.get("/", (req, res) => {
  res.send("AI Proxy is running with Optimized Stable Horde Settings!");
});

// ======== GENERATE IMAGE ========
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // === SUPER OPTIMIZED PARAMETERS ===
    const payload = {
      prompt,
      params: {
        width: 512,              // 🔥 lowest kudos + fastest
        height: 512,
        steps: 20,               // low steps = faster
        sampler_name: "k_euler", // works with almost all workers
        n: 1,

        // Performance tricks:
        cfg_scale: 7,
        seed: 0,
        karras: false,
        hires_fix: false,
        tiling: false,
        
        // FAST QUEUE
        slow_workers: false,

        // Helps match more workers
        censor_nsfw: true,
      },

      // PRIORITY BOOST
      max_priority: true,
      trusted_workers: false
    };

    // === SUBMIT JOB ===
    const submit = await fetch("https://stablehorde.net/api/v2/generate/async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": STABLE_HORDE_KEY
      },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    console.log("Submit response:", submit);

    if (!submit.id) {
      return res.status(500).json({ error: "Failed to submit job", details: submit });
    }

    const jobId = submit.id;
    let attempts = 0;
    let result;

    // === POLLING — 1 poll every 5 seconds (safe, no rate limits) ===
    while (attempts < 60) { 
      await new Promise(r => setTimeout(r, 5000)); // ⏳ wait 5 seconds per poll

      const status = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`)
        .then(r => r.json())
        .catch(() => null);

      console.log("Poll status:", status);

      if (!status) continue;

      // If image is ready
      if (status.done && status.generations?.length > 0) {
        result = status.generations[0].img;
        break;
      }

      attempts++;
    }

    if (!result) {
      return res.status(500).json({
        error: "Stable Horde queue too busy. Try again with a smaller prompt or later."
      });
    }

    return res.json({ image: result });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Error: " + err.message });
  }
});

// ======== START SERVER ========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
