FROM node:18-slim
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install
COPY backend ./backend
WORKDIR /app/backend
ENV NODE_ENV=production
CMD ["npm", "start"]
