# Deploying on Render's free tier

Honest limits first, because they shape what you are getting:

- The service **sleeps after 15 minutes without visitors** and takes about a
  minute to wake. While asleep, the scan worker and the scheduler do not run:
  queued scans wait, and scheduled re-scans and regression emails are late.
- The free instance has **512 MB of memory**. A full TLS scan plus the app can
  run tight, so `SCAN_CONCURRENCY` is 1.
- The filesystem is wiped on every restart. Nothing the app needs lives on it:
  everything is in Postgres.
- **Outbound SMTP is blocked**, so mail is sent over HTTPS (`EMAIL_TRANSPORT=api`).
- Render's own free Postgres expires after 30 days. **Do not use it.** Use
  Neon's free database, which does not expire.

This path is for a demo or a small trial, not a launch you rely on.

## 1. Accounts (you create these; nothing here needs a card)

| What | Why |
| --- | --- |
| GitHub, with this repo pushed | Render builds from the repo |
| [Neon](https://neon.tech) | Free Postgres that does not expire |
| [Brevo](https://www.brevo.com) or [Resend](https://resend.com) | Sends the sign-up and reset emails over HTTPS |
| [Render](https://render.com) | Runs the app |

## 2. Email provider

1. Add `fulcrumsecurity.in` as a sending domain at the provider and publish
   the DNS records it shows you (SPF, DKIM, and usually a verification TXT).
   Without these, mail is rejected or lands in spam.
2. Create an API key. Keep it to yourself: it goes into Render's dashboard and
   nowhere else. Never commit it.
3. `EMAIL_FROM` must be an address on that verified domain.

The privacy page names the provider automatically from `EMAIL_API_PROVIDER`.

## 3. Database (Neon)

1. Create a project; copy the connection string. It must contain
   `sslmode=require`.
2. Apply the migrations **once, from your own machine**, so the secret stays in
   your terminal:

```bash
DATABASE_URL="<your Neon connection string>" npx prisma migrate deploy
```

## 4. Secrets

Generate two 32-byte keys (each must decode to exactly 32 bytes):

```bash
openssl rand -base64 32
openssl rand -base64 32
```

One is `JWT_SIGNING_KEY`, the other `TOTP_ENCRYPTION_KEY`. They must be
different, and you must keep them: losing `TOTP_ENCRYPTION_KEY` locks every
user out of their second factor.

## 5. Render

1. New → Blueprint → pick the repo (it reads `render.yaml`), or create a Web
   Service by hand: runtime Docker, plan Free, health check path `/api/ready`.
2. Fill in the four values it asks for: `DATABASE_URL`, `JWT_SIGNING_KEY`,
   `TOTP_ENCRYPTION_KEY`, `EMAIL_API_KEY`.
3. After the first deploy, open the `/api/ready` URL: it should answer ready.

## 6. Domain

Add `fulcrumsecurity.in` (and `www`) as a custom domain in Render's dashboard
and create the DNS records it shows. It issues the HTTPS certificate itself.
Keep `APP_ORIGIN` as `https://fulcrumsecurity.in`.

## 7. First check

Create an account with an address you control, confirm the email arrives,
finish the authenticator step, sign in, and run a headers check.

## Keeping it awake (optional)

A free uptime monitor that requests `https://fulcrumsecurity.in/api/ready`
every 5 minutes stops the sleeping. One always-awake service uses about 744
hours a month against a 750-hour allowance, which fits, but leaves no slack,
and if the allowance runs out Render suspends your free services until the
next month.
