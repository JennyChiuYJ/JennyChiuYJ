import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import {
  appendExchange,
  getRecentHistory,
  getTextMessageEvent,
  verifyLineSignature,
} from "./bot-utils.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-6-luna";
const instructions = process.env.BOT_INSTRUCTIONS
  || "你是一位親切、清楚的繁體中文 LINE 助理。回答簡潔；不知道時直接說明，不要編造資訊。";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Prototype memory only: recent turns are kept per LINE user while this process runs.
// Restarting or redeploying the app clears this history.
const histories = new Map();
const maxHistoryUsers = 500;
const maxHistoryMessages = 8;
const maxReplyCharacters = 1800;

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "line-openai-chatbot" });
});

// Keep the original request bytes so the LINE signature can be checked correctly.
app.post("/callback", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const signature = req.get("x-line-signature");

  if (!channelSecret || !accessToken) {
    console.error("LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN must be configured.");
    return res.sendStatus(500);
  }
  if (!verifyLineSignature(req.body, signature, channelSecret)) {
    return res.sendStatus(401);
  }

  let webhook;
  try {
    webhook = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  // Return promptly to LINE. Process each event and send the reply in the background.
  res.sendStatus(200);
  for (const event of webhook.events || []) {
    void processEvent(event, accessToken).catch((error) => {
      console.error("Could not process LINE event:", error?.message || error);
    });
  }
});

async function processEvent(event, accessToken) {
  const message = getTextMessageEvent(event);
  if (!message) return;

  if (!openai) {
    await replyToLine(accessToken, message.replyToken, "目前尚未設定 OpenAI API Key，請稍後再試。" );
    return;
  }

  const history = getRecentHistory(histories.get(message.userId), maxHistoryMessages);
  let answer;
  try {
    const response = await openai.responses.create({
      model,
      instructions,
      input: [...history, { role: "user", content: message.text }],
      max_output_tokens: 300,
      store: false,
    });
    answer = response.output_text?.trim();
    if (!answer) answer = "我目前無法整理出回答，請換個方式問我。";
  } catch (error) {
    console.error("OpenAI API request failed:", error?.message || error);
    answer = "我現在暫時無法回答，請稍後再試。";
  }

  answer = answer.slice(0, maxReplyCharacters);
  histories.set(message.userId, appendExchange(history, message.text, answer, maxHistoryMessages));

  // Keep the in-memory map bounded for a small prototype.
  while (histories.size > maxHistoryUsers) {
    histories.delete(histories.keys().next().value);
  }

  await replyToLine(accessToken, message.replyToken, answer);
}

async function replyToLine(accessToken, replyToken, text) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`LINE reply failed (${response.status}): ${details}`);
  }
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`LINE bot listening on port ${port}; model=${model}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
