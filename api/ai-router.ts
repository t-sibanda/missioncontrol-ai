import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { env } from "./lib/env";

// Groq model mapping (free tier models)
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Generic OpenAI-compatible chat completion call
async function callChatAPI(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): Promise<{ success: boolean; content: string | null; error: string | null }> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, content: null, error: `API error ${response.status}: ${errorText.slice(0, 200)}` };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || "";
  return { success: true, content, error: null };
}

/**
 * AI Chat completion with automatic fallback:
 * 1. Try Groq (free, globally available, fast)
 * 2. If Groq fails, try Kimi Open API
 * 3. Return clear error if both fail
 */
async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  model?: string
) {
  // Try Groq first (if API key is configured)
  if (env.groqApiKey) {
    try {
      const result = await callChatAPI(
        GROQ_API_URL,
        env.groqApiKey,
        model || GROQ_MODEL,
        messages
      );
      if (result.success) return { success: true as const, error: null, content: result.content };
      // Groq failed — log and fall through to Kimi
      console.log(`[AI] Groq failed: ${result.error}, trying Kimi...`);
    } catch (err) {
      console.log(`[AI] Groq error: ${err instanceof Error ? err.message : err}, trying Kimi...`);
    }
  }

  // Try Kimi (if configured)
  if (env.appSecret && env.kimiOpenUrl) {
    try {
      const result = await callChatAPI(
        `${env.kimiOpenUrl}/v1/chat/completions`,
        env.appSecret,
        "moonshot-v1-8k",
        messages
      );
      if (result.success) return { success: true as const, error: null, content: result.content };
      console.log(`[AI] Kimi failed: ${result.error}`);
      return { success: false as const, error: result.error, content: null };
    } catch (err) {
      return {
        success: false as const,
        error: `Both AI providers failed. Kimi: ${err instanceof Error ? err.message : "unknown"}`,
        content: null,
      };
    }
  }

  // No AI provider configured
  if (!env.groqApiKey && !env.appSecret) {
    return {
      success: false as const,
      error: "No AI provider configured. Add GROQ_API_KEY (free at console.groq.com) or APP_SECRET (Kimi) to your environment variables.",
      content: null,
    };
  }

  return {
    success: false as const,
    error: "AI service unavailable. Please try again later.",
    content: null,
  };
}

// Parse job description to extract key requirements
async function parseJobDescription(description: string) {
  const prompt = `Analyze this job description and extract the following in JSON format:
{
  "hardSkills": ["list of technical skills required"],
  "softSkills": ["list of soft skills required"],
  "tools": ["specific tools, software, platforms mentioned"],
  "certifications": ["required certifications"],
  "yearsExperience": "minimum years if specified",
  "educationLevel": "education requirements",
  "keyResponsibilities": ["main responsibilities"],
  "keywords": ["important keywords for ATS optimization"]
}

Job Description:
${description}

Return ONLY valid JSON, no markdown formatting.`;

  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are an expert job description parser. Extract structured data from job descriptions for ATS optimization.",
    },
    { role: "user", content: prompt },
  ]);

  if (!result.success || !result.content) {
    return { success: false as const, parsed: null, error: result.error };
  }

  try {
    // Clean up JSON response
    const cleaned = result.content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return { success: true as const, parsed, error: null };
  } catch {
    return { success: false as const, parsed: null, error: "Failed to parse AI response" };
  }
}

// Analyze voice profile from writing samples
async function analyzeVoiceProfile(samples: string[]) {
  const prompt = `Analyze these writing samples and create a detailed voice profile. Describe:
1. Sentence structure preferences (short/concise vs. elaborate)
2. Action verb choices (what verbs does this person prefer?)
3. Metric presentation style
4. Tone (formal, conversational, assertive, collaborative)
5. Technical depth level
6. Common phrases or patterns
7. Voice characteristics summary

Writing Samples:
${samples.join("\n\n---\n\n")}

Provide a comprehensive voice profile that can be used as a system prompt for an AI to write in this person's exact style.`;

  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are an expert writing style analyst. Create detailed voice profiles from writing samples.",
    },
    { role: "user", content: prompt },
  ]);

  return result;
}

