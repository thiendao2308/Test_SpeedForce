const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const logger = require("./utils/logger");
const { initializeDatabase } = require("./models/database");
const analysisRoutes = require("./routes/analysis");
const resultRoutes = require("./routes/result");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/", express.static(path.join(__dirname, "../public")));
app.use("/screenshots", express.static(path.join(__dirname, "../screenshots")));

// Routes
app.use("/api/analyze", analysisRoutes);
app.use("/api/result", resultRoutes);

// Web form route (after static files to avoid conflicts)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "YouTube Analysis Service",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info("Database initialized successfully");

    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Web interface available at http://localhost:${PORT}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
