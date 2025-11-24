// This file dynamically loads the TypeScript WebSocket server
// Now using relative imports to avoid Node.js alias resolution issues

const path = require("path");
const { pathToFileURL } = require("url");

module.exports = {
  initializeWebSocketServer: async (server) => {
    try {
      // Construct the full path to the TypeScript file
      const serverPath = path.join(__dirname, "server.ts");
      const fileUrl = pathToFileURL(serverPath).href;

      // Import the TypeScript file directly (Node.js 18+ with ESM support)
      const wsModule = await import(fileUrl);
      wsModule.initializeWebSocketServer(server);
      console.log("✅ WebSocket server loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load WebSocket server:", error.message);
      throw error;
    }
  },
};
