/**
 * Netlify Serverless Function: Stateless AI Proxy (BYOK)
 * - Chỉ chuyển tiếp yêu cầu từ trình duyệt của người dùng sang Google AI Studio (AIza...) hoặc Vertex AI Express (AQ....)
 * - Tuyệt đối KHÔNG lưu trữ API Key, KHÔNG dùng biến môi trường chung.
 */

function sanitizeModelId(rawModel) {
  const str = String(rawModel || 'gemini-3.8-flash').trim();
  const withoutPrefix = str.replace(/^models\//i, '').trim();
  const firstToken = withoutPrefix.split(/[\s(]/)[0].trim();
  if (
    !firstToken ||
    /(gemini-2\.5|gemini-2\.0|gemini-1\.5)/i.test(firstToken)
  ) {
    return 'gemini-3.8-flash';
  }
  return firstToken;
}

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        error: { message: 'Method Not Allowed. Use POST.' }
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const cleanKey = String(body.apiKey || '').trim();
    const cleanModel = sanitizeModelId(body.model);
    const action = String(body.action || 'generateContent');
    const payload = body.payload || {};

    if (!cleanKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: { message: 'Thiếu tham số apiKey trong yêu cầu gửi lên.' }
        })
      };
    }

    const isVertexExpress = /^AQ\./i.test(cleanKey);

    let targetUrl = '';
    let maskedEndpoint = '';
    let fetchMethod = 'POST';

    if (action === 'listModels') {
      fetchMethod = 'GET';
      if (isVertexExpress) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            endpointMasked:
              'https://aiplatform.googleapis.com/v1/publishers/google/models (Vertex AI Express)',
            models: [
              {
                name: 'models/gemini-3.8-flash',
                displayName: 'Gemini 3.8 Flash (Vertex AI Express)',
                supportedGenerationMethods: ['generateContent']
              },
              {
                name: 'models/gemini-3.5-flash',
                displayName: 'Gemini 3.5 Flash (Vertex AI Express)',
                supportedGenerationMethods: ['generateContent']
              },
              {
                name: 'models/gemini-3.8-pro',
                displayName: 'Gemini 3.8 Pro (Vertex AI Express)',
                supportedGenerationMethods: ['generateContent']
              }
            ]
          })
        };
      } else {
        targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
          cleanKey
        )}`;
        maskedEndpoint = 'GET https://generativelanguage.googleapis.com/v1beta/models?key=***';
      }
    } else {
      if (isVertexExpress) {
        targetUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(
          cleanModel
        )}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        maskedEndpoint = `POST https://aiplatform.googleapis.com/v1/publishers/google/models/${cleanModel}:generateContent?key=***`;
      } else {
        targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          cleanModel
        )}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        maskedEndpoint = `POST https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=***`;
      }
    }

    const upstreamRes = await fetch(targetUrl, {
      method: fetchMethod,
      headers:
        fetchMethod === 'POST'
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
      body: fetchMethod === 'POST' ? JSON.stringify(payload) : undefined
    });

    const rawText = await upstreamRes.text();
    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = { rawText };
    }

    return {
      statusCode: upstreamRes.status,
      headers: {
        ...corsHeaders,
        'X-Upstream-Endpoint': maskedEndpoint
      },
      body: JSON.stringify({
        ...(typeof parsedData === 'object' && parsedData !== null ? parsedData : { data: parsedData }),
        _endpointMasked: maskedEndpoint,
        _httpStatus: upstreamRes.status
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          message: err instanceof Error ? err.message : 'Lỗi kết nối trong ai-proxy function.'
        }
      })
    };
  }
};
