const express = require("express");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// ✅ Allow requests from anywhere
app.use(cors({
  origin: "*"
}));

app.use(bodyParser.json());

app.post("/ws-proxy", async (req, res) => {
  const { commands } = req.body;

  if (!Array.isArray(commands) || commands.length === 0) {
    return res.status(400).json({ error: "No commands sent" });
  }

  try {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3");
    const responses = [];
    let isClosed = false;

    ws.on("open", () => {
      for (const cmd of commands) {
        ws.send(JSON.stringify(cmd));
      }
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        responses.push(data);

        // ✅ If we got all expected responses, send them back
        if (responses.length >= commands.length && !isClosed) {
          isClosed = true;
          ws.close();
          return res.json({ result: responses });
        }
      } catch (e) {
        if (!isClosed) {
          isClosed = true;
          ws.close();
          return res.status(500).json({ error: "Error parsing response", details: e.message });
        }
      }
    });

    ws.on("error", (err) => {
      if (!isClosed) {
        isClosed = true;
        ws.close();
        return res.status(500).json({ error: "WebSocket error", details: err.message });
      }
    });

    ws.on("close", () => {
      if (!isClosed) {
        isClosed = true;
        return res.json({ result: responses });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.get("/", (_, res) => {
  res.send("✅ DanPaulsFX Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 DanPaulsFX server running on port ${PORT}`));
