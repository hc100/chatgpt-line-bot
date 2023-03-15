FROM node:latest

WORKDIR /usr/app

COPY ./ /usr/app

RUN npm install express body-parser @line/bot-sdk axios

EXPOSE 3000

CMD node line_gpt4_bot.js
