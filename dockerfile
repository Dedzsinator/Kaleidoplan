# Use a Node base image that's compatible with Raspberry Pi (ARM architecture)
FROM node:18-bullseye-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci

# Build the application
FROM dependencies AS build
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/scripts /app/scripts
COPY --from=build /app/package.json /app/

# Set up MongoDB connection
ENV MONGODB_URI=mongodb://mongo:27017/kaleidoplan
ENV MONGODB_DB_NAME=kaleidoplan

# Expose the port the app will run on
EXPOSE 3000

# Healthcheck to verify app is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Initialize MongoDB and start the application
CMD ["npm", "run", "start:prod"]