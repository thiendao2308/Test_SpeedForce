const axios = require("axios");
const logger = require("../utils/logger");

class GPTZeroService {
  constructor() {
    this.apiKey = process.env.GPTZERO_API_KEY;
    this.baseUrl = process.env.GPTZERO_BASE_URL || "https://api.gptzero.me";

    // Don't throw error immediately, check when actually using the service
    if (!this.apiKey) {
      console.warn(
        "⚠️ GPTZERO_API_KEY not set - service will not work without it"
      );
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async detectAIProbability(text) {
    try {
      logger.info(
        `Starting AI detection for text: ${text.substring(0, 100)}...`
      );

      // Prepare the request payload
      const payload = {
        text: text,
        model: "gpt-4", // Use GPT-4 model for better accuracy
        include_metadata: true,
      };

      // Make API request to GPTZero
      const response = await this.client.post("/v2/predict", payload, {
        timeout: 60000, // 1 minute timeout
      });

      if (
        response.data &&
        response.data.documents &&
        response.data.documents.length > 0
      ) {
        const result = response.data.documents[0];

        logger.info("AI detection completed successfully");

        return {
          success: true,
          aiProbability: result.ai_probability || 0,
          prediction: result.prediction || "unknown",
          confidence: result.confidence || 0,
          metadata: result.metadata || {},
          rawResponse: response.data,
        };
      } else {
        throw new Error("Invalid GPTZero response format");
      }
    } catch (error) {
      logger.error("Error in GPTZero AI detection:", error);

      if (error.response) {
        logger.error("API Response Error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      };
    }
  }

  async processTranscriptionSegments(transcription) {
    try {
      logger.info("Processing transcription segments for AI detection");

      if (
        !transcription ||
        !transcription.segments ||
        !Array.isArray(transcription.segments)
      ) {
        throw new Error("Invalid transcription format");
      }

      const results = [];
      let processedCount = 0;
      const totalSegments = transcription.segments.length;

      // Process each segment individually
      for (const segment of transcription.segments) {
        try {
          logger.info(
            `Processing segment ${processedCount + 1}/${totalSegments}`
          );

          if (segment.text && segment.text.trim().length > 0) {
            // Detect AI probability for this segment
            const aiResult = await this.detectAIProbability(
              segment.text.trim()
            );

            // Add AI detection results to the segment
            const enhancedSegment = {
              ...segment,
              ai_detection: aiResult.success
                ? {
                    ai_probability: aiResult.aiProbability,
                    prediction: aiResult.prediction,
                    confidence: aiResult.confidence,
                    metadata: aiResult.metadata,
                  }
                : {
                    error: aiResult.error,
                    details: aiResult.details,
                  },
            };

            results.push(enhancedSegment);
          } else {
            // Empty segment, add without AI detection
            results.push({
              ...segment,
              ai_detection: {
                ai_probability: 0,
                prediction: "empty",
                confidence: 0,
              },
            });
          }

          processedCount++;

          // Add small delay to avoid rate limiting
          if (processedCount < totalSegments) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (segmentError) {
          logger.error(
            `Error processing segment ${processedCount + 1}:`,
            segmentError
          );

          // Add error information to the segment
          results.push({
            ...segment,
            ai_detection: {
              error: segmentError.message,
              ai_probability: 0,
              prediction: "error",
              confidence: 0,
            },
          });

          processedCount++;
        }
      }

      // Calculate overall AI probability
      const validResults = results.filter(
        (r) => r.ai_detection && !r.ai_detection.error
      );
      const overallAIProbability =
        validResults.length > 0
          ? validResults.reduce(
              (sum, r) => sum + (r.ai_detection.ai_probability || 0),
              0
            ) / validResults.length
          : 0;

      logger.info(
        `AI detection completed for ${processedCount}/${totalSegments} segments`
      );

      return {
        success: true,
        segments: results,
        overall_ai_probability: overallAIProbability,
        processed_segments: processedCount,
        total_segments: totalSegments,
      };
    } catch (error) {
      logger.error("Error processing transcription segments:", error);
      return {
        success: false,
        error: error.message,
        segments: transcription.segments || [],
      };
    }
  }

  async validateApiKey() {
    try {
      // GPTZero doesn't have a simple validation endpoint, so we'll test with a simple text
      const testResult = await this.detectAIProbability(
        "This is a test sentence."
      );

      if (testResult.success) {
        logger.info("GPTZero API key validated successfully");
        return {
          valid: true,
          test_result: testResult,
        };
      } else {
        throw new Error("Test request failed");
      }
    } catch (error) {
      logger.error("GPTZero API key validation failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async getUsageInfo() {
    try {
      const response = await this.client.get("/v2/usage");
      return {
        success: true,
        usage: response.data,
      };
    } catch (error) {
      logger.error("Error fetching usage info:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = GPTZeroService;
