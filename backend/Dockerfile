FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"] 