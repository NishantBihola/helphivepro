import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function evaluatePost(msg: string, type: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate this HelpHive community post for quality, clarity, and community impact. 
      Post: "${msg}"
      Type: ${type}
      Provide a score from 1 to 10 and a brief justification.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Quality score from 1 to 10" },
            justification: { type: Type.STRING, description: "Brief justification for the score" }
          },
          required: ["score", "justification"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Post evaluation failed:", error);
    return { score: 1, justification: "AI evaluation failed." };
  }
}

export async function getQueenInsights(activities: any[]) {
  try {
    const activitySummary = activities.map(a => `${a.type}: ${a.msg} (${a.location})`).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a high-level community strategist for HelpHive Edmonton, analyze these recent activities and provide 3 strategic insights for a Queen Plan holder to maximize community impact and growth.
      Activities:
      ${activitySummary}
      Provide the insights in JSON format with an array of objects, each having "title" and "description".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Queen insights failed:", error);
    return [];
  }
}

export async function findBestMatches(userNeeds: any[], allOffers: any[]) {
  try {
    const needsStr = userNeeds.map(n => n.msg).join(", ");
    const offersStr = allOffers.map(o => `${o.id}: ${o.msg}`).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Match these user needs with the best available community offers in Edmonton.
      User Needs: ${needsStr}
      Available Offers:
      ${offersStr}
      Return the top 3 matches in JSON format with an array of objects, each having "offerId", "reason", and "matchScore" (1-100).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              offerId: { type: Type.STRING },
              reason: { type: Type.STRING },
              matchScore: { type: Type.NUMBER }
            },
            required: ["offerId", "reason", "matchScore"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Match finding failed:", error);
    return [];
  }
}

export async function generateAvatarPrompt(description: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a detailed image generation prompt for a professional community avatar based on this description: "${description}". 
      The style should be "Cyber-Organic Edmonton", futuristic yet community-focused. 
      Return the prompt as a string.`,
    });
    return response.text;
  } catch (error) {
    console.error("Avatar prompt generation failed:", error);
    return null;
  }
}

export async function generateVoiceProfile(sampleText: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this text sample and describe the vocal characteristics (tone, pitch, cadence, emotional resonance) for a "Voice Clone" profile.
      Sample: "${sampleText}"
      Return a JSON object with "tone", "pitch", "cadence", and "description".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            pitch: { type: Type.STRING },
            cadence: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["tone", "pitch", "cadence", "description"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Voice profile generation failed:", error);
    return null;
  }
}
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
