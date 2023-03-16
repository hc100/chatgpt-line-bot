const axios = require("axios");
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function createCompletion() {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {"role":"system", "content":"丁寧語はやめて"},
        {"role":"system", "content":"関西弁で回答して"},
        {"role":"user", "content":"iPhoneでeSIMをどのように活用したらいいですか？"}
      ],
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

console.log(response.data.choices[0].message.content)
}

createCompletion().catch((error) => console.error(error));
