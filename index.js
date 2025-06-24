const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Enable CORS for Netlify or any frontend
app.use(cors({
  origin: "*", // Replace with your Netlify URL later for security
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

// ✅ POST route that connects to Deriv WebSocket
app.post("/ws-proxy", (req, res) => {
  const { token, asset } = req.body;

  if (!token || !asset) {
    return res.status(400).json({ error: "Token and asset are required." });
  }

  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");

  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: token }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.error) {
      ws.close();
      return res.status(400).json({ error: data.error.message });
    }

    if (data.msg_type === "authorize") {
      ws.send(JSON.stringify({ ticks: asset }));
    }

    if (data.msg_type === "tick") {
      const price = data.tick.quote;
      ws.close();
      return res.json({ price });
    }
  };

  ws.onerror = () => {
    return res.status(500).json({ error: "WebSocket connection error." });
  };
});

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("🟢 DanPaulsFX server is up and running!");
});

app.listen(PORT, () => {
  console.log(`🟢 DanPaulsFX server running on port ${PORT}`);
});
