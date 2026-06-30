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

// Company style types
type CompanyStyle = "formal_corporate" | "startup_energy" | "faang_precision" | "mission_driven" | "casual_collaborative";

const STYLE_GUIDES: Record<CompanyStyle, string> = {
  formal_corporate: "Use formal, polished language. Avoid contractions. Use industry jargon, emphasize process and protocol. Write in third-person where possible. Think Fortune 500 annual report tone.",
  startup_energy: "Be energetic, direct, and bold. Use shorter sentences. Show passion and impact. Highlight versatility and ownership. Think Y Combinator pitch deck energy.",
  faang_precision: "Be highly structured and data-driven. Lead with metrics. Use precise technical language. Emphasize scale, systems thinking, and measurable impact. Think Google/Meta engineering blog.",
  mission_driven: "Emphasize purpose, values alignment, and social impact. Show how work connects to a bigger mission. Use collaborative language. Think nonprofit or impact-driven tech.",
  casual_collaborative: "Be conversational and approachable. Use 'we' language. Show teamwork and culture fit. Keep things concise but warm. Think modern remote-first company.",
};

function getStyleInstruction(style?: CompanyStyle): string {
  if (!style || !STYLE_GUIDES[style]) return "";
  return `\n\nWRITING STYLE ADJUSTMENT:\n${STYLE_GUIDES[style]}\nAdjust the tone and language of the output to match this style while keeping all content factually accurate.\n`;
}

// Generate company intelligence dossier
async function generateCompanyIntel(companyName: string, industry?: string, jobDescription?: string) {
  const prompt = `Generate a comprehensive company intelligence dossier for "${companyName}"${industry ? ` (${industry} industry)` : ""}.

${jobDescription ? `Context - they have this job posting:\n${jobDescription.slice(0, 1000)}\n` : ""}

Return a JSON object with:
{
  "hiringStyle": "description of how they typically hire (speed, process formality, who's involved)",
  "interviewProcess": "typical interview stages and what to expect at each",
  "languageTone": "the tone they use in communications and job postings (formal, casual, technical, mission-driven)",
  "atsKeywords": ["top 10-15 keywords to include for their ATS"],
  "cultureSignals": ["5-8 cultural values or signals they look for"],
  "tipsForApplicants": ["4-6 specific tips for standing out"],
  "companyStyle": "one of: formal_corporate, startup_energy, faang_precision, mission_driven, casual_collaborative",
  "recentFocus": "what they seem to be focused on hiring for recently"
}

Return ONLY valid JSON, no markdown formatting.`;

  const result = await chatCompletion([
    { role: "system", content: "You are an expert recruiter and company researcher. Generate detailed, actionable intelligence about companies' hiring practices." },
    { role: "user", content: prompt },
  ]);

  if (!result.success || !result.content) {
    return { success: false as const, intel: null, error: result.error };
  }

  try {
    const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const intel = JSON.parse(cleaned);
    return { success: true as const, intel, error: null };
  } catch {
    return { success: false as const, intel: null, error: "Failed to parse AI response" };
  }
}

// Generate follow-up email
async function generateFollowUpEmail(
  stage: string,
  daysSinceContact: number,
  companyName: string,
  role: string,
  companyStyle?: CompanyStyle
) {
  const styleInstruction = getStyleInstruction(companyStyle);
  const prompt = `Generate a professional follow-up email for a job application.

Context:
- Stage: ${stage}
- Days since last contact: ${daysSinceContact}
- Company: ${companyName}
- Role: ${role}
${styleInstruction}

Write a concise, effective follow-up email that:
1. References the specific role and stage
2. Shows continued interest without being pushy
3. Adds value (mentions something relevant you could contribute)
4. Has a clear but soft call to action
5. Is appropriately brief (3-5 short paragraphs max)

Include subject line on the first line prefixed with "Subject: "
Then a blank line, then the email body.`;

  return chatCompletion([
    { role: "system", content: "You are an expert career coach who writes compelling follow-up emails that get responses without being annoying." },
    { role: "user", content: prompt },
  ]);
}

