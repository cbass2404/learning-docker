FROM node:15

ARG PORT=8000
ENV PORT=$PORT

WORKDIR app

# /app/src/index.js
COPY src src
# /app/package.json
COPY package.json .

RUN npm install

EXPOSE $PORT

CMD npm start