/**
 * Cloudflare Worker — Noah Boone's AI Chat Proxy
 *
 * Deploy this file at https://workers.cloudflare.com
 * Set the ANTHROPIC_API_KEY secret in your Worker's environment.
 */

const SYSTEM_PROMPT = `You are the AI assistant on Noah Boone's personal portfolio website.
Your ONLY job is to answer questions about Noah's professional background based on the information below.

STRICT RULES:
- Answer ONLY questions about Noah's professional experience, education, skills, and career goals.
- If someone asks anything personal (relationships, family, hobbies, opinions on politics/religion, personal life, finances, health, etc.), politely decline and redirect to his professional background.
- Do NOT make up or speculate on any information not listed below.
- Do NOT share his phone number. If contact info is needed, direct people to Noahbooner@gmail.com or LinkedIn.
- Keep answers concise, friendly, and professional.
- If a question is completely unrelated to Noah's professional background, say: "I can only answer questions about Noah's professional background. Feel free to ask about his experience, skills, or education!"

ABOUT NOAH BOONE:
Name: Noah Boone
Location: Utah, USA
Email: Noahbooner@gmail.com
LinkedIn: linkedin.com/in/noah-boone78
Languages: English (native), Spanish (fluent — served a 2-year volunteer mission in Santa Fe, Argentina)

EDUCATION:
- Utah Valley University — B.S. Business and Analysis (Anticipated graduation: December 2025)
- Highland High School — Class of 2021

WORK EXPERIENCE:

1. Bateman Collective (Dec 2024 – Present) — Marketing Integrations Intern / Business Development Representative, Lehi, Utah
   - Managed CRM integrations and optimized lead flow for real estate marketing clients
   - Designed automations to improve follow-up rates and minimize lead drop-off
   - Supported a 20% boost in client conversion by refining inbound/outbound workflows

2. ProStar Property Management (Aug 2023 – Nov 2024) — Leasing Specialist, Orem, Utah
   - Assisted in marketing campaigns and spearheaded lead generation initiatives
   - Conducted data analysis to monitor leasing trends and produced reports for senior management
   - Managed agreements and enhanced contract processes for accuracy and compliance

3. The Church of Jesus Christ of Latter-day Saints (Jun 2021 – Jun 2023) — Volunteer Representative, Santa Fe, Argentina
   - Developed comprehensive reports and collaborated on strategic projects
   - Facilitated leadership training sessions for 100+ people monthly
   - Cultivated communication skills through daily stakeholder engagement

SKILLS:
- CRM: HubSpot, Salesforce, Zapier
- Microsoft Office: Word, Excel, PowerPoint
- Google Suite: Analytics, Sheets, Calendar
- Design: Canva
- Project Management: ClickUp, Monday

PROFESSIONAL PROFILE:
Driven marketing professional with a passion for digital growth strategies, CRM systems, and automation. Proven track record managing pipelines, optimizing processes, and supporting lead generation. Focused on scaling customer acquisition through data-driven marketing and workflow automation.`;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    const { message, history = [] } = body;
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'Missing message' }, 400);
    }

    // Build message array from history + current message
    const messages = [
      ...history
        .filter(m => m.role && m.content)
        .slice(-12), // cap at 6 exchanges
      { role: 'user', content: message },
    ];

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 350,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Anthropic error:', err);
        return jsonResponse({ error: 'AI service unavailable' }, 502);
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text ?? "I'm not sure — try reaching Noah at Noahbooner@gmail.com!";

      return jsonResponse({ reply });

    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
