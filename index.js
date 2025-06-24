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

    let authorized = false;

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
        authorized = true;
        ws.send(JSON.stringify({ ticks: asset }));
      }

      if (data.msg_type === "tick" && authorized) {
        ws.close();
        return res.json({
          result: [
            { tick: { quote: data.tick.quote } }
          ]
        });
      }
    };

    ws.onerror = () => {
      return res.status(500).json({ error: "WebSocket error." });
    };

  } catch (err) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

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
