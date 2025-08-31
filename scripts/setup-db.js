const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "../data/analysis.db");
const dataDir = path.dirname(dbPath);

console.log("🚀 Setting up YouTube Analysis Service Database...");
console.log(`📁 Data directory: ${dataDir}`);
console.log(`🗄️ Database path: ${dbPath}`);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("✅ Created data directory");
}

// Create database and tables
const db = new sqlite3.Database(dbPath);

const createTables = `
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
  );

  CREATE INDEX IF NOT EXISTS idx_status ON analysis_results(status);
  CREATE INDEX IF NOT EXISTS idx_created_at ON analysis_results(created_at);
`;

db.serialize(() => {
  console.log("🔧 Creating database tables...");

  db.exec(createTables, (err) => {
    if (err) {
      console.error("❌ Error creating tables:", err);
      process.exit(1);
    } else {
      console.log("✅ Database tables created successfully!");

      // Verify table creation
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_results'",
        (err, row) => {
          if (err) {
            console.error("❌ Error verifying table:", err);
          } else if (row) {
            console.log("✅ Table verification successful");

            // Show table schema
            db.all("PRAGMA table_info(analysis_results)", (err, columns) => {
              if (err) {
                console.error("❌ Error getting table info:", err);
              } else {
                console.log("\n📋 Table Schema:");
                columns.forEach((col) => {
                  console.log(
                    `  - ${col.name}: ${col.type} ${
                      col.notnull ? "NOT NULL" : ""
                    } ${col.pk ? "PRIMARY KEY" : ""}`
                  );
                });
              }

              console.log("\n🎉 Database setup completed successfully!");
              console.log(`📍 Database location: ${dbPath}`);
              db.close();
            });
          } else {
            console.error("❌ Table verification failed");
            process.exit(1);
          }
        }
      );
    }
  });
});
