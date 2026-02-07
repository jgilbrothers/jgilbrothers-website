function buildCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function formatEmailBody({ timestamp, email, username, displayName, path, userAgent, ip }) {
  const lines = [
    `New Creator Hub Member Signup`,
    `Timestamp: ${timestamp}`,
    `Email: ${email}`,
    `Username: ${username}`,
    `Display Name: ${displayName || "(not provided)"}`,
    `Request Path: ${path}`,
    `User Agent: ${userAgent}`
  ];

  if (ip) {
    lines.push(`IP: ${ip}`);
  }

  return lines.join("\n");
}

async function sendAdminEmail({ env, subject, body }) {
  const providerUrl = env.CREATORS_HUB_EMAIL_PROVIDER_URL || "https://api.mailchannels.net/tx/v1/send";
  const fromEmail = env.CREATORS_HUB_EMAIL_FROM || "no-reply@jgilbrothers.com";
  const apiKey = env.CREATORS_HUB_EMAIL_PROVIDER_KEY || "";

  const payload = {
    personalizations: [
      {
        to: [{ email: "creators@jgilbrothers.com" }]
      }
    ],
    from: { email: fromEmail, name: "Creator Hub" },
    subject,
    content: [{ type: "text/plain", value: body }]
  };

  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email provider error: ${response.status} ${message}`);
  }
}

export async function onRequest({ request, env }) {
  const origin = request.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = String(payload.email || "").trim();
  const username = String(payload.username || "").trim();
  const displayName = String(payload.displayName || "").trim();
  const path = String(payload.path || "/creators-hub/").trim();
  const userAgent = String(payload.userAgent || "").trim();

  if (!email || !username) {
    return new Response(JSON.stringify({ error: "Email and username are required." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const timestamp = new Date().toISOString();
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  const subject = `New Creator Hub Member Signup: ${username}`;
  const body = formatEmailBody({ timestamp, email, username, displayName, path, userAgent, ip });

  try {
    await sendAdminEmail({ env, subject, body });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to send admin email." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
