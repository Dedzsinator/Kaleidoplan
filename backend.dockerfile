# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copy server source
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY uploads/ ./uploads/

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --only=production

# Copy server files from build stage
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts

# Create uploads directory and set permissions
RUN mkdir -p ./uploads/events
RUN chown -R node:node ./uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

EXPOSE 3001

# Start the server
CMD ["node", "server/index.js"]
