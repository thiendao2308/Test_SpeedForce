# Multi-stage Dockerfile for YouTube Analysis Service
FROM node:18-alpine AS base

# Install system dependencies including FFmpeg
RUN apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --only=production --no-audit --no-fund --prefer-offline

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p \
    /app/logs \
    /app/data \
    /app/uploads \
    /app/screenshots \
    /app/audio \
    /app/audio/wav

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
