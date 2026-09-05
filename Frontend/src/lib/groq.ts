export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_API_KEY = import.meta.env["VITE_GROQ_API_KEY"] as string | undefined;

export type TriageChatMessage = { role: "user" | "assistant"; content: string };