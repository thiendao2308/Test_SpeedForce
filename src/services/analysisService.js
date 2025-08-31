const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const YouTubeService = require("./youtubeService");
const AudioService = require("./audioService");
const ElevenLabsService = require("./elevenLabsService");
const GPTZeroService = require("./gptZeroService");
const DemoService = require("./demoService");
const { dbOperations } = require("../models/database");

class AnalysisService {
  constructor() {
    this.youtubeService = new YouTubeService();
    this.audioService = new AudioService();
    this.elevenLabsService = new ElevenLabsService();
    this.gptZeroService = new GPTZeroService();
    this.demoService = new DemoService();

    // Check if we're in demo mode (no API keys)
    this.isDemoMode =
      !process.env.ELEVENLABS_API_KEY || !process.env.GPTZERO_API_KEY;
    if (this.isDemoMode) {
      logger.info("🚀 Running in DEMO MODE - using simulated data");
    }
  }

  async startAnalysis(youtubeUrl) {
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`Starting analysis for YouTube URL: ${youtubeUrl}`);
      logger.info(`Analysis ID: ${analysisId}`);

      // Insert analysis job into database
      await dbOperations.insertAnalysis(analysisId, youtubeUrl);
      await dbOperations.updateStatus(analysisId, "processing");

      // Check if we're in demo mode
      if (this.isDemoMode) {
        logger.info(
          "🚀 Running in DEMO MODE - simulating full analysis pipeline"
        );

        // Simulate the entire analysis process
        const demoResult = await this.demoService.simulateAnalysis(
          youtubeUrl,
          analysisId
        );

        if (!demoResult.success) {
          throw new Error(`Demo analysis failed: ${demoResult.error}`);
        }

        // Update database with demo result
        const processingTime = Date.now() - startTime;
        await dbOperations.updateStatus(analysisId, "completed", {
          screenshotPath: demoResult.screenshot_path,
          audioPath: demoResult.audio_path,
          transcription: JSON.stringify(demoResult.transcription),
          aiProbabilities: JSON.stringify(demoResult.ai_probabilities),
          processingTime: processingTime,
        });

        logger.info("🎉 DEMO analysis completed successfully!");

        return {
          success: true,
          analysis_id: analysisId,
          result: {
            id: analysisId,
            youtube_url: youtubeUrl,
            status: "completed",
            screenshot_path: demoResult.screenshot_path,
            audio_path: demoResult.audio_path,
            transcription: demoResult.transcription,
            ai_probabilities: demoResult.ai_probabilities,
            processing_time: processingTime,
            created_at: new Date().toISOString(),
            metadata: {
              demo_mode: true,
              note: "This is a demo result with simulated data",
            },
          },
        };
      }

      // REAL MODE - Use actual services
      logger.info("🔧 Running in REAL MODE - using actual API services");

      // Step 1: Process YouTube video (screenshot + audio download)
      logger.info("Step 1: Processing YouTube video...");
      const videoResult = await this.youtubeService.processVideo(
        youtubeUrl,
        analysisId
      );

      if (!videoResult.success) {
        throw new Error(`Video processing failed: ${videoResult.error}`);
      }

      await dbOperations.updateStatus(analysisId, "video_processed", {
        screenshotPath: videoResult.screenshotPath,
      });

      // Step 2: Convert audio to WAV format
      logger.info("Step 2: Converting audio to WAV format...");
      const audioResult = await this.audioService.processAudio(
        videoResult.audioPath,
        analysisId
      );

      if (!audioResult.success) {
        throw new Error(`Audio conversion failed: ${audioResult.error}`);
      }

      await dbOperations.updateStatus(analysisId, "audio_converted", {
        audioPath: audioResult.wavPath,
      });

      // Step 3: Transcribe audio with ElevenLabs Scribe
      logger.info("Step 3: Transcribing audio with ElevenLabs Scribe...");
      const transcriptionResult = await this.elevenLabsService.transcribeAudio(
        audioResult.wavPath,
        analysisId
      );

      if (!transcriptionResult.success) {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      }

