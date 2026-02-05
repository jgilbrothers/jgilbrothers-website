const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(context) {
  let payload = null;

  try {
    payload = await context.request.json();
  } catch {
    return json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  return json({
    ok: true,
    message: "Image generation endpoint is wired up. Replace this stub with provider integration.",
    received: {
      email: payload?.email ?? null,
      prompt: payload?.prompt ?? null,
      aspect: payload?.aspect ?? "1:1",
    },
  });
}

export async function onRequest() {
  return json(
    { ok: false, error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
