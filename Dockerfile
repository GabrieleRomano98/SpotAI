# Multi-stage build for optimal image size (free tier friendly)

# Stage 1: Build the client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the server and final image
FROM node:18-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./

# Copy built client files to be served by Express
COPY --from=client-builder /app/client/dist ./public

# Expose port (Cloud Run requires PORT env variable)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
