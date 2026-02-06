const ASPECT_SIZES = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:5": { width: 896, height: 1120 },
  "3:2": { width: 1152, height: 768 }
};

function buildCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

export async function onRequest({ request }) {
  const origin = request.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const prompt = (payload && payload.prompt ? String(payload.prompt) : "").trim();
  const aspect = (payload && payload.aspect ? String(payload.aspect) : "1:1").trim();

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required." }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const size = ASPECT_SIZES[aspect] || ASPECT_SIZES["1:1"];
  const encodedPrompt = encodeURIComponent(prompt);
  const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${size.width}&height=${size.height}&nologo=true`;

  const upstream = await fetch(apiUrl, { method: "GET" });

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "Image generation failed." }), {
      status: 502,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") || "image/png"
    }
  });
}
