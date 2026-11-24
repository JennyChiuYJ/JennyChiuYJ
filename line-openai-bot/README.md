# LINE + OpenAI 聊天機器人

這個小型 Node.js 專案會接收 LINE 文字訊息、呼叫 OpenAI Responses API，再透過 LINE Messaging API 回覆。

## 先備條件

- Node.js 20 以上
- LINE Messaging API channel 的 Channel secret 與 Channel access token
- OpenAI API key 與可用的 API 付款/額度設定

ChatGPT 訂閱和 OpenAI API 用量分開計費。程式預設使用 `gpt-6-luna`，並限制每次最多產生 300 個輸出 tokens；實際費用仍依輸入與輸出的 token 數量計算。

## 本機啟動

1. 在此資料夾開啟終端機並安裝相依套件：

   ```powershell
   npm install
   ```

2. 複製 `.env.example` 為 `.env`，填入三個金鑰：

   ```text
   OPENAI_API_KEY=你的 OpenAI API key
   LINE_CHANNEL_SECRET=你的 LINE Channel secret
   LINE_CHANNEL_ACCESS_TOKEN=你的 LINE Channel access token
   ```

   不要把 `.env` 上傳到 GitHub，也不要把 key 貼在聊天訊息中。

3. 啟動：

   ```powershell
   npm start
   ```

4. 瀏覽 `http://localhost:3000/`。若看到 `{"status":"ok"...}`，代表本機服務已啟動。

## LINE Webhook

部署服務後，將 LINE Developers Console 的 Webhook URL 設為：

```text
https://你的公開主機網址/callback
```

接著啟用 Use webhook，並按 Verify。LINE 要求服務可以從公網以 HTTPS 連線。只有部署後的公開網址可供 LINE 使用；`localhost` 不能直接填入 LINE。

## 提示詞與模型

- 修改 `.env` 的 `BOT_INSTRUCTIONS` 可以調整機器人回答方式。
- 預設模型是 `gpt-6-luna`。可用 `OPENAI_MODEL` 調整。
- `max_output_tokens: 300` 用來限制單次回答長度，避免回答過長造成額外用量。
- 每位使用者只保留最近 4 組對話（8 則訊息），提供簡單的上下文記憶。這些紀錄只存在程式記憶體，重啟或重新部署後會清除。

## 測試

```powershell
npm test
```

測試涵蓋 LINE 簽章驗證、文字事件解析和對話紀錄裁切，不會呼叫 OpenAI，也不需要真實金鑰。
