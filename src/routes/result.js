const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const AnalysisService = require("../services/analysisService");

// Initialize analysis service
const analysisService = new AnalysisService();

// GET /api/result/:id - Get analysis result by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format (UUID)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid analysis ID format",
      });
    }

    logger.info(`Fetching analysis result for ID: ${id}`);

    const result = await analysisService.getAnalysisResult(id);

    if (result.success) {
      // Check if analysis is still processing
      if (
        result.result.status === "pending" ||
        result.result.status === "processing"
      ) {
        return res.json({
          success: true,
          analysis_id: id,
          status: result.result.status,
          message: "Analysis is still in progress",
          created_at: result.result.created_at,
          updated_at: result.result.updated_at,
        });
      }

      // Check if analysis failed
      if (result.result.status === "failed") {
        return res.json({
          success: true,
          analysis_id: id,
          status: result.result.status,
          error_message: result.result.error_message,
          processing_time: result.result.processing_time,
          created_at: result.result.created_at,
          updated_at: result.result.updated_at,
        });
      }

      // Analysis completed successfully
      res.json({
        success: true,
        analysis_id: id,
        status: result.result.status,
        youtube_url: result.result.youtube_url,
        screenshot_path: result.result.screenshot_path,
        audio_path: result.result.audio_path,
        transcription: result.result.transcription,
        ai_probabilities: result.result.ai_probabilities,
        processing_time: result.result.processing_time,
        created_at: result.result.created_at,
        updated_at: result.result.updated_at,
      });
    } else {
      if (result.error === "Analysis not found") {
        res.status(404).json({
          success: false,
          error: "Analysis not found",
          message: "The requested analysis ID does not exist",
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    }
  } catch (error) {
    logger.error("Error in result endpoint:", error);

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

// GET /api/result - Get all results (alternative to /api/analyze)
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
    logger.error("Error getting all results:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
