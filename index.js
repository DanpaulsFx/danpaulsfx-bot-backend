const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

app.post("/ws-proxy", async (req, res) => {
  const { token, asset } = req.body;
  if (!token || !asset) return res.status(400).json({ error: "Token and asset required" });

  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");

  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: token }));
  };

  let result = {};

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    if (data.error) {
      ws.close();
      return res.status(500).json({ error: data.error.message });
    }

    if (data.msg_type === "authorize") {
      ws.send(JSON.stringify({ ticks: asset }));
    }

    if (data.msg_type === "tick") {
      result = { price: data.tick.quote };
      ws.close();
    }
  };

  ws.onerror = (err) => {
    res.status(500).json({ error: "WebSocket error: " + err.message });
  };

  ws.onclose = () => {
    if (result.price) {
      return res.json({ result });
    } else {
      return res.status(500).json({ error: "No tick data received" });
    }
  };
});

app.get("/", (req, res) => {
  res.send("🟢 DanPaulsFX server is running");
});

app.listen(PORT, () => {
  console.log(`🟢 DanPaulsFX server running on port ${PORT}`);
});
