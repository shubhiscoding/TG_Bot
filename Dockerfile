# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a .env file from the example if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env || echo "No .env.example found"; fi

# Command to run the application
CMD [ "node", "server.js" ]