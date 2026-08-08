FROM node:20-alpine

WORKDIR /app

# ffmpeg for video processing; wget for container health checks
RUN apk add --no-cache ffmpeg wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend code
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/api/health || exit 1

# Start application
CMD ["node", "src/server.js"]
