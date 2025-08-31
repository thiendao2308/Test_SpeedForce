const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Ensure data directory exists
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, "analysis.db");
let db;

// Initialize database
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error("Error opening database:", err);
        reject(err);
        return;
      }

      logger.info("Database opened successfully");
      createTables()
        .then(() => resolve())
        .catch(reject);
    });
  });
}

// Create tables
async function createTables() {
  const createAnalysisTable = `
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      youtube_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      screenshot_path TEXT,
      audio_path TEXT,
      transcription TEXT,
      ai_probabilities TEXT,
      error_message TEXT,
      processing_time INTEGER
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(createAnalysisTable, (err) => {
      if (err) {
        logger.error("Error creating tables:", err);
        reject(err);
        return;
      }
      logger.info("Database tables created successfully");
      resolve();
    });
  });
}

// Database operations
const dbOperations = {
  // Insert new analysis job
  insertAnalysis: (id, youtubeUrl) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO analysis_results (id, youtube_url, status)
        VALUES (?, ?, 'pending')
      `;
      db.run(sql, [id, youtubeUrl], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  },

  // Update analysis status
  updateStatus: (id, status, additionalData = {}) => {
    return new Promise((resolve, reject) => {
      let sql =
        "UPDATE analysis_results SET status = ?, updated_at = CURRENT_TIMESTAMP";
      const params = [status];

      if (additionalData.screenshotPath) {
        sql += ", screenshot_path = ?";
        params.push(additionalData.screenshotPath);
      }

      if (additionalData.audioPath) {
        sql += ", audio_path = ?";
        params.push(additionalData.audioPath);
      }

      if (additionalData.transcription) {
        sql += ", transcription = ?";
        params.push(JSON.stringify(additionalData.transcription));
      }

      if (additionalData.aiProbabilities) {
        sql += ", ai_probabilities = ?";
        params.push(JSON.stringify(additionalData.aiProbabilities));
      }

      if (additionalData.errorMessage) {
        sql += ", error_message = ?";
        params.push(additionalData.errorMessage);
      }

      if (additionalData.processingTime) {
        sql += ", processing_time = ?";
        params.push(additionalData.processingTime);
      }

      sql += " WHERE id = ?";
      params.push(id);

      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  },

  // Get analysis result by ID
  getAnalysisById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM analysis_results WHERE id = ?";
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Get all analysis results
  getAllAnalyses: () => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM analysis_results ORDER BY created_at DESC";
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Delete analysis by ID
  deleteAnalysis: (id) => {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM analysis_results WHERE id = ?";
      db.run(sql, [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  },
};

// Close database connection
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        logger.error("Error closing database:", err);
      } else {
        logger.info("Database connection closed");
      }
    });
  }
}

// Handle process termination
process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);

module.exports = {
  initializeDatabase,
  dbOperations,
  closeDatabase,
};
