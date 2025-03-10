# Runtime stage
FROM node:22-alpine AS app

WORKDIR /app

# Copy built files from the builder stage
COPY ./package*.json /app
COPY ./dist /app/dist
RUN npm install --configuration=production

# Expose port 80
EXPOSE 4000

# Command to run nginx in the foreground
CMD ["npm", "run", "start:prod"]