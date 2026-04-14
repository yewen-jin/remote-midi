FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source and browser client
COPY server/ ./server/
COPY client/browser/ ./client/browser/

# Run as non-root user for security
USER node

EXPOSE 3500

CMD ["node", "server/index.js"]
