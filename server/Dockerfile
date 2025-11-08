FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY ws-server.js ./
RUN npm install --only=production
EXPOSE 3001
CMD ["node","ws-server.js"]
