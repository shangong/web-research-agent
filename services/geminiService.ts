import { GoogleGenAI, Type } from "@google/genai";
import { SearchQuery, ReviewResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for prompts
const MODEL_NAME = 'gemini-3-flash-preview';

export const brainstormQueries = async (topic: string): Promise<SearchQuery[]> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `You are a world-class researcher. 
    Topic: "${topic}". 
    Brainstorm 10 specific, high-value web search queries that would yield comprehensive information on this topic. 
    Provide a brief rationale for each query explaining what specific angle it covers.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            rationale: { type: Type.STRING },
          },
          required: ["query", "rationale"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text);
};

export const reflectAndRefineQueries = async (queries: SearchQuery[]): Promise<SearchQuery[]> => {
  const queriesStr = JSON.stringify(queries);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Review the following search queries:
    ${queriesStr}
    
    Select the top 5 most effective queries that cover the breadth and depth of the topic efficiently. 
    Refine the query strings if necessary to be more search-engine friendly.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            rationale: { type: Type.STRING },
          },
          required: ["query", "rationale"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text);
};

export const searchAndCompile = async (topic: string, queries: SearchQuery[], previousFeedback?: string, previousReport?: string): Promise<{ markdown: string, sources: any[] }> => {
  const queryList = queries.map(q => q.query).join(', ');
  
  let prompt = `Write a comprehensive, professional research report on: "${topic}".
  
  Use the following search angles to guide your research, but feel free to follow leads:
  ${queryList}

  Structure the report with clear headings, bullet points, and a summary.
  The report should be detailed and academic in tone.
  
  IMPORTANT: You must use the 'googleSearch' tool to find real-time information. 
  Cite your sources inline or at the end.`;

  if (previousFeedback && previousReport) {
    prompt += `\n\n---
    PREVIOUS VERSION:
    ${previousReport}
    
    FEEDBACK TO ADDRESS (CRITICAL):
    ${previousFeedback}
    
    Please re-write the report to address the feedback specifically while maintaining the high quality parts of the original.`;
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Extract sources from grounding metadata
  const sources = groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri && web.title);

  // Remove duplicates
  const uniqueSources = Array.from(new Map(sources.map((s:any) => [s.uri, s])).values());

  if (!text) throw new Error("No response from Gemini");
  return { markdown: text, sources: uniqueSources };
};

export const reviewReport = async (topic: string, reportMarkdown: string): Promise<ReviewResult> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `You are a strict academic editor. Review the following research report on "${topic}".
    
    Report:
    ${reportMarkdown}
    
    Evaluate it on a scale of 1 to 5 based on:
    1. Relevance to topic
    2. Depth of information
    3. Clarity and structure
    4. Quality of content
    
    A score of 5 is perfect. A score of 4 is acceptable/good. Below 4 requires rewrite.
    Provide constructive feedback for improvement.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          feedback: { type: Type.STRING },
          approved: { type: Type.BOOLEAN, description: "True if score >= 4" },
        },
        required: ["score", "feedback", "approved"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text);
};

export const askFollowUp = async (topic: string, currentReport: string, question: string, signal?: AbortSignal): Promise<{ answer: string, sources: any[] }> => {
  if (signal?.aborted) throw new Error('Aborted');
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `CONTEXT:
    The user is reading a research report on "${topic}".
    
    CURRENT REPORT CONTENT (Truncated):
    ${currentReport.substring(0, 20000)}

    USER QUESTION:
    "${question}"

    TASK:
    Answer the user's follow-up question comprehensively. 
    You MUST use the 'googleSearch' tool to find up-to-date information if the answer is not in the context or requires external verification.
    
    Format your answer in Markdown. Do not repeat the whole report. Just provide the answer.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (signal?.aborted) throw new Error('Aborted');

  const text = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Extract sources from grounding metadata
  const sources = groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri && web.title);

  const uniqueSources = Array.from(new Map(sources.map((s:any) => [s.uri, s])).values());

  if (!text) throw new Error("No response from Gemini");
  return { answer: text, sources: uniqueSources };
};