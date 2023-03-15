const express = require("express");
const bodyParser = require("body-parser");
const line = require("@line/bot-sdk");
const axios = require("axios");
require("dotenv").config();


const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/callback", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userText = event.message.text;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/engines/davinci-codex/completions",
      {
        prompt: userText,
        max_tokens: 50,
        n: 1,
        stop: null,
        temperature: 0.5,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const replyText = response.data.choices[0].text.trim();
    return client.replyMessage(event.replyToken, { type: "text", text: replyText });
  } catch (error) {
    console.error("Error while generating response:", error);
    return Promise.resolve(null);
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
