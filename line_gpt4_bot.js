const express = require("express");
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
const userConversations = new Map();

app.post(
  "/callback",
  express.raw({ type: "application/json" }),
  line.middleware(config),
  async (req, res) => {
    try {
      const results = await Promise.all(req.body.events.map(handleEvent));
      res.json(results);
    } catch (error) {
      console.error("Error occurred while processing events:", error);

      // ダミーメッセージを送信
      if (req.body.events && req.body.events.length > 0) {
        const replyToken = req.body.events[0].replyToken;
        const dummyMessage = {
          type: "text",
          text: "申し訳ありません。現在、問題が発生しております。",
        };

        await client.replyMessage(replyToken, dummyMessage);
      }

      res.status(500).send("Internal Server Error");
    }
  }
);

async function handleEvent(event) {
  try {
    if (event.type !== "message" || event.message.type !== "text") {
      return Promise.resolve(null);
    }

    const userText = event.message.text;
    const messages = [
      {"role":"system", "content":"丁寧語はやめて"},
      {"role":"system", "content":"関西弁で回答して"},
      {"role":"user", "content":userText}
    ];

    // GPT-4に質問を投げる処理...
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 2000,
        n: 1,
        stop: "none",
        temperature: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    console.log(userText)
    const replyText = response.data.choices[0].message.content.trim();

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
