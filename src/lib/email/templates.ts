import "server-only";
import { getEnv } from "@/lib/env";
import type { OutgoingEmail } from "@/lib/email/send";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function origin(): string {
  return getEnv().APP_ORIGIN.replace(/\/+$/, "");
}

export function appLink(path: string, params?: Record<string, string>): string {
  const url = new URL(path, origin());
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function wrap(heading: string, bodyHtml: string, footerText: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a2330">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dde3ea;border-radius:8px;padding:28px">
<div style="font-family:ui-monospace,Menlo,monospace;letter-spacing:.2em;font-size:12px;color:#7022fc;margin-bottom:18px">FULCRUM</div>
<h1 style="font-size:19px;margin:0 0 14px">${esc(heading)}</h1>
${bodyHtml}
<p style="font-size:12px;color:#5b6773;margin:24px 0 0;border-top:1px solid #e6ebf0;padding-top:14px">${esc(footerText)}</p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#7022fc;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-weight:600;display:inline-block">${esc(label)}</a></p>
<p style="font-size:12px;color:#5b6773;word-break:break-all">If the button does not work, copy this address into your browser:<br>${esc(href)}</p>`;
}

export function verifyEmailMessage(args: {
  to: string;
  link: string;
  ttlHours: number;
}): OutgoingEmail {
  const subject = "Confirm your email address for Fulcrum";
  const footer =
    "You are receiving this because someone used this address to create a Fulcrum account. If that was not you, ignore this message and no account will be activated.";
  return {
    to: args.to,
    subject,
    text: [
      "Confirm your email address to finish setting up your Fulcrum account.",
      "",
      args.link,
      "",
      `This link works for ${args.ttlHours} hours and can be used once.`,
      "",
      footer,
    ].join("\n"),
    html: wrap(
      "Confirm your email address",
      `<p style="margin:0 0 6px;line-height:1.5">Confirm this address to finish setting up your Fulcrum account.</p>
${button(args.link, "Confirm email address")}
<p style="margin:0;font-size:13px">This link works for ${args.ttlHours} hours and can be used once.</p>`,
      footer,
    ),
  };
}

export function passwordResetMessage(args: {
  to: string;
  link: string;
  ttlMinutes: number;
}): OutgoingEmail {
  const subject = "Reset your Fulcrum password";
  const footer =
    "If you did not ask for this, ignore it — your password has not changed and nobody can use this link without your authenticator app or a backup code.";
  return {
    to: args.to,
    subject,
    text: [
      "Someone asked to reset the password for this Fulcrum account.",
      "",
      args.link,
      "",
      `The link works for ${args.ttlMinutes} minutes and can be used once.`,
      "To finish, you will also need a code from your authenticator app, or one of your backup codes.",
      "",
      footer,
    ].join("\n"),
    html: wrap(
      "Reset your password",
      `<p style="margin:0 0 6px;line-height:1.5">Someone asked to reset the password for this account. To finish you will need a code from your authenticator app, or one of your backup codes.</p>
${button(args.link, "Choose a new password")}
<p style="margin:0;font-size:13px">The link works for ${args.ttlMinutes} minutes and can be used once.</p>`,
      footer,
    ),
  };
}

export function passwordChangedMessage(args: { to: string }): OutgoingEmail {
  const subject = "Your Fulcrum password was changed";
  const resetPage = appLink("/forgot-password");
  const footer = "This is a security notice, not a marketing message.";
  return {
    to: args.to,
    subject,
    text: [
      "The password for this Fulcrum account was just changed, and every signed-in session was ended.",
      "",
      `If that was you, there is nothing to do. If it was not, reset your password now: ${resetPage}`,
      "",
      footer,
    ].join("\n"),
    html: wrap(
      "Your password was changed",
      `<p style="margin:0 0 10px;line-height:1.5">The password for this account was just changed, and every signed-in session was ended.</p>
<p style="margin:0;line-height:1.5">If that was you, there is nothing to do. If it was not, <a href="${esc(resetPage)}" style="color:#7022fc">reset your password now</a>.</p>`,
      footer,
    ),
  };
}

export function regressionMessage(args: {
  to: string;
  hostname: string;
  previousGrade: string;
  newGrade: string;
  previousScore: number;
  newScore: number;
  newFindings: string[];
  link: string;
}): OutgoingEmail {
  const fell = args.newScore < args.previousScore;
  const lead = fell
    ? `The latest scheduled scan of ${args.hostname} scored lower than the one before it.`
    : `The latest scheduled scan of ${args.hostname} found new serious issues, although the score did not fall.`;
  const subject = fell
    ? `${args.hostname}: security grade dropped from ${args.previousGrade} to ${args.newGrade}`
    : `${args.hostname}: new serious findings in the latest scan`;
  const listed = args.newFindings.slice(0, 5);
  const more = args.newFindings.length - listed.length;
  const footer = `You are getting this because you turned on alerts for ${args.hostname}. Turn them off from your dashboard at any time.`;

  return {
    to: args.to,
    subject,
    text: [
      lead,
      "",
      `Grade: ${args.previousGrade} -> ${args.newGrade}`,
      `Score: ${args.previousScore} -> ${args.newScore}`,
      "",
      listed.length ? "New findings:" : "",
      ...listed.map((t) => `  - ${t}`),
      more > 0 ? `  - and ${more} more` : "",
      "",
      `Full scorecard: ${args.link}`,
      "",
      "A grade reflects only the checks Fulcrum runs; it is not a statement that a site is or is not secure.",
      "",
      footer,
    ]
      .filter((line, i, all) => line !== "" || all[i - 1] !== "")
      .join("\n"),
    html: wrap(
      fell ? `${args.hostname} scored lower` : `${args.hostname}: new serious findings`,
      `<p style="margin:0 0 10px;line-height:1.5">${esc(lead)}</p>
<p style="margin:0 0 10px;font-family:ui-monospace,Menlo,monospace">Grade ${esc(args.previousGrade)} &rarr; ${esc(args.newGrade)} &nbsp;&middot;&nbsp; Score ${args.previousScore} &rarr; ${args.newScore}</p>
${
  listed.length
    ? `<p style="margin:0 0 4px;font-weight:600">New findings</p><ul style="margin:0 0 6px;padding-left:20px">${listed.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${more > 0 ? `<p style="margin:0;font-size:13px">and ${more} more</p>` : ""}`
    : ""
}
${button(args.link, "Open the scorecard")}
<p style="margin:0;font-size:13px;color:#5b6773">A grade reflects only the checks Fulcrum runs; it is not a statement that a site is or is not secure.</p>`,
      footer,
    ),
  };
}

export function schedulePausedMessage(args: {
  to: string;
  hostname: string;
  reason: string;
}): OutgoingEmail {
  const subject = `Scheduled scans of ${args.hostname} are paused`;
  const link = appLink("/dashboard");
  const footer = "You are getting this because you scheduled scans for this domain.";
  return {
    to: args.to,
    subject,
    text: [
      `Scheduled scans of ${args.hostname} have been paused.`,
      "",
      args.reason,
      "",
      `Fix it and turn the schedule back on from your dashboard: ${link}`,
      "",
      footer,
    ].join("\n"),
    html: wrap(
      "Scheduled scans paused",
      `<p style="margin:0 0 10px;line-height:1.5">Scheduled scans of <strong>${esc(args.hostname)}</strong> have been paused.</p>
<p style="margin:0 0 6px;line-height:1.5">${esc(args.reason)}</p>
${button(link, "Open your dashboard")}`,
      footer,
    ),
  };
}
