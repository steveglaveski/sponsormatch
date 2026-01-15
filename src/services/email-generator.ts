import Anthropic from "@anthropic-ai/sdk";

export interface EmailContext {
  // User's club info
  userClubName: string;
  userClubSport: string;
  userClubLocation: string;

  // Sponsor info
  sponsorName: string;
  sponsorIndustry?: string;
  sponsorWebsite?: string;

  // Context about existing sponsorships
  currentlySponsors?: string[]; // Club names they already sponsor

  // Optional custom notes
  customNotes?: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const EMAIL_SYSTEM_PROMPT = `You are an expert at writing sponsorship inquiry emails for Australian local sports clubs. Your emails are:

- Warm and professional, but not overly formal
- Concise (under 250 words for the body)
- Specific about the local connection
- Clear about what value the club offers sponsors
- Written in Australian English (colour, organisation, favour, etc.)

You always include:
1. A personal connection or reference to their existing community support
2. Brief mention of what the club offers (exposure, signage, community goodwill)
3. A clear, low-pressure call to action

Never include:
- Specific dollar amounts or pricing
- Fabricated statistics or claims
- Overly salesy or pushy language
- Generic template-feeling content`;

/**
 * Generate a personalised sponsorship inquiry email using Claude
 */
export async function generateSponsorshipEmail(
  context: EmailContext
): Promise<GeneratedEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return a template email if no API key
    return generateTemplateEmail(context);
  }

  const anthropic = new Anthropic({ apiKey });

  const userPrompt = buildPrompt(context);

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: EMAIL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return parseEmailResponse(content.text, context);
  } catch (error) {
    console.error("Error generating email with Claude:", error);
    // Fall back to template
    return generateTemplateEmail(context);
  }
}

function buildPrompt(context: EmailContext): string {
  let prompt = `Generate a sponsorship inquiry email with the following context:

**My Club:**
- Name: ${context.userClubName}
- Sport: ${context.userClubSport}
- Location: ${context.userClubLocation}

**Target Sponsor:**
- Company: ${context.sponsorName}`;

  if (context.sponsorIndustry) {
    prompt += `\n- Industry: ${context.sponsorIndustry}`;
  }

  if (context.currentlySponsors && context.currentlySponsors.length > 0) {
    prompt += `\n- Already sponsors these local clubs: ${context.currentlySponsors.join(", ")}`;
  }

  if (context.customNotes) {
    prompt += `\n\n**Additional notes:** ${context.customNotes}`;
  }

  prompt += `

Please generate:
1. A subject line (on its own line, prefixed with "Subject: ")
2. The email body (after a blank line)

The email should be ready to send - include an appropriate greeting and sign-off (use "[Your Name]" as placeholder for signature).`;

  return prompt;
}

function parseEmailResponse(
  response: string,
  context: EmailContext
): GeneratedEmail {
  const lines = response.trim().split("\n");

  let subject = "";
  let bodyStartIndex = 0;

  // Find subject line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().startsWith("subject:")) {
      subject = line.substring(8).trim();
      bodyStartIndex = i + 1;
      break;
    }
  }

  // Skip blank lines after subject
  while (bodyStartIndex < lines.length && !lines[bodyStartIndex].trim()) {
    bodyStartIndex++;
  }

  const body = lines.slice(bodyStartIndex).join("\n").trim();

  // Fallback subject if not found
  if (!subject) {
    subject = `Sponsorship Opportunity - ${context.userClubName}`;
  }

  return { subject, body };
}

/**
 * Generate a template email when AI is not available
 */
function generateTemplateEmail(context: EmailContext): GeneratedEmail {
  const subject = `Sponsorship Inquiry from ${context.userClubName}`;

  let body = `Dear ${context.sponsorName} Team,

I hope this email finds you well. I'm reaching out from ${context.userClubName}, a local ${context.userClubSport.toLowerCase()} club based in ${context.userClubLocation}.`;

  if (context.currentlySponsors && context.currentlySponsors.length > 0) {
    body += `

We noticed your wonderful support of other local sporting clubs including ${context.currentlySponsors.slice(0, 2).join(" and ")}, and we'd love to explore a similar partnership.`;
  } else {
    body += `

We're currently seeking local business partners who share our passion for community sport and would like to increase their visibility in the ${context.userClubLocation} area.`;
  }

  body += `

As a sponsor, you would receive:
• Logo placement on our club signage and uniforms
• Recognition on our website and social media
• Exposure at our matches and club events
• Connection with our engaged community of players, families, and supporters

We'd love the opportunity to discuss how a partnership could benefit both ${context.sponsorName} and our club. Would you be available for a brief chat in the coming weeks?

Thank you for considering our club. We truly appreciate local businesses like yours who invest in community sport.

Kind regards,
[Your Name]
${context.userClubName}`;

  return { subject, body };
}

/**
 * Email templates for common scenarios
 */
export const EMAIL_TEMPLATES = {
  initial_outreach: {
    name: "Initial Outreach",
    description: "First contact with a potential sponsor",
  },
  follow_up: {
    name: "Follow Up",
    description: "Following up on a previous inquiry",
  },
  existing_sponsor: {
    name: "Renewal Request",
    description: "Asking an existing sponsor to renew",
  },
} as const;
