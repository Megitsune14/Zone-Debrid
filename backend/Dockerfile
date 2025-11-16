FROM node:alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:alpine

WORKDIR /app
COPY --from=build /app/dist .
COPY --from=build /app/package.json .
RUN npm i --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]