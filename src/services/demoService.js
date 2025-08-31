const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class DemoService {
  constructor() {
    this.demoData = {
      transcription: {
        text: "This is a demo transcription of a YouTube video. It shows how the system processes audio and generates text with timestamps.",
        segments: [
          {
            start: 0,
            end: 3.5,
            text: "This is a demo transcription",
            speaker: "speaker_1",
            confidence: 0.95,
          },
          {
            start: 3.5,
            end: 7.2,
            text: "of a YouTube video.",
            speaker: "speaker_1",
            confidence: 0.92,
          },
          {
            start: 7.2,
            end: 12.8,
            text: "It shows how the system processes audio and generates text with timestamps.",
            speaker: "speaker_2",
            confidence: 0.88,
          },
        ],
        speakers: [
          { id: "speaker_1", name: "Speaker 1" },
          { id: "speaker_2", name: "Speaker 2" },
        ],
        wordTimestamps: [
          { word: "This", start: 0, end: 0.5, confidence: 0.95 },
          { word: "is", start: 0.5, end: 1.0, confidence: 0.94 },
          { word: "a", start: 1.0, end: 1.2, confidence: 0.93 },
          { word: "demo", start: 1.2, end: 2.0, confidence: 0.96 },
          { word: "transcription", start: 2.0, end: 3.5, confidence: 0.95 },
        ],
        metadata: {
          language: "en",
          duration: 12.8,
          confidence: 0.92,
        },
      },
      aiDetection: {
        segments: [
          {
            start: 0,
            end: 3.5,
            text: "This is a demo transcription",
            ai_detection: {
              ai_probability: 0.15,
              prediction: "human",
              confidence: 0.87,
            },
          },
          {
            start: 3.5,
            end: 7.2,
            text: "of a YouTube video.",
            ai_detection: {
              ai_probability: 0.12,
              prediction: "human",
              confidence: 0.89,
            },
          },
          {
            start: 7.2,
            end: 12.8,
            text: "It shows how the system processes audio and generates text with timestamps.",
            ai_detection: {
              ai_probability: 0.08,
              prediction: "human",
              confidence: 0.91,
            },
          },
        ],
        overall_ai_probability: 0.12,
      },
    };
  }

  async simulateAnalysis(youtubeUrl, analysisId) {
    logger.info(`Starting DEMO analysis for: ${youtubeUrl}`);

    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create demo screenshot
      const screenshotPath = await this.createDemoScreenshot(analysisId);

      // Create demo audio file
      const audioPath = await this.createDemoAudio(analysisId);

      // Ensure directories exist
      const screenshotsDir = path.join(__dirname, "../../screenshots");
      const audioDir = path.join(__dirname, "../../data/audio");

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      logger.info("DEMO analysis completed successfully");

      return {
        success: true,
        screenshot_path: screenshotPath,
        audio_path: audioPath,
        transcription: this.demoData.transcription,
        ai_probabilities: this.demoData.aiDetection,
        processing_time: 2000,
      };
    } catch (error) {
      logger.error("Error in DEMO analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createDemoScreenshot(analysisId) {
    const screenshotsDir = path.join(__dirname, "../../screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotsDir, `demo_${analysisId}.png`);

    // Create a simple demo image (1x1 pixel PNG)
    const demoImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xff, 0xff, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    fs.writeFileSync(screenshotPath, demoImageBuffer);
    return `screenshots/demo_${analysisId}.png`;
  }

  async createDemoAudio(analysisId) {
    const audioDir = path.join(__dirname, "../../data/audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const audioPath = path.join(audioDir, `demo_${analysisId}.wav`);

    // Create a simple demo WAV file (1 second of silence)
    const demoWavBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
    ]);

    fs.writeFileSync(audioPath, demoWavBuffer);
    return `data/audio/demo_${analysisId}.wav`;
  }

  getDemoData() {
    return this.demoData;
  }
}

module.exports = DemoService;