// Interview simulation - generate question
async function generateInterviewQuestion(
  companyName: string,
  role: string,
  interviewType: string
) {
  const prompt = `You are an interviewer at ${companyName} conducting a ${interviewType} interview for the ${role} position.

Ask ONE realistic interview question that ${companyName} would actually ask for this type of interview. Make it specific to their company culture and the role.

For behavioral: Use their leadership principles or values
For technical: Use relevant technical challenges they face
For system-design: Use a scenario relevant to their scale and domain

Output ONLY the question itself, nothing else. Make it specific and challenging.`;

  return chatCompletion([
    { role: "system", content: `You are a senior interviewer at ${companyName}. Ask one focused, realistic interview question.` },
    { role: "user", content: prompt },
  ]);
}

// Interview simulation - evaluate answer
async function evaluateInterviewAnswer(
  question: string,
  answer: string,
  companyName: string,
  role: string,
  interviewType: string
) {
  const prompt = `As an interviewer at ${companyName} for the ${role} position (${interviewType} interview), evaluate this answer:

QUESTION: ${question}

CANDIDATE'S ANSWER: ${answer}

Provide evaluation in JSON format:
{
  "score": 7,
  "maxScore": 10,
  "feedback": "Specific feedback on what was good and what needs improvement",
  "strengths": ["list of strengths in the answer"],
  "improvements": ["specific things to improve"],
  "improvedAnswer": "A model answer that would score 9-10, written in first person as the candidate"
}

Return ONLY valid JSON.`;

  const result = await chatCompletion([
    { role: "system", content: "You are an expert interviewer providing detailed, constructive feedback on interview answers." },
    { role: "user", content: prompt },
  ]);

  if (!result.success || !result.content) {
    return { success: false as const, evaluation: null, error: result.error };
  }

  try {
    const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const evaluation = JSON.parse(cleaned);
    return { success: true as const, evaluation, error: null };
  } catch {
    return { success: true as const, evaluation: null, error: null, content: result.content };
  }
}

// Generate networking message
async function generateNetworkingMessage(
  targetRole: string,
  targetCompany: string,
  userBackground: string,
  purpose: string,
  messageType: string
) {
  const prompt = `Generate a ${messageType} for professional networking.

TARGET: ${targetRole} at ${targetCompany}
MY BACKGROUND: ${userBackground}
PURPOSE: ${purpose}

Requirements based on message type:
- "linkedin_connection": Max 300 characters, personalized, mention something specific
- "informational_interview": Brief, respectful of their time, specific ask
- "warm_intro": Template for asking a mutual connection to introduce you

Write the message ready to send. Be genuine, specific, and concise. Avoid generic templates.`;

  return chatCompletion([
    { role: "system", content: "You are an expert networker who writes messages that actually get responses. You prioritize authenticity, specificity, and brevity." },
    { role: "user", content: prompt },
  ]);
}

// Generate tailored resume bullets
async function tailorResume(
  baseResume: string,
  voiceProfile: string,
  jobDescription: string,
  parsedRequirements: Record<string, unknown>,
  profileData?: { fullName?: string; email?: string; phone?: string; linkedInUrl?: string; portfolioUrl?: string; certifications?: Array<{name: string; url?: string}> },
  companyStyle?: CompanyStyle
) {
  const styleInstruction = getStyleInstruction(companyStyle);
  const contactBlock = profileData ? `
CONTACT INFORMATION:
- Name: ${profileData.fullName || "Not provided"}
- Email: ${profileData.email || "Not provided"}
- Phone: ${profileData.phone || "Not provided"}
- LinkedIn: ${profileData.linkedInUrl || "Not provided"}
- Portfolio: ${profileData.portfolioUrl || "Not provided"}
${profileData.certifications?.length ? `- Certifications: ${profileData.certifications.map(c => c.name).join(", ")}` : ""}
` : "";

  const prompt = `Create a COMPLETE, READY-TO-USE tailored resume for this job application. This should be a full document the person can directly submit.
${styleInstruction}

${contactBlock}
VOICE PROFILE (write in this exact style):
${voiceProfile}

FULL BASE RESUME:
${baseResume}

TARGET JOB DESCRIPTION:
${jobDescription}

${Object.keys(parsedRequirements).length > 0 ? `EXTRACTED REQUIREMENTS:\n${JSON.stringify(parsedRequirements, null, 2)}` : ""}

Instructions:
1. Output a COMPLETE resume document with all sections (header, summary, experience, skills, education, certifications)
2. Use the person's REAL information from their base resume — do NOT invent experiences or skills
3. Rewrite bullet points to incorporate keywords from the job description naturally
4. Maintain factual accuracy — only rephrase, don't fabricate
5. Use the voice/tone from the voice profile
6. Quantify achievements where possible
7. Format with clear section headers using CAPS (e.g., PROFESSIONAL SUMMARY, EXPERIENCE, SKILLS, EDUCATION)
8. Make it ATS-friendly: no tables, no columns, no graphics
9. Keep it to 1-2 pages worth of content
10. Include ALL contact information at the top

Output the complete resume as plain text, ready to copy into a Word document. Do NOT include JSON, markdown code blocks, or explanatory text — just the resume itself.`;

  const result = await chatCompletion([
    {
      role: "system",
      content: "You are an expert resume writer. Output ONLY the complete, formatted resume document. No explanations, no JSON, no code blocks — just the resume text ready to paste into a Word document.",
    },
    { role: "user", content: prompt },
  ]);

  return result;
}

