FROM node:22-alpine AS base

RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

RUN npx nuxt build

FROM node:22-alpine AS runner

RUN apk add --no-cache sqlite-libs

WORKDIR /app

COPY --from=base /app/.output ./.output
COPY --from=base /app/data ./data
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN mkdir -p data uploads

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
