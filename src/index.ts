import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { startIOServer } from "./io";
import { dbInterface } from "./db";

// Connect to DB
const instance = new dbInterface();

// Create Hono App
const app = new Hono();

// Set up logger for all routes
app.use("*", logger());

// Set up cors for all routes
app.use(cors());

// Starter route
app.get("/", (c) => {
    return c.text("Hello Hono!");
});

// Check the status if the backend is running
app.get("/health", (c) => {
    return c.json({ running: true });
});

const port = 3000;

// Start an HTTP server to serve the Hono App
const httpServer = serve({
    fetch: app.fetch,
    port,
});

// Create Socket.io server on top of the HTTP server
startIOServer(httpServer);

httpServer.listen(port, () => {
    console.log(`Toohak Backend is running on port ${port}`);
});
