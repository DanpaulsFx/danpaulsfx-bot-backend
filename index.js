const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🟢 DanPaulsFX server is running");
});

app.post("/ws-proxy", async (req, res) => {
  const { token, asset } = req.body;

  if (!token || !asset) {
    return res.status(400).json({ error: "Token and asset are required." });
  }

  try {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");

    let price = null;
    let sentResponse = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error && !sentResponse) {
        sentResponse = true;
        ws.close();
        return res.status(500).json({ error: data.error.message });
      }

      if (data.msg_type === "authorize") {
        ws.send(JSON.stringify({ ticks: asset }));
      }

      if (data.msg_type === "tick" && !sentResponse) {
        price = parseFloat(data.tick.quote);
        sentResponse = true;
        ws.close();
        return res.json({ result: { tick: { quote: price } } });
      }
    };

    ws.onerror = () => {
      if (!sentResponse) {
        sentResponse = true;
        return res.status(500).json({ error: "WebSocket error." });
      }
    };

    ws.onclose = () => {
      if (!sentResponse) {
        sentResponse = true;
        return res.status(500).json({ error: "Failed to fetch price." });
      }
    };
  } catch (err) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`🟢 DanPaulsFX server running on port ${PORT}`);
});
