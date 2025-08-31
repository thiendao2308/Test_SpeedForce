# YouTube Analysis Service

**AI-Powered YouTube Video Analysis Platform**  
_Built for SpeedForce Technical Assessment_

[![Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen?style=for-the-badge)](http://localhost:3000)
[![API Status](https://img.shields.io/badge/API-Healthy-green?style=for-the-badge)](http://localhost:3000/health)

</div>

---

## **Features**

- **Video Processing**: Screenshot capture + audio extraction
- **AI Transcription**: ElevenLabs Scribe integration
- **AI Detection**: GPTZero content authenticity analysis
- **Demo Mode**: Fully functional without API keys
- **SQLite Database**: Result storage & retrieval
- **Docker Ready**: Easy deployment

---

## **Quick Start**

```bash
# Install & Setup
git clone <repo-url>
cd Test_SpeedForce
npm install
npm run setup-db
npm start

# Access: http://localhost:3000
```

---

## **Docker**

```bash
# One command deployment
docker-compose up --build
```

---

## **API Endpoints**

| Method | Endpoint          | Description    |
| ------ | ----------------- | -------------- |
| `GET`  | `/`               | Web Interface  |
| `POST` | `/api/analyze`    | Start Analysis |
| `GET`  | `/api/result/:id` | Get Results    |
| `GET`  | `/health`         | Health Check   |

---

## **Demo Mode**

**No API keys required!** The service includes a fully functional demo that simulates:

- Screenshot generation
- Audio processing
- AI transcription
- Content detection
- Complete UI experience

Perfect for demonstrations and testing.

---

## **Architecture**

```
Web Interface → Express Server → Analysis Pipeline → SQLite Database
                    ↓
              YouTube Service (Puppeteer + ytdl-core)
                    ↓
              Audio Service (FFmpeg)
                    ↓
              ElevenLabs Scribe + GPTZero
```

---

## **Sample Output**

```json
{
  "id": "uuid-here",
  "status": "completed",
  "screenshot_path": "screenshots/demo_uuid.png",
  "transcription": {
    "segments": [
      {
        "text": "Demo transcription text...",
        "ai_detection": { "ai_probability": 0.15 }
      }
    ]
  },
  "ai_probabilities": { "overall_ai_probability": 0.12 }
}
```

---

## **Deployment**

### **Local**

```bash
npm start
```

### **GCE VM**

```bash
# Build & run
docker build -t youtube-analysis-service .
docker run -d -p 8080:8080 youtube-analysis-service

# Firewall
gcloud compute firewall-rules create allow-http --allow tcp:8080
```

---

## **License**

MIT License - Built with for SpeedForce Technical Assessment