// Generate cover letter
async function generateCoverLetter(
  baseResume: string,
  voiceProfile: string,
  jobDescription: string,
  companyName: string,
  jobTitle: string,
  companyStyle?: CompanyStyle
) {
  const styleInstruction = getStyleInstruction(companyStyle);
  const prompt = `Write a compelling, personalized cover letter for this job application.
${styleInstruction}
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
        profileData: z.object({
          fullName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          linkedInUrl: z.string().optional(),
          portfolioUrl: z.string().optional(),
          certifications: z.array(z.object({ name: z.string(), url: z.string().optional() })).optional(),
        }).optional(),
        companyStyle: z.enum(["formal_corporate", "startup_energy", "faang_precision", "mission_driven", "casual_collaborative"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return tailorResume(
        input.baseResume,
        input.voiceProfile,
        input.jobDescription,
        input.parsedRequirements ?? {},
        input.profileData,
        input.companyStyle
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
        companyStyle: z.enum(["formal_corporate", "startup_energy", "faang_precision", "mission_driven", "casual_collaborative"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return generateCoverLetter(
        input.baseResume,
        input.voiceProfile,
        input.jobDescription,
        input.companyName,
        input.jobTitle,
        input.companyStyle
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

  // Company Intelligence
  companyIntel: authedQuery
    .input(z.object({
      companyName: z.string().min(1),
      industry: z.string().optional(),
      jobDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateCompanyIntel(input.companyName, input.industry, input.jobDescription);
    }),

  // Follow-up email generator
  generateFollowUp: authedQuery
    .input(z.object({
      stage: z.enum(["post-application", "post-phone-screen", "post-interview", "post-offer"]),
      daysSinceContact: z.number().min(0),
      companyName: z.string().min(1),
      role: z.string().min(1),
      companyStyle: z.enum(["formal_corporate", "startup_energy", "faang_precision", "mission_driven", "casual_collaborative"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return generateFollowUpEmail(input.stage, input.daysSinceContact, input.companyName, input.role, input.companyStyle);
    }),

  // Interview Simulation - generate question
  interviewSimulation: authedQuery
    .input(z.object({
      companyName: z.string().min(1),
      role: z.string().min(1),
      interviewType: z.enum(["behavioral", "technical", "system-design"]),
    }))
    .mutation(async ({ input }) => {
      return generateInterviewQuestion(input.companyName, input.role, input.interviewType);
    }),

  // Interview Simulation - evaluate answer
  evaluateAnswer: authedQuery
    .input(z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      companyName: z.string().min(1),
      role: z.string().min(1),
      interviewType: z.enum(["behavioral", "technical", "system-design"]),
    }))
    .mutation(async ({ input }) => {
      return evaluateInterviewAnswer(input.question, input.answer, input.companyName, input.role, input.interviewType);
    }),

  // Networking message generator
  networkingMessage: authedQuery
    .input(z.object({
      targetRole: z.string().min(1),
      targetCompany: z.string().min(1),
      userBackground: z.string().min(1),
      purpose: z.string().min(1),
      messageType: z.enum(["linkedin_connection", "informational_interview", "warm_intro"]),
    }))
    .mutation(async ({ input }) => {
      return generateNetworkingMessage(input.targetRole, input.targetCompany, input.userBackground, input.purpose, input.messageType);
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
