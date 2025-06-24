const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("🟢 DanPaulsFX server is running");
});

// WebSocket proxy route
app.post("/ws-proxy", async (req, res) => {
  const { token, asset } = req.body;

  if (!token || !asset) {
    return res.status(400).json({ error: "Token and asset are required." });
  }

  let ws = new WebSocket("wss://ws.derivws.com/websockets/v3");

  let isAuthorized = false;
  let priceFetched = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: token }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.error) {
      ws.close();
      return res.status(500).json({ error: data.error.message });
    }

    if (data.msg_type === "authorize") {
      isAuthorized = true;
      ws.send(JSON.stringify({ ticks: asset }));
    }

    if (data.msg_type === "tick" && isAuthorized && !priceFetched) {
      priceFetched = true;
      const price = data.tick.quote;
      res.json({ result: { price } });
      ws.close();
    }
  };

  ws.onerror = () => {
    return res.status(500).json({ error: "WebSocket connection error." });
  };

  // Handle timeout or unexpected disconnects
  setTimeout(() => {
    if (!priceFetched) {
      ws.close();
      return res.status(500).json({ error: "Timeout fetching price." });
    }
  }, 5000);
});

// Start server
app.listen(PORT, () => {
  console.log(`🟢 DanPaulsFX server running on port ${PORT}`);
});
