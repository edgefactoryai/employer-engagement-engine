import { GoogleGenAI, Type, GenerateContentResponse, Modality, FunctionDeclaration } from "@google/genai";
import { WorkforceProfile, EmployerMatch, OutreachSegment, OutreachAssets, LinkedInPost } from "./types";

/**
 * Takes structured form data and enhances it with AI to provide target job titles 
 * and additional context needed for employer discovery.
 */
export const enhanceProfile = async (formData: Partial<WorkforceProfile>): Promise<WorkforceProfile> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Enhance this workforce information for employer matching and strategic planning.
    
    Program Title: ${formData.title}
    Region: ${formData.region}
    Industries: ${formData.industries}
    URL: ${formData.ctaLink || 'None provided'}
    
    PROVIDED CONTACT DETAILS (Preserve these unless you find more accurate ones on the URL):
    - Name: ${formData.primaryContactInfo?.name || 'Not provided'}
    - Email: ${formData.primaryContactInfo?.email || 'Not provided'}
    - Phone: ${formData.primaryContactInfo?.phone || 'Not provided'}
    - Address: ${formData.primaryContactInfo?.address || 'Not provided'}
    
    TASKS:
    1. Create a compelling 2-sentence Elevator Pitch.
    2. Provide geographic/economic analytics for the ${formData.region} area (labor market trends, key employers, growth rate).
    3. Determine a realistic pay/wage range based on current market data for this region and industry. 
       CRITICAL: You MUST include BOTH the estimated annual salary range AND the equivalent hourly wage range (e.g., "$55,000 - $75,000/yr | $26.44 - $36.05/hr").
    4. If a URL is provided, search for and extract the Primary Contact (Name, Email, Phone, Address). If not found, use the PROVIDED CONTACT DETAILS above.
    5. Summarize the program page content (if URL provided) into a concise one-page style summary.
    6. Assess if safety training/compliance (OSHA, etc.) is likely involved.
    7. Generate Target Job Titles, Hard Skills, and Soft Skills.
    8. Provide 3 Strategic Suggestions.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          region: { type: Type.STRING },
          industries: { type: Type.ARRAY, items: { type: Type.STRING } },
          elevatorPitch: { type: Type.STRING },
          geoAnalytics: { type: Type.STRING, description: 'Economic and labor market overview of the region' },
          wageRange: { type: Type.STRING, description: 'Estimated pay range including both annual salary and hourly wage equivalents' },
          primaryContactInfo: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              address: { type: Type.STRING }
            }
          },
          siteSummary: { type: Type.STRING, description: 'Brief summary of the provided URL content' },
          safetyAssessment: { type: Type.STRING, description: 'Evaluation of safety training requirements' },
          skills: {
            type: Type.OBJECT,
            properties: {
              hard: { type: Type.ARRAY, items: { type: Type.STRING } },
              soft: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['hard', 'soft']
          },
          credentials: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetJobTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
          startDate: { type: Type.STRING },
          ctaLink: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'region', 'industries', 'elevatorPitch', 'geoAnalytics', 'wageRange', 'safetyAssessment', 'skills', 'targetJobTitles', 'startDate', 'suggestions']
      }
    }
  });

  return JSON.parse(response.text);
};

