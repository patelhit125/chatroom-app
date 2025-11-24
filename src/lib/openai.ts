import OpenAI from "openai";

// Lazy initialization to avoid errors during module loading
let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
    });
  }
  return openai;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Generate AI response for dummy users
 */
export async function generateAIResponse(
  personality: string,
  messageHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a friendly chat user with the following personality: ${personality}. Keep responses natural, conversational, and concise (1-3 sentences). Be engaging and friendly.`,
      },
      ...messageHistory.slice(-10), // Keep last 10 messages for context
      {
        role: "user",
        content: userMessage,
      },
    ];

    const client = getOpenAI();
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: messages,
      max_output_tokens: 150,
      temperature: 0.9,
    });

    const output = response.output?.[0];
    if (output?.type === "message") {
      const firstContent = output.content?.[0];
      if (
        firstContent &&
        "text" in firstContent &&
        typeof firstContent.text === "string"
      ) {
        return firstContent.text || "Hey there! 👋";
      }
    }

    return "Hey there! 👋";
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback responses if OpenAI fails
    const fallbacks = [
      "That's interesting! Tell me more.",
      "I see what you mean!",
      "Haha, that's funny! 😄",
      "Really? That sounds cool!",
      "Nice! What else is new?",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Generate personality for dummy AI users
 */
export function generatePersonality(): string {
  const personalities = [
    "Enthusiastic tech enthusiast who loves discussing gadgets and programming",
    "Friendly bookworm who enjoys literature and creative writing",
    "Cheerful fitness enthusiast who loves sports and healthy living",
    "Curious traveler who enjoys sharing stories about different places",
    "Witty movie buff who can discuss films for hours",
    "Creative artist who loves talking about art and design",
    "Passionate foodie who enjoys discussing recipes and cuisines",
    "Philosophical thinker who enjoys deep conversations",
    "Music lover who can talk about various genres and artists",
    "Gaming enthusiast who enjoys discussing video games and strategies",
  ];
  return personalities[Math.floor(Math.random() * personalities.length)];
}
