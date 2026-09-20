# Models

## Jev — System One

Official API: `POST https://api.typesafe.ai/v1/systemone`

Auth: `Authorization: Bearer $TYPESAFE_API_KEY`

Docs: [docs.typesafe.ai/introduction](https://docs.typesafe.ai/introduction)

MineLog asks three questions in **one** call, evaluated in parallel, against the same snapshot:

```json
{
  "model": "jev-latest",
  "state": { "body": {}, "inventory": {}, "hostiles": [], "plan": {} },
  "questions": {
    "action": { "type": "choice", "instructions": "...", "criteria": { "punch_tree": "..." } },
    "safe": { "type": "noul", "instructions": "..." },
    "urgency": { "type": "score", "instructions": "...", "criteria": ["Can wait.", "Should act.", "Must act now."] }
  }
}
```

Jev returns typed values, a probability distribution, and confidence. There is no prose to parse. Code branches on `choice`, `noul`, `score`, `confidence`.

Default model id: `jev-latest` (pinned responses currently report `jev-1.13.x`).

## Astra — GPT-6 Astra

Planner only. Chat Completions, JSON object mode.

- OpenAI: `POST https://api.openai.com/v1/chat/completions` model `gpt-6-astra`
- OpenRouter relay (optional): `POST https://openrouter.ai/api/v1/chat/completions` model `openai/gpt-6-astra`

Auth: `OPENAI_API_KEY` or `OPENROUTER_API_KEY`.

Astra sees the compact snapshot, the current plan, and the last few failed actions. It returns the plan schema in `src/planner/schema.mjs`. Invalid JSON is dropped; the previous plan stays in force.

Model card: [developers.openai.com/api/docs/models/gpt-6-astra](https://developers.openai.com/api/docs/models/gpt-6-astra)

## Keys

Never commit keys. Never print them into `runtime.log`. The process reads them from the environment and keeps them in memory.
