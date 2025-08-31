const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const logger = require("../utils/logger");

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl =
      process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io";

    // Don't throw error immediately, check when actually using the service
    if (!this.apiKey) {
      console.warn(
        "⚠️ ELEVENLABS_API_KEY not set - service will not work without it"
      );
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async transcribeAudio(audioFilePath, analysisId) {
    try {
      logger.info(`Starting transcription for: ${audioFilePath}`);

      // Check if audio file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioFilePath));
      formData.append("model_id", "eleven_english_sts_v2"); // Speech-to-Speech model
      formData.append("output_format", "json");
      formData.append("enable_timestamps", "true");
      formData.append("enable_speaker_diarization", "true");
      formData.append("enable_word_timestamps", "true");

      // Make transcription request
      const response = await this.client.post("/v1/speech-to-text", formData, {
        headers: {
          ...formData.getHeaders(),
          "xi-api-key": this.apiKey,
        },
        timeout: 300000, // 5 minutes timeout
      });

      if (response.data && response.data.text) {
        logger.info("Transcription completed successfully");

        // Process and format the transcription data
        const transcription = this.processTranscription(response.data);

        return {
          success: true,
          transcription: transcription,
          rawResponse: response.data,
        };
      } else {
        throw new Error("Invalid transcription response");
      }
    } catch (error) {
      logger.error("Error in ElevenLabs transcription:", error);

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

  processTranscription(rawData) {
    try {
      const transcription = {
        text: rawData.text || "",
        segments: [],
        speakers: [],
        wordTimestamps: [],
        metadata: {
          language: rawData.language || "en",
          duration: rawData.duration || 0,
          confidence: rawData.confidence || 0,
        },
      };

      // Process segments if available
      if (rawData.segments && Array.isArray(rawData.segments)) {
        transcription.segments = rawData.segments.map((segment) => ({
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || "",
          speaker: segment.speaker || "unknown",
          confidence: segment.confidence || 0,
        }));
      }

      // Process speaker diarization if available
      if (rawData.speakers && Array.isArray(rawData.speakers)) {
        transcription.speakers = rawData.speakers.map((speaker) => ({
          id: speaker.id || "unknown",
          name: speaker.name || `Speaker ${speaker.id}`,
          segments: speaker.segments || [],
        }));
      }

      // Process word-level timestamps if available
      if (rawData.words && Array.isArray(rawData.words)) {
        transcription.wordTimestamps = rawData.words.map((word) => ({
          word: word.word || "",
          start: word.start || 0,
          end: word.end || 0,
          confidence: word.confidence || 0,
          speaker: word.speaker || "unknown",
        }));
      }

      // If no segments but we have text, create a basic segment
      if (transcription.segments.length === 0 && transcription.text) {
        transcription.segments = [
          {
            start: 0,
            end: transcription.metadata.duration || 0,
            text: transcription.text,
            speaker: "unknown",
            confidence: transcription.metadata.confidence || 0,
          },
        ];
      }

      return transcription;
    } catch (error) {
      logger.error("Error processing transcription data:", error);
      return {
        text: rawData.text || "",
        segments: [],
        speakers: [],
        wordTimestamps: [],
        metadata: {},
        error: "Failed to process transcription data",
      };
    }
  }

  async validateApiKey() {
    try {
      const response = await this.client.get("/v1/user");
      logger.info("ElevenLabs API key validated successfully");
      return {
        valid: true,
        user: response.data,
      };
    } catch (error) {
      logger.error("ElevenLabs API key validation failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async getAvailableModels() {
    try {
      const response = await this.client.get("/v1/models");
      return {
        success: true,
        models: response.data,
      };
    } catch (error) {
      logger.error("Error fetching available models:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ElevenLabsService;
