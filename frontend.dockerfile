# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Define ARGs for build-time environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_SPOTIFY_CLIENT_ID
ARG REACT_APP_SPOTIFY_CLIENT_SECRET
# Add other REACT_APP_ variables if needed

# Set ENV variables from ARGs for the build process
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SPOTIFY_CLIENT_ID=$REACT_APP_SPOTIFY_CLIENT_ID
ENV REACT_APP_SPOTIFY_CLIENT_SECRET=$REACT_APP_SPOTIFY_CLIENT_SECRET

# Copy package files and install dependencies
COPY package.json package-lock.json ./
# If you are using react-app-rewired, you need the config-overrides.js
# Ensure this file name matches exactly (e.g., config-overrides.js or config-overrides.cjs)
COPY config-overrides.js .
RUN npm ci

# Copy source files and build
COPY public/ ./public/
COPY src/ ./src/
COPY tsconfig.json .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production
# Output from react-scripts build is in 'build' directory
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80
