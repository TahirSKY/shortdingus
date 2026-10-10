// Models the user can pick. "openrouter/..." ones bill to the user's OpenRouter key; prices are $ per 1M tokens in/out.
export const MODELS: [string, string][] = [
  ["openai/gpt-6-astra", "GPT-6 Astra (best)"],
  ["openai/gpt-6-sol", "GPT-6 Sol"],
  ["openai/gpt-6-luna", "GPT-6 Luna (cheap)"],
  ["openai/gpt-5.6-terra", "GPT-5.6 Terra"],
  ["openai/gpt-5.6-luna", "GPT-5.6 Luna (cheap)"],
  ["google/gemini-3.1-pro-preview", "Gemini 3.1 Pro"],
  ["google/gemini-3.8-flash", "Gemini 3.8 Flash (cheap)"],
  ["openrouter/anthropic/claude-opus-5.5", "OpenRouter · Claude Opus 5.5 ($4/$20)"],
  ["openrouter/anthropic/claude-fable-5.1", "OpenRouter · Claude Fable 5.1 ($10/$50)"],
  ["openrouter/moonshotai/kimi-k3", "OpenRouter · Kimi K3 ($0.50/$13.50)"],
  ["openrouter/z-ai/glm-5.3", "OpenRouter · GLM 5.3 ($0.04/$4.80)"],
  ["openrouter/deepseek/deepseek-v4-pro-0813", "OpenRouter · DeepSeek V4 Pro ($0.66/$1.98)"],
  ["openrouter/qwen/qwen3.8-max-0902", "OpenRouter · Qwen 3.8 Max ($2/$6)"],
  ["openrouter/minimax/minimax-m3", "OpenRouter · MiniMax M3 ($0.30/$1.20)"],
];
