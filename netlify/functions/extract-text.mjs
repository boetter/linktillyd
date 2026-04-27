import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export default async (req) => {
  if (req.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const { url } = JSON.parse(req.body || '{}');
  if (!url) {
    return jsonResponse(400, { error: 'Mangler url' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 LinkTilLydBot/1.0'
      }
    });

    if (!response.ok) {
      return jsonResponse(400, { error: `Kunne ikke hente siden (${response.status})` });
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    if (!article?.textContent) {
      return jsonResponse(422, { error: 'Kunne ikke finde artikeltekst på siden' });
    }

    const cleaned = article.textContent.replace(/\s+\n/g, '\n').trim();
    return jsonResponse(200, { title: article.title, text: cleaned });
  } catch (error) {
    return jsonResponse(500, { error: `Serverfejl: ${error.message}` });
  }
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}
