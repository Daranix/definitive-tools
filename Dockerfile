# Runtime stage
FROM node:22-alpine AS app

WORKDIR /app

# Copy package files and install production dependencies
COPY ./package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy built files
COPY ./dist ./dist

# Expose port and run the app
EXPOSE 4000
CMD ["npm", "run", "start:prod"]