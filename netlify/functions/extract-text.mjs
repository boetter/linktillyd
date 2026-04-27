import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Only POST is supported.' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid JSON payload.' });
  }

  const { url } = payload;

  if (!url || typeof url !== 'string') {
    return response(400, { error: 'A valid URL is required.' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return response(400, { error: 'URL format is invalid.' });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LinkTilLydBot/1.0; +https://netlify.com/)'
      }
    });

    if (!upstream.ok) {
      return response(422, {
        error: `Could not fetch URL. HTTP ${upstream.status}.`
      });
    }

    const html = await upstream.text();
    const dom = new JSDOM(html, { url: parsed.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent?.trim()) {
      return response(422, {
        error:
          'No readable article text was found on the page. Paste text manually instead.'
      });
    }

    const normalizedText = article.textContent.replace(/\s+/g, ' ').trim();

    return response(200, {
      title: article.title || null,
      text: normalizedText
    });
  } catch (error) {
    return response(500, {
      error: 'Unexpected extraction error.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