export const discoverEmployers = async (profile: WorkforceProfile): Promise<EmployerMatch[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare exclude/include lists
  const exclusions = profile.currentPartners && profile.currentPartners.length > 0 
    ? profile.currentPartners.join(", ") 
    : "None";
  const pastPartners = profile.pastPartners && profile.pastPartners.length > 0 
    ? profile.pastPartners.join(", ") 
    : "None";

  const prompt = `Based on this workforce profile:
  - Title: ${profile.title}
  - Industries: ${profile.industries.join(", ")}
  - Region/Service Area: ${profile.region}
  - Target Job Titles: ${profile.targetJobTitles.join(", ")}
  
  CRITICAL GEOGRAPHIC CONSTRAINT:
  You must strictly filter your search results. Only return employers who are physically located within the specified Region/Service Area (${profile.region}) or within a 60-minute driving radius of its center. Do not include remote-only companies unless they have a physical office in this radius.

  CONTEXT - EXCLUSIONS (Current Partners):
  The following employers are already working with the program. Do NOT include them in the results:
  ${exclusions}

  CONTEXT - RECONNECTIONS (Past Partners):
  The following employers are past partners. If they are still good matches, you SHOULD include them to facilitate reconnection.
  IMPORTANT: If you include a past partner, you MUST start their 'rationale' field with the tag "[RECONNECT]".
  Past Partners List: ${pastPartners}

  Propose EXACTLY 100 real or highly representative potential employer targets in this region. 
  For each, score them based on: 
  Industry alignment (30%), Job title overlap (25%), Skill overlap (25%), Geographic proximity (10%), Hiring signals (10%).
  Assign them an outreach segment from: ${Object.values(OutreachSegment).join(", ")}.
  Include basic contact info: website, phone, and a generic contact email if possible.
  Also estimate the employee count (e.g., '10-50', '500+') and provide the NAICS Code (e.g., '541511').`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            score: { type: Type.NUMBER },
            rationale: { type: Type.STRING },
            segment: { type: Type.STRING },
            industryAlignment: { type: Type.NUMBER },
            jobTitleOverlap: { type: Type.NUMBER },
            skillOverlap: { type: Type.NUMBER },
            geographicProximity: { type: Type.NUMBER },
            hiringSignals: { type: Type.NUMBER },
            website: { type: Type.STRING },
            phone: { type: Type.STRING },
            contactEmail: { type: Type.STRING },
            employeeCount: { type: Type.STRING, description: "Estimated employee count range (e.g. '50-100')" },
            naicsCode: { type: Type.STRING, description: "The North American Industry Classification System (NAICS) code" }
          },
          required: ['name', 'score', 'rationale', 'segment', 'industryAlignment', 'jobTitleOverlap', 'skillOverlap', 'geographicProximity', 'hiringSignals', 'employeeCount', 'naicsCode']
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateOutreach = async (profile: WorkforceProfile, employer: EmployerMatch): Promise<OutreachAssets> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a tailored outreach package for ${employer.name} for the ${profile.title} workforce program. 
    Segment focus: ${employer.segment}. 
    Region: ${profile.region}. 
    CTA: ${profile.ctaLink || 'Visit our official website'}. 
    Include 1 primary email, 3 follow-ups, a phone call script, and a specific LinkedIn message (DM/InMail style). 
    
    CRITICAL SIGNATURE & COMPLIANCE REQUIREMENTS:
    1. Every email MUST end with a professional signature block containing:
       - Name: ${profile.primaryContactInfo?.name || 'Program Director'}
       - Address: ${profile.primaryContactInfo?.address || 'Address Not Provided'}
    
    2. Every email MUST include this exact disclaimer at the very bottom, after the signature:
       "This message is an advertisement. Participation does not guarantee hiring outcomes; program availability subject to enrollment and eligibility. To opt out of future communications, please reply with 'Unsubscribe'."`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryEmail: { type: Type.STRING, description: '140-180 words primary email' },
          followUps: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3 follow-up emails, 80-120 words each' },
          callScript: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Bullet points for a call script' },
          subjectLines: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3 subject line options' },
          linkedInMessage: { type: Type.STRING, description: 'A tailored, personal LinkedIn outreach message' }
        },
        required: ['primaryEmail', 'followUps', 'callScript', 'subjectLines', 'linkedInMessage']
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateLinkedInCalendar = async (profile: WorkforceProfile): Promise<LinkedInPost[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate exactly 10 FRESH and UNIQUE LinkedIn posts specifically written for AN EMPLOYER AUDIENCE to recruit them for the ${profile.title} workforce program. 
    Current timestamp to ensure uniqueness: ${Date.now()}.
    Focus on ROI, filling skills gaps, and simplifying their hiring pipeline. 
    Avoid repetition from previous runs. Use a professional partnership-oriented tone. 
    
    IMPORTANT: You MUST include the following link naturally within the content of every post: ${profile.ctaLink || 'Visit our official website'}.
    
    Pillars to rotate across the 10 posts: 
    1. Employer ROI/Value (Cost savings, retention)
    2. Talent Pipeline (Developing local skills)
    3. Program Spotlight (Ease of participation, credentials)
    4. Industry Insight (Future-proofing the workforce)
    5. Community Impact (Local economic growth)
    6. Diversity & Inclusion (Broadening the talent pool)
    
    For each post, provide 3-5 relevant and trending hashtags.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.NUMBER },
            pillar: { type: Type.STRING },
            content: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 relevant hashtags' }
          },
          required: ['day', 'pillar', 'content', 'hashtags']
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generatePostGraphic = async (post: LinkedInPost, profile: WorkforceProfile): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `A professional, clean, and high-impact LinkedIn post graphic representing the theme: "${post.pillar}". 
  Specific context: "${post.content.substring(0, 300)}".
  Recruiting employers for a "${profile.title}" workforce program in the "${profile.industries.join(", ")}" industries. 
  Visual Style: Modern corporate photography or high-end professional digital illustration. 
  Themes: Collaboration, technical excellence, future workforce, and economic growth. 
  Crucial: Do not include any text in the image. High-quality lighting and professional business aesthetic. 1K resolution.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to extract image data");
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read the following outreach content professionally and clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio output");
  }
  return base64Audio;
};

/**
 * Support Assistant Tool Configuration
 */
const navigateAppFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateApp',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate the user to a specific section of the Employer Engagement Engine application.',
    properties: {
      step: {
        type: Type.STRING,
        description: 'The target view ID to switch to.',
        enum: ['landing', 'intake', 'discovery', 'report', 'outreach', 'linkedin', 'chat', 'support', 'docs']
      },
      reason: {
        type: Type.STRING,
        description: 'Brief explanation of why the user is being moved to this step.'
      }
    },
    required: ['step'],
  },
};

export const getSupportExpertResponse = async (userMessage: string, history: {role: 'user'|'model', text: string}[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are the E^3 System Assistant Bot. You are a world-class expert on the Employer Engagement Engine (E^3).
  Your mission is to help workforce development professionals use the app effectively to scale employer partnerships.
  
  APPLICATION FEATURES:
  - Step 1 (Intake): Enter program details and manage current/past partners.
  - Step 2 (Discovery): View AI-enhanced regional economic analytics and elevator pitches.
  - Step 3 (Match Report): Review 100 ranked local employers with matching scores.
  - Step 4 (Campaign Builder): Access tailored email sequences, call scripts, and LinkedIn DMs.
  - Step 5 (LinkedIn Engine): Generate social media strategies with AI-designed graphics.
  - E^3 Search: Grounded market lead discovery using Google Search.
  
  INTERACTIVE NAVIGATION:
  You can move the user between app sections. If they want to "start", "see my matches", "find jobs", or "view my LinkedIn plan", use the 'navigateApp' tool.
  
  TONE: Professional, encouraging, and technically precise. Use Markdown formatting.
  If a user is stuck, explain the 5-step lifecycle and guide them.`;

  return ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: [navigateAppFunctionDeclaration] }]
    }
  });
};