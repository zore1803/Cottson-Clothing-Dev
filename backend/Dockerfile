# Medusa backend image. Build context: ./backend
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json apps/backend/
RUN npm ci
COPY apps/backend apps/backend
# Compiles the API and the admin dashboard into apps/backend/.medusa/server
RUN npm run build --workspace @dtc/backend

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/backend/.medusa/server ./
RUN npm install --omit=dev
EXPOSE 9000
CMD ["npm", "run", "start"]