// Generate tailored resume bullets
async function tailorResume(
  baseResume: string,
  voiceProfile: string,
  jobDescription: string,
  parsedRequirements: Record<string, unknown>
) {
  const prompt = `Using the person's voice profile and base resume, rewrite their experience bullet points to match this job description.

VOICE PROFILE (write in this exact style):
${voiceProfile}

BASE RESUME:
${baseResume}

JOB DESCRIPTION:
${jobDescription}

EXTRACTED REQUIREMENTS:
${JSON.stringify(parsedRequirements, null, 2)}

Instructions:
1. Maintain factual accuracy - do NOT invent skills or experiences
2. Use the exact voice/tone from the voice profile
3. Incorporate relevant keywords from the job description naturally
4. Quantify achievements where possible
5. Use strong action verbs that match the voice profile
6. Create 3 variations per role/experience section

Return a JSON object with:
{
  "tailoredBullets": {
    "sectionName": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "keywordGaps": ["missing keywords"],
  "atsScore": 85,
  "suggestions": ["improvement suggestions"]
}`;

  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are an expert resume writer who specializes in ATS optimization while maintaining the applicant's authentic voice.",
    },
    { role: "user", content: prompt },
  ]);

  if (!result.success || !result.content) {
    return result;
  }

  try {
    const cleaned = result.content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return { success: true as const, content: JSON.stringify(parsed), error: null };
  } catch {
    return { success: true as const, content: result.content, error: null };
  }
}

// Generate cover letter
async function generateCoverLetter(
  baseResume: string,
  voiceProfile: string,
  jobDescription: string,
  companyName: string,
  jobTitle: string
) {
  const prompt = `Write a compelling, personalized cover letter for this job application.

APPLICANT'S VOICE (match this tone exactly):
${voiceProfile}

APPLICANT'S BACKGROUND:
${baseResume}

COMPANY: ${companyName}
ROLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

Write a cover letter that:
1. Opens with a strong hook showing genuine interest in the company
2. Highlights 2-3 most relevant achievements that match the role
3. Shows knowledge of the company's mission/products
4. Uses the applicant's authentic voice
5. Closes with a clear call to action
6. Is 250-350 words
7. Does NOT use generic templates - make it specific and compelling`;

  return chatCompletion([
    {
      role: "system",
      content:
        "You are an expert cover letter writer who creates personalized, compelling cover letters that match the applicant's authentic voice.",
    },
    { role: "user", content: prompt },
  ]);
}

// Calculate ATS score
async function calculateATSScore(
  resumeText: string,
  jobDescription: string
) {
  const prompt = `Calculate an ATS (Applicant Tracking System) compatibility score for this resume against the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze and return a JSON object:
{
  "overallScore": 78,
  "keywordMatch": {
    "score": 75,
    "matched": ["matched keywords"],
    "missing": ["missing important keywords"]
  },
  "formatting": {
    "score": 90,
    "issues": ["any formatting concerns"]
  },
  "semanticMatch": {
    "score": 80,
    "analysis": "brief analysis"
  },
  "improvements": ["specific actionable improvements"]
}`;

  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are an ATS optimization expert. Analyze resumes against job descriptions and provide detailed scoring.",
    },
    { role: "user", content: prompt },
  ]);

  if (!result.success || !result.content) {
    return result;
  }

  try {
    const cleaned = result.content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return { success: true as const, content: JSON.stringify(parsed), error: null };
  } catch {
    return { success: true as const, content: result.content, error: null };
  }
}

export const aiRouter = createRouter({
  // Parse job description
  parseJob: authedQuery
    .input(z.object({ description: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return parseJobDescription(input.description);
    }),

  // Analyze voice profile from writing samples
  analyzeVoice: authedQuery
    .input(z.object({ samples: z.array(z.string().min(1)).min(1).max(10) }))
    .mutation(async ({ input }) => {
      return analyzeVoiceProfile(input.samples);
    }),

  // Tailor resume for a specific job
  tailorResume: authedQuery
    .input(
      z.object({
        baseResume: z.string().min(1),
        voiceProfile: z.string().min(1),
        jobDescription: z.string().min(1),
        parsedRequirements: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return tailorResume(
        input.baseResume,
        input.voiceProfile,
        input.jobDescription,
        input.parsedRequirements ?? {}
      );
    }),

  // Generate cover letter
  generateCoverLetter: authedQuery
    .input(
      z.object({
        baseResume: z.string().min(1),
        voiceProfile: z.string().min(1),
        jobDescription: z.string().min(1),
        companyName: z.string().min(1),
        jobTitle: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return generateCoverLetter(
        input.baseResume,
        input.voiceProfile,
        input.jobDescription,
        input.companyName,
        input.jobTitle
      );
    }),

  // Calculate ATS score
  atsScore: authedQuery
    .input(
      z.object({
        resumeText: z.string().min(1),
        jobDescription: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return calculateATSScore(input.resumeText, input.jobDescription);
    }),

  // General chat for AI assistant
  chat: authedQuery
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string().min(1),
          })
        ),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return chatCompletion(input.messages, input.model);
    }),

  // Streaming chat (for frontend streaming)
  streamChat: authedQuery
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string().min(1),
          })
        ),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return chatCompletion(input.messages, input.model ?? "moonshot-v1-8k");
    }),
});
