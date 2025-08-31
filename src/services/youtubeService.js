const puppeteer = require("puppeteer");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

class YouTubeService {
  constructor() {
    this.browser = null;
    this.screenshotDir = process.env.SCREENSHOT_DIR || "./screenshots";
    this.audioDir = process.env.AUDIO_DIR || "./audio";

    // Ensure directories exist
    [this.screenshotDir, this.audioDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });
      logger.info("Puppeteer browser initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Puppeteer browser:", error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info("Puppeteer browser closed");
    }
  }

  async captureScreenshot(youtubeUrl, analysisId) {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const screenshotPath = path.join(
      this.screenshotDir,
      `${analysisId}_screenshot.png`
    );

    try {
      logger.info(`Loading YouTube page: ${youtubeUrl}`);

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Navigate to YouTube page
      await page.goto(youtubeUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for video player to load
      await page.waitForSelector("#movie_player", { timeout: 15000 });

      // Wait a bit more for video to fully load
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });

      logger.info(`Screenshot captured: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      logger.error("Error capturing screenshot:", error);
      throw new Error(`Failed to capture screenshot: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async downloadAudio(youtubeUrl, analysisId) {
    try {
      logger.info(`Starting audio download for: ${youtubeUrl}`);

      // Validate YouTube URL
      if (!ytdl.validateURL(youtubeUrl)) {
        throw new Error("Invalid YouTube URL");
      }

      // Get video info
      const info = await ytdl.getInfo(youtubeUrl);
      const videoTitle = info.videoDetails.title;

      // Filter for audio-only format
      const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
      if (audioFormats.length === 0) {
        throw new Error("No audio formats available");
      }

      // Choose best audio format
      const bestAudio = audioFormats.reduce((prev, current) => {
        return (prev.audioBitrate || 0) > (current.audioBitrate || 0)
          ? prev
          : current;
      });

      const audioPath = path.join(
        this.audioDir,
        `${analysisId}_audio.${bestAudio.container}`
      );

      logger.info(
        `Downloading audio: ${bestAudio.container}, bitrate: ${bestAudio.audioBitrate}kbps`
      );

      // Download audio stream
      const audioStream = ytdl(youtubeUrl, {
        format: bestAudio,
        quality: "highestaudio",
      });

      // Create write stream
      const writeStream = fs.createWriteStream(audioPath);

      // Handle download progress
      let downloadedBytes = 0;
      const totalBytes = parseInt(
        info.formats.find((f) => f.itag === bestAudio.itag)?.contentLength ||
          "0"
      );

      audioStream.on("progress", (chunkLength, downloaded, total) => {
        downloadedBytes = downloaded;
        const percent =
          total > 0 ? ((downloaded / total) * 100).toFixed(2) : "0";
        logger.info(`Audio download progress: ${percent}%`);
      });

      // Handle download completion
      return new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
          logger.info(`Audio download completed: ${audioPath}`);
          resolve(audioPath);
        });

        writeStream.on("error", (error) => {
          logger.error("Error writing audio file:", error);
          reject(error);
        });

        audioStream.on("error", (error) => {
          logger.error("Error downloading audio:", error);
          reject(error);
        });

        // Pipe audio stream to file
        audioStream.pipe(writeStream);
      });
    } catch (error) {
      logger.error("Error downloading audio:", error);
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  async processVideo(youtubeUrl, analysisId) {
    try {
      logger.info(`Starting video processing for: ${youtubeUrl}`);

      // Capture screenshot
      const screenshotPath = await this.captureScreenshot(
        youtubeUrl,
        analysisId
      );

      // Download audio
      const audioPath = await this.downloadAudio(youtubeUrl, analysisId);

      return {
        screenshotPath,
        audioPath,
        success: true,
      };
    } catch (error) {
      logger.error("Error processing video:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = YouTubeService;
