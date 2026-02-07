# jgilbrothers-website
Main website for J GIL Brothers. AI Branding and Content Studio.

## Creator's Hub Email Notifications
The Creator's Hub signup endpoint (`/functions/api/creators-hub-signup`) sends an admin email on new account creation using an HTTP email provider compatible with Cloudflare Workers (defaults to MailChannels HTTP API).

Set these environment variables in your deployment:
- `CREATORS_HUB_EMAIL_PROVIDER_URL` (optional): Email provider API endpoint. Defaults to `https://api.mailchannels.net/tx/v1/send`.
- `CREATORS_HUB_EMAIL_PROVIDER_KEY` (optional): Bearer token for the provider (if required).
- `CREATORS_HUB_EMAIL_FROM` (optional): From address (defaults to `no-reply@jgilbrothers.com`).
