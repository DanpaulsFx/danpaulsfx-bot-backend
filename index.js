const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

app.post("/ws-proxy", (req, res) => {
  const { token, asset } = req.body;

  if (!token || !asset) {
    return res.status(400).json({ error: "Token and asset are required." });
  }

  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");

  let isAuthorized = false;
  let hasResponded = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: token }));
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.error) {
      if (!hasResponded) {
        hasResponded = true;
        res.status(500).json({ error: data.error.message });
        ws.close();
      }
      return;
    }

    if (data.msg_type === "authorize") {
      isAuthorized = true;
      ws.send(JSON.stringify({ ticks: asset }));
    }

    if (data.msg_type === "tick") {
      if (!hasResponded) {
        hasResponded = true;
        res.json({ result: { price: data.tick.quote } });
        ws.close();
      }
    }
  };

  ws.onerror = (err) => {
    if (!hasResponded) {
      hasResponded = true;
      res.status(500).json({ error: "WebSocket error: " + err.message });
    }
  };

  ws.onclose = () => {
    if (!hasResponded) {
      res.status(500).json({ error: "WebSocket closed before receiving data." });
    }
  };
});

app.get("/", (req, res) => {
  res.send("🟢 DanPaulsFX server is running");
});

app.listen(PORT, () => {
  console.log(`🟢 DanPaulsFX server running on port ${PORT}`);
});
