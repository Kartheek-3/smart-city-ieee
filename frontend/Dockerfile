# Stage 1: Build the React Application
FROM node:20-alpine as build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the app using 'serve' (Foolproof for Cloud Run)
FROM node:20-alpine
WORKDIR /app

# Install serve package globally
RUN npm install -g serve

# Copy the build output from the first stage
COPY --from=build /app/build ./build

# Cloud Run defaults to port 8080
EXPOSE 8080

# Start the server and support React Router client-side routing (-s)
CMD ["serve", "-s", "build", "-l", "8080"]
