import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return openaiInstance;
}

export interface CompletionOptions {
  model?: "gpt-4o-mini" | "gpt-4" | "gpt-4o";
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function generateCompletion(
  prompt: string,
  options: CompletionOptions = {}
): Promise<string> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 600,
    systemPrompt,
  } = options;

  const openai = getOpenAI();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  
  messages.push({ role: "user", content: prompt });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function generateJSON<T = any>(
  prompt: string,
  options: CompletionOptions = {}
): Promise<T> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 600,
    systemPrompt,
  } = options;

  const openai = getOpenAI();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  
  messages.push({ role: "user", content: prompt });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as T;
}

export function handleOpenAIError(error: any, res: any) {
  console.error("OpenAI Error:", error);

  if (error.status === 429 || error.code === "insufficient_quota") {
    return res.status(429).json({
      error: "Limite de uso da API OpenAI excedido. Tente novamente mais tarde.",
    });
  }

  if (error.status === 401 || error.code === "invalid_api_key") {
    return res.status(401).json({
      error: "Chave da API OpenAI inválida. Verifique a configuração.",
    });
  }

  if (error.message === "OpenAI API key not configured") {
    return res.status(400).json({
      error: "Chave da API OpenAI não configurada.",
    });
  }

  return res.status(500).json({
    error: "Erro ao processar solicitação com IA. Tente novamente.",
  });
}