      await dbOperations.updateStatus(analysisId, "transcribed");

      // Step 4: Process each sentence through GPTZero for AI detection
      logger.info("Step 4: Processing AI detection with GPTZero...");
      const aiDetectionResult =
        await this.gptZeroService.processTranscriptionSegments(
          transcriptionResult.transcription
        );

      if (!aiDetectionResult.success) {
        logger.warn(`AI detection had some issues: ${aiDetectionResult.error}`);
      }

      // Step 5: Prepare final result
      const processingTime = Date.now() - startTime;
      const finalResult = {
        id: analysisId,
        youtube_url: youtubeUrl,
        status: "completed",
        screenshot_path: videoResult.screenshotPath,
        audio_path: audioResult.wavPath,
        transcription:
          aiDetectionResult.segments || transcriptionResult.transcription,
        ai_probabilities: {
          overall_ai_probability: aiDetectionResult.overall_ai_probability || 0,
          processed_segments: aiDetectionResult.processed_segments || 0,
          total_segments: aiDetectionResult.total_segments || 0,
        },
        processing_time: processingTime,
        created_at: new Date().toISOString(),
        metadata: {
          original_audio_info: audioResult.originalInfo,
          wav_audio_info: audioResult.wavInfo,
          transcription_metadata: transcriptionResult.transcription.metadata,
        },
      };

      // Update database with final result
      await dbOperations.updateStatus(analysisId, "completed", {
        transcription: JSON.stringify(finalResult.transcription),
        aiProbabilities: JSON.stringify(finalResult.ai_probabilities),
        processingTime: processingTime,
      });

      logger.info(`Analysis completed successfully in ${processingTime}ms`);

      return {
        success: true,
        analysis_id: analysisId,
        result: finalResult,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Analysis failed for ${analysisId}:`, error);

      // Update database with error status
      await dbOperations.updateStatus(analysisId, "failed", {
        errorMessage: error.message,
        processingTime: processingTime,
      });

      return {
        success: false,
        analysis_id: analysisId,
        error: error.message,
        processing_time: processingTime,
      };
    } finally {
      // Cleanup temporary files
      try {
        if (this.isDemoMode) {
          // Demo mode - no cleanup needed
          return;
        }
        if (videoResult && videoResult.audioPath) {
          await this.audioService.cleanupTempFiles([videoResult.audioPath]);
        }
      } catch (cleanupError) {
        logger.warn("Error during cleanup:", cleanupError);
      }
    }
  }

  async getAnalysisResult(analysisId) {
    try {
      const result = await dbOperations.getAnalysisById(analysisId);

      if (!result) {
        return {
          success: false,
          error: "Analysis not found",
        };
      }

      // Parse JSON fields
      let transcription = null;
      let aiProbabilities = null;

      try {
        if (result.transcription) {
          transcription = JSON.parse(result.transcription);
        }
        if (result.ai_probabilities) {
          aiProbabilities = JSON.parse(result.ai_probabilities);
        }
      } catch (parseError) {
        logger.warn("Error parsing JSON fields:", parseError);
      }

      return {
        success: true,
        result: {
          id: result.id,
          youtube_url: result.youtube_url,
          status: result.status,
          screenshot_path: result.screenshot_path,
          audio_path: result.audio_path,
          transcription: transcription,
          ai_probabilities: aiProbabilities,
          error_message: result.error_message,
          processing_time: result.processing_time,
          created_at: result.created_at,
          updated_at: result.updated_at,
        },
      };
    } catch (error) {
      logger.error("Error getting analysis result:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAllAnalyses() {
    try {
      const analyses = await dbOperations.getAllAnalyses();

      return {
        success: true,
        analyses: analyses.map((analysis) => ({
          id: analysis.id,
          youtube_url: analysis.youtube_url,
          status: analysis.status,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at,
          processing_time: analysis.processing_time,
        })),
      };
    } catch (error) {
      logger.error("Error getting all analyses:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cleanup() {
    try {
      await this.youtubeService.close();
      logger.info("Analysis service cleanup completed");
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}

module.exports = AnalysisService;
