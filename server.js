import { createServer } from "http";
import { parse } from "url";
import next from "next";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize WebSocket server after Next.js is ready
  try {
    // Dynamic import to ensure environment variables are loaded
    // tsx allows importing TypeScript files directly
    const { initializeWebSocketServer } = await import(
      "./src/lib/websocket/server.ts"
    );
    await initializeWebSocketServer(server);
    console.log("✅ WebSocket server initialized");
  } catch (err) {
    console.error("⚠️  WebSocket initialization error:", err.message);
    console.error("Full error:", err);
    console.log("💡 Server will continue without WebSocket");
    console.log("💡 WebSocket features will be unavailable");
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`📱 Open http://localhost:${port} in your browser`);
  });
});
