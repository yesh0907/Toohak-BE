import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Server as IOServer } from "socket.io";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

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
const io = new IOServer(httpServer, {
    // Cross-Origin Resource Sharing
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

httpServer.listen(port, () => {
    console.log(`Toohak Backend is running on port ${port}`);
});

// Handle new web socket connection
io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
