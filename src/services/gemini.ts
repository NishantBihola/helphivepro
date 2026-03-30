import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function enhanceDescription(title: string, category: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Enhance this item description for a neighborhood coordination app called HelpHive. 
      Item: ${title}
      Category: ${category}
      Make it sound professional, hyper-local (Edmonton context), and emphasize community trust. 
      Keep it under 100 words.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini enhancement failed:", error);
    return null;
  }
}

export async function askHive(prompt: string, userName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As the HelpHive AI Assistant for Edmonton, answer this query for ${userName}: ${prompt}. Keep it helpful, local, and encouraging.`,
    });
    return response.text;
  } catch (error) {
    console.error("Hive Assistant failed:", error);
    return "The neural link is a bit fuzzy. Check your connection.";
  }
}
