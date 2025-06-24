const express = require("express");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// ✅ Allow all origins for now (you can restrict to Netlify URL later)
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// ✅ Main Proxy Route
app.post("/ws-proxy", async (req, res) => {
  const { commands } = req.body;

  if (!Array.isArray(commands) || commands.length === 0) {
    return res.status(400).json({ error: "No commands provided" });
  }

  try {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");
    const responses = [];
    let hasResponded = false;

    ws.on("open", () => {
      commands.forEach(cmd => {
        ws.send(JSON.stringify(cmd));
      });
    });

    ws.on("message", (msg) => {
      const data = JSON.parse(msg);
      responses.push(data);

      const allDone = responses.length >= commands.length;
      const hasTick = responses.some(r => r.tick);
      const hasProposal = responses.some(r => r.proposal);
      const hasBuy = responses.some(r => r.buy);

      if ((allDone || hasTick || hasProposal || hasBuy) && !hasResponded) {
        hasResponded = true;
        ws.close();
        return res.json({ result: responses });
      }
    });

    ws.on("error", (err) => {
      if (!hasResponded) {
        hasResponded = true;
        ws.close();
        return res.status(500).json({ error: "WebSocket error", details: err.message });
      }
    });

    ws.on("close", () => {
      if (!hasResponded) {
        hasResponded = true;
        return res.json({ result: responses });
      }
    });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ✅ Test Route
app.get("/", (_, res) => {
  res.send("✅ DanPaulsFX Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 DanPaulsFX server running on port ${PORT}`));
