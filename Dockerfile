# Use the official Node.js image
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Set the environment variable for NestJS
ENV NODE_ENV=${NODE_ENV}

# Expose port 5000
EXPOSE 5000

# Start the application in production mode
CMD ["npm", "run", "start:dev"]
