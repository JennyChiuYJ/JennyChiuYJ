import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  appendExchange,
  getRecentHistory,
  getTextMessageEvent,
  verifyLineSignature,
} from "../src/bot-utils.js";

test("accepts a valid LINE webhook signature and rejects an invalid one", () => {
  const body = Buffer.from('{"destination":"bot","events":[]}');
  const secret = "test-channel-secret";
  const signature = createHmac("sha256", secret).update(body).digest("base64");

  assert.equal(verifyLineSignature(body, signature, secret), true);
  assert.equal(verifyLineSignature(body, "not-a-valid-signature", secret), false);
  assert.equal(verifyLineSignature(body, signature, "wrong-secret"), false);
});

test("extracts only a valid text message event", () => {
  const event = {
    type: "message",
    replyToken: "reply-token",
    source: { userId: "user-id" },
    message: { type: "text", text: "  嗨  " },
  };

  assert.deepEqual(getTextMessageEvent(event), {
    replyToken: "reply-token",
    userId: "user-id",
    text: "嗨",
  });
  assert.equal(getTextMessageEvent({ ...event, message: { type: "image" } }), null);
  assert.equal(getTextMessageEvent({ ...event, message: { type: "text", text: "  " } }), null);
});

test("keeps only the configured number of recent conversation messages", () => {
  const history = [
    { role: "user", content: "old" },
    { role: "assistant", content: "old reply" },
  ];
  const updated = appendExchange(history, "new", "new reply", 2);

  assert.deepEqual(updated, [
    { role: "user", content: "new" },
    { role: "assistant", content: "new reply" },
  ]);
  assert.deepEqual(getRecentHistory(updated, 1), [{ role: "assistant", content: "new reply" }]);
});
