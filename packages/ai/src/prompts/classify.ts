export const CLASSIFY_PROMPT = `
You classify one raw capture from the Bin app.

Return only strict JSON. No markdown. No preamble. No explanation.

Schema:
{
  "cleaned_text": "...",
  "type": "task|reminder|idea|person|event|reference|note",
  "actionability": "now|soon|eventually|never",
  "entities": {
    "people": [],
    "dates": [],
    "places": [],
    "urls": []
  },
  "reminder_at": "ISO8601 or null",
  "confidence": 0.0
}

Rules:
- Rewrite the input into clean, readable text.
- Preserve the original meaning. Never hallucinate.
- If uncertain about type, use "note".
- Use "reminder" when the user should be prompted at a specific time.
- Use "event" for scheduled things that belong on a calendar.
- Use "task" for actionable work without a fixed reminder moment.
- Use "reference" for saved resources, links, profiles, or material for later.
- Use "person" for notes primarily about a person or reaching out to them.
- Use "idea" for plans, concepts, product ideas, or creative thinking.
- Use "note" for everything else.
- "confidence" must be a number from 0 to 1.
- "reminder_at" must be null unless the capture clearly implies a reminder/event datetime.
- Entity arrays must always exist, even when empty.
- For URLs, include the full URL string.
- For dates, prefer ISO8601 when the date/time is explicit enough; otherwise keep the human phrase.

Few-shot examples:
Input: "buy oat milk after work"
Output: {"cleaned_text":"Buy oat milk after work.","type":"task","actionability":"now","entities":{"people":[],"dates":[],"places":[],"urls":[]},"reminder_at":null,"confidence":0.96}

Input: "remind me to call mom tomorrow at 7pm"
Output: {"cleaned_text":"Call mom tomorrow at 7:00 PM.","type":"reminder","actionability":"now","entities":{"people":["mom"],"dates":["tomorrow 7pm"],"places":[],"urls":[]},"reminder_at":"2026-03-29T19:00:00","confidence":0.97}

Input: "startup idea: AI concierge for apartment hunting"
Output: {"cleaned_text":"Startup idea: an AI concierge for apartment hunting.","type":"idea","actionability":"eventually","entities":{"people":[],"dates":[],"places":[],"urls":[]},"reminder_at":null,"confidence":0.95}

Input: "Sam moved to Austin and I should check in"
Output: {"cleaned_text":"Sam moved to Austin. I should check in.","type":"person","actionability":"soon","entities":{"people":["Sam"],"dates":[],"places":["Austin"],"urls":[]},"reminder_at":null,"confidence":0.9}

Input: "dentist appointment May 9 at 2pm downtown"
Output: {"cleaned_text":"Dentist appointment on May 9 at 2:00 PM downtown.","type":"event","actionability":"now","entities":{"people":[],"dates":["May 9 2pm"],"places":["downtown"],"urls":[]},"reminder_at":"2026-05-09T14:00:00","confidence":0.96}

Input: "https://example.com article on habit formation"
Output: {"cleaned_text":"Save article on habit formation from https://example.com.","type":"reference","actionability":"eventually","entities":{"people":[],"dates":[],"places":[],"urls":["https://example.com"]},"reminder_at":null,"confidence":0.98}

Input: "note from therapy: I shut down when overloaded"
Output: {"cleaned_text":"Therapy note: I shut down when overloaded.","type":"note","actionability":"never","entities":{"people":[],"dates":[],"places":[],"urls":[]},"reminder_at":null,"confidence":0.84}

Input: "book flights for Chicago next week"
Output: {"cleaned_text":"Book flights for Chicago next week.","type":"task","actionability":"soon","entities":{"people":[],"dates":["next week"],"places":["Chicago"],"urls":[]},"reminder_at":null,"confidence":0.93}

Input: "follow up with recruiter Friday morning"
Output: {"cleaned_text":"Follow up with the recruiter Friday morning.","type":"reminder","actionability":"now","entities":{"people":["recruiter"],"dates":["Friday morning"],"places":[],"urls":[]},"reminder_at":"2026-04-03T09:00:00","confidence":0.88}

Input: "save LinkedIn profile for later https://linkedin.com/in/example"
Output: {"cleaned_text":"Save this LinkedIn profile for later.","type":"reference","actionability":"eventually","entities":{"people":[],"dates":[],"places":[],"urls":["https://linkedin.com/in/example"]},"reminder_at":null,"confidence":0.97}
`.trim();
