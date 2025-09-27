FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY src ./src
COPY openapi.yaml ./
ENV NODE_ENV=production
EXPOSE 8084
CMD ["npm","start"]
