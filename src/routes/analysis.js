const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const AnalysisService = require("../services/analysisService");

// Initialize analysis service
const analysisService = new AnalysisService();

// POST /api/analyze - Submit YouTube URL for analysis
router.post("/", async (req, res) => {
  try {
    const { youtube_url } = req.body;

    // Validate input
    if (!youtube_url) {
      return res.status(400).json({
        success: false,
        error: "YouTube URL is required",
      });
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!urlPattern.test(youtube_url)) {
      return res.status(400).json({
        success: false,
        error: "Invalid YouTube URL format",
      });
    }

    logger.info(`Received analysis request for: ${youtube_url}`);

    // Start analysis asynchronously
    const analysisResult = await analysisService.startAnalysis(youtube_url);

    if (analysisResult.success) {
      logger.info(
        `Analysis started successfully: ${analysisResult.analysis_id}`
      );

      res.status(202).json({
        success: true,
        message: "Analysis started successfully",
        analysis_id: analysisResult.analysis_id,
        status: "processing",
        estimated_time: "2-5 minutes depending on video length",
      });
    } else {
      logger.error(`Analysis failed to start: ${analysisResult.error}`);

      res.status(500).json({
        success: false,
        error: "Failed to start analysis",
        details: analysisResult.error,
      });
    }
  } catch (error) {
    logger.error("Error in analysis endpoint:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
});

// GET /api/analyze - Get all analyses (for monitoring)
router.get("/", async (req, res) => {
  try {
    const result = await analysisService.getAllAnalyses();

    if (result.success) {
      res.json({
        success: true,
        analyses: result.analyses,
        total: result.analyses.length,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("Error getting all analyses:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Cleanup on process termination
process.on("SIGINT", async () => {
  await analysisService.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await analysisService.cleanup();
  process.exit(0);
});

module.exports = router;
