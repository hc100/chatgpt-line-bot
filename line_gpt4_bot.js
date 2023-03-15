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

const max_conversation_length = 4000; // 最大文字数を設定

function trimConversation(conversation) {
  let current_length = conversation.join('').length;

  while (current_length > max_conversation_length) {
    conversation.shift(); // 最初のメッセージを削除
    current_length = conversation.join('').length;
  }

  return conversation;
}

async function handleEvent(event) {
  try {
    if (event.type !== "message" || event.message.type !== "text") {
      return Promise.resolve(null);
    }

    const userId = event.source.userId;
    if (!userConversations[userId]) {
      userConversations[userId] = [];
    }

    const userText = event.message.text;
    const userMessage = `質問: ${userText}\n返事: `;

    userConversations[userId].push(userMessage);
    userConversations[userId] = trimConversation(userConversations[userId]); // 会話をトリミング

    // 会話を連結して、prompt に使用
    const conversationText = `私はOpenAIによって訓練された大規模な言語モデルであるChatGPTです。質問に答えたり、会話に参加することが私の目的です。` + userConversations[userId].join('\n');

    // GPT-4に質問を投げる処理...
    const response = await axios.post(
      "https://api.openai.com/v1/engines/davinci-codex/completions",
      {
        prompt: conversationText,
        max_tokens: 200,
        n: 1,
        stop: ["\n"],
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
    userConversations[userId].push(replyText);

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
