import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const HORDE_API_KEY = "0000000000"; // no key needed for anon usage

app.post("/generate", async (req, res) => {
  try {
    const payload = req.body;

    // 1. Submit job
    const submit = await fetch("https://stablehorde.net/api/v2/generate/async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": HORDE_API_KEY
      },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    const id = submit.id;
    console.log("Job submitted:", id);

    // 2. Poll until done
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

app.listen(3000, () => console.log("Proxy running on port 3000"));
