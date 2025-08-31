const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class AudioService {
  constructor() {
    this.audioDir = process.env.AUDIO_DIR || "./audio";
    this.outputDir = path.join(this.audioDir, "wav");

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async convertToWav(inputPath, analysisId) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.outputDir, `${analysisId}_audio.wav`);

      logger.info(`Starting audio conversion: ${inputPath} -> ${outputPath}`);

      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`Input audio file not found: ${inputPath}`));
        return;
      }

      // FFmpeg command for WAV conversion
      // 16 kHz, mono, 16-bit PCM
      const command = ffmpeg(inputPath)
        .audioChannels(1) // Mono
        .audioFrequency(16000) // 16 kHz
        .audioCodec("pcm_s16le") // 16-bit PCM
        .format("wav") // WAV format
        .outputOptions([
          "-ar 16000", // Sample rate
          "-ac 1", // Audio channels
          "-sample_fmt s16", // Sample format
        ])
        .on("start", (commandLine) => {
          logger.info(`FFmpeg command: ${commandLine}`);
        })
        .on("progress", (progress) => {
          logger.info(`FFmpeg progress: ${progress.percent}% done`);
        })
        .on("stderr", (stderrLine) => {
          logger.debug(`FFmpeg stderr: ${stderrLine}`);
        })
        .on("error", (err, stdout, stderr) => {
          logger.error("FFmpeg error:", err);
          logger.error("FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .on("end", (stdout, stderr) => {
          logger.info(`Audio conversion completed: ${outputPath}`);

          // Verify output file exists and has content
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            resolve(outputPath);
          } else {
            reject(new Error("Output file is empty or missing"));
          }
        });

      // Run the conversion
      command.save(outputPath);
    });
  }

  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get audio info: ${err.message}`));
          return;
        }

        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === "audio"
        );
        if (!audioStream) {
          reject(new Error("No audio stream found"));
          return;
        }

        resolve({
          format: metadata.format.format_name,
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          codec: audioStream.codec_name,
        });
      });
    });
  }

  async cleanupTempFiles(filePaths) {
    try {
      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up temporary file: ${filePath}`);
        }
      }
    } catch (error) {
      logger.warn("Error cleaning up temporary files:", error);
    }
  }

  async processAudio(audioPath, analysisId) {
    try {
      logger.info(`Processing audio file: ${audioPath}`);

      // Get original audio info
      const originalInfo = await this.getAudioInfo(audioPath);
      logger.info("Original audio info:", originalInfo);

      // Convert to WAV format
      const wavPath = await this.convertToWav(audioPath, analysisId);

      // Get converted audio info
      const wavInfo = await this.getAudioInfo(wavPath);
      logger.info("Converted WAV info:", wavInfo);

      return {
        success: true,
        originalPath: audioPath,
        wavPath: wavPath,
        originalInfo: originalInfo,
        wavInfo: wavInfo,
      };
    } catch (error) {
      logger.error("Error processing audio:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = AudioService;
