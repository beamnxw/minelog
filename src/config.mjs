/** MineLog campaign - the eight stages the live viewer renders. */
export const PLAN = [
  "Wood & stone tools",
  "Food, bed & first iron",
  "Base & deep mining",
  "Diamonds & Nether portal",
  "Nether Fortress",
  "Blaze rods & Ender pearls",
  "Find the Stronghold",
  "Defeat the Ender Dragon",
];

export const MODELS = {
  planner: process.env.PLANNER_MODEL || "gpt-6-astra",
  plannerOpenRouter: "openai/gpt-6-astra",
  jev: process.env.JEV_MODEL || "jev-latest",
};

export const ENDPOINTS = {
  openaiChat: `${process.env.PLANNER_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
  openRouterChat: "https://openrouter.ai/api/v1/chat/completions",
  typesafe: "https://api.typesafe.ai/v1/systemone",
};

export const TICK = {
  intervalMs: Number(process.env.TICK_MS || 250),
  plannerIntervalMs: Number(process.env.PLANNER_INTERVAL_MS || 12_000),
  jevTimeoutMs: Number(process.env.JEV_TIMEOUT_MS || 1_500),
  plannerTimeoutMs: Number(process.env.PLANNER_TIMEOUT_MS || 45_000),
};

export const POLICY = {
  /** Below this, Jev's Choice is discarded and the body waits. */
  minConfidence: Number(process.env.JEV_MIN_CONFIDENCE || 0.45),
  healthFlee: 4,
  hungerEat: 6,
  creeperFleeBlocks: 5,
};

export function env() {
  return {
    typesafeKey: process.env.TYPESAFE_API_KEY || "",
    openaiKey: process.env.OPENAI_API_KEY || "",
    openRouterKey: process.env.OPENROUTER_API_KEY || "",
    mc: {
      host: process.env.MC_HOST || "127.0.0.1",
      port: Number(process.env.MC_PORT || 25565),
      username: process.env.MC_USERNAME || "minelog",
      version: process.env.MC_VERSION || "1.20.4",
      auth: process.env.MC_AUTH || "offline",
    },
    runId: process.env.RUN_ID || "local-01",
    runDir: process.env.RUN_DIR || "./runs",
  };
}
