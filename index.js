// DanPaulsFX Bot Backend Proxy (Node.js + Express + WebSocket)

const express = require("express");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/ws-proxy", async (req, res) => {
  const { commands } = req.body;
  if (!Array.isArray(commands) || commands.length === 0) {
    return res.status(400).json({ error: "No commands sent" });
  }

  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");
  let responseData = [];

  ws.on("open", () => {
    commands.forEach((cmd) => ws.send(JSON.stringify(cmd)));
  });

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);
      responseData.push(parsed);
      if (responseData.length === commands.length) {
        res.json({ result: responseData });
        ws.close();
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to parse message" });
      ws.close();
    }
  });

  ws.on("error", (err) => {
    res.status(500).json({ error: "WebSocket error", details: err.message });
  });
});

app.get("/", (_, res) => {
  res.send("✅ DanPaulsFX Backend Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 DanPaulsFX Proxy server listening on port ${PORT}`));
