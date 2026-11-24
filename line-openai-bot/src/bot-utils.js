import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !channelSecret) return false;

  const expected = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function getTextMessageEvent(event) {
  if (event?.type !== "message" || event.message?.type !== "text") return null;
  if (typeof event.replyToken !== "string" || typeof event.source?.userId !== "string") return null;
  const text = event.message.text?.trim();
  if (!text) return null;

  return { replyToken: event.replyToken, userId: event.source.userId, text };
}

export function getRecentHistory(history = [], maxMessages = 8) {
  return history.slice(-maxMessages);
}

export function appendExchange(history, userText, assistantText, maxMessages = 8) {
  return getRecentHistory([
    ...history,
    { role: "user", content: userText },
    { role: "assistant", content: assistantText },
  ], maxMessages);
}
