const express = require("express");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

app.post("/ws-proxy", async (req, res) => {
  const { commands } = req.body;

  if (!Array.isArray(commands) || commands.length === 0) {
    return res.status(400).json({ error: "No commands provided" });
  }

  try {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");
    const responses = [];
    let isResolved = false;

    // Timeout failsafe (10s max wait)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ws.close();
        return res.status(504).json({ error: "WebSocket timeout" });
      }
    }, 10000);

    ws.on("open", () => {
      console.log("🟢 WebSocket connection opened");
      for (let cmd of commands) {
        ws.send(JSON.stringify(cmd));
      }
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        responses.push(data);

        const gotTick = responses.some(r => r.tick);
        const gotProposal = responses.some(r => r.proposal);
        const gotBuy = responses.some(r => r.buy);

        if ((gotTick || gotProposal || gotBuy) && !isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          ws.close();
          return res.json({ result: responses });
        }
      } catch (err) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          ws.close();
          return res.status(500).json({ error: "Parse error", details: err.message });
        }
      }
    });

    ws.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        ws.close();
        return res.status(500).json({ error: "WebSocket error", details: err.message });
      }
    });

    ws.on("close", () => {
      if (!isResolved) {
        clearTimeout(timeout);
        isResolved = true;
        return res.json({ result: responses });
      }
    });

  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error.message });
  }
});

app.get("/", (_, res) => {
  res.send("✅ DanPaulsFX Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 DanPaulsFX server running on port ${PORT}`));
