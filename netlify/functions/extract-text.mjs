import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
};

function cleanText(text = '') {
  return text
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST is allowed.' }), {
      status: 405,
      headers: JSON_HEADERS
    });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'Mangler url.' }), {
        status: 400,
        headers: JSON_HEADERS
      });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Ugyldig URL.' }), {
        status: 400,
        headers: JSON_HEADERS
      });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Kun http/https links er tilladt.' }), {
        status: 400,
        headers: JSON_HEADERS
      });
    }

    const response = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkTilLydBot/1.0)'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Kunne ikke hente siden (${response.status}).` }), {
        status: 502,
        headers: JSON_HEADERS
      });
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: parsed.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent) {
      return new Response(JSON.stringify({ error: 'Kunne ikke udtrække artikeltekst fra linket.' }), {
        status: 422,
        headers: JSON_HEADERS
      });
    }

    const text = cleanText(article.textContent);
    return new Response(
      JSON.stringify({
        title: article.title || '',
        byline: article.byline || '',
        text
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Ukendt fejl.' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
};
