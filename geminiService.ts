
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AITip } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const getFinancialTips = async (transactions: Transaction[]): Promise<AITip[]> => {
  if (transactions.length === 0) {
    return [{
      title: "Organization Setup",
      advice: "Begin logging member subscriptions and organization investments to unlock AI business audits.",
      priority: "Low"
    }];
  }

  const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const invest = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + t.amount, 0);

  const prompt = `
    Analyze this organization's finances (Currency: BDT):
    Total Member Collections: ${income}
    Total Operational Expenses: ${expense}
    Amount Invested/Withdrawn for Business: ${invest}
    Current Available Liquidity: ${income - expense - invest}
    
    Provide 3 strategic business tips. One about saving, one about reinvestment, and one about financial health.
    Format as JSON array of objects with title, advice, and priority (High, Medium, Low).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              advice: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["title", "advice", "priority"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [{
      title: "Financial Security",
      advice: "Ensure consistent ৳500 collections to maintain predictable growth and cash flow.",
      priority: "Medium"
    }];
  }
};
