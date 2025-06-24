const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

app.post("/ws-proxy", async (req, res) => {
  const { token, asset } = req.body;

  if (!token || !asset) {
    return res.status(400).json({ error: "Token and asset are required." });
  }

  try {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");
    let price;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
      ws.send(JSON.stringify({ ticks: asset }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === "tick") {
        price = data.tick.quote;
        ws.close();
      }
    };

    ws.onclose = () => {
      if (price) {
        res.json({ result: { price } });
      } else {
        res.status(500).json({ error: "Failed to fetch price." });
      }
    };

    ws.onerror = () => {
      res.status(500).json({ error: "WebSocket error occurred." });
    };
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

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
