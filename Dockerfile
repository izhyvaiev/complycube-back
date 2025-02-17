# Use Node.js v22
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

# Setup database structure
#RUN npx sequelize-cli db:migrate

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]