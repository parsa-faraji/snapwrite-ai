FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js .
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
