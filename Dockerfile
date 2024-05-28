# Use an official Node.js runtime as a parent image
FROM node:16-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml files
COPY package.json pnpm-lock.yaml ./

# Install project dependencies using pnpm
# Only install production dependencies and ignore devDependencies
RUN pnpm install --prod

# Copy the rest of your application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Use an entrypoint script to easily handle environment variables
COPY entrypoint.sh /usr/src/app
RUN chmod +x /usr/src/app/entrypoint.sh
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Set a non-root user and switch to it
RUN adduser -D myuser
USER myuser

# Command to run your app
CMD ["pnpm", "start"]
