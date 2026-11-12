export interface FixVariant {
  label: string;
  code: string;
}

export interface FixGuide {
  note?: string;
  variants: FixVariant[];
}

function header(name: string, value: string): FixVariant[] {
  return [
    { label: "nginx", code: `add_header ${name} "${value}" always;` },
    { label: "Apache (mod_headers)", code: `Header always set ${name} "${value}"` },
    { label: "Caddy", code: `header ${name} "${value}"` },
  ];
}

const GUIDES: Record<string, FixGuide> = {
  "header:hsts": {
    note: "Only turn this on once every page and subdomain you serve works over HTTPS: browsers will refuse plain HTTP to this domain for the whole max-age. Add `preload` only if you intend to submit the domain to the preload list, which is hard to undo.",
    variants: header("Strict-Transport-Security", "max-age=31536000; includeSubDomains"),
  },

  "header:csp": {
    note: "This starter policy will block inline scripts and any resource from another origin, so a working site may break. Ship it first as `Content-Security-Policy-Report-Only` (same value, different header name) and watch the browser console, then switch to enforcing.",
    variants: header(
      "Content-Security-Policy",
      "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    ),
  },

  "header:x_frame_options": {
    note: "Use SAMEORIGIN instead of DENY if your own pages legitimately frame each other.",
    variants: header("X-Frame-Options", "DENY"),
  },

  "header:x_content_type_options": {
    variants: header("X-Content-Type-Options", "nosniff"),
  },

  "header:referrer_policy": {
    variants: header("Referrer-Policy", "strict-origin-when-cross-origin"),
  },

  "header:permissions_policy": {
    note: "List only the features your site does not use. `()` means no origin may use it, your own included.",
    variants: header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"),
  },

  "header:version_disclosure": {
    note: "Removes the version number, not the fact you run the software. That is the point: the version is what lets someone look up a matching exploit.",
    variants: [
      { label: "nginx (in the http block)", code: "server_tokens off;" },
      { label: "nginx, behind an app", code: "proxy_hide_header X-Powered-By;" },
      { label: "Apache", code: "ServerTokens Prod\nServerSignature Off" },
      { label: "PHP (php.ini)", code: "expose_php = Off" },
      { label: "Express", code: "app.disable('x-powered-by');" },
      { label: "Caddy", code: "header -Server" },
    ],
  },

  "header:cookie_flags": {
    note: "Best fixed where the cookie is created. The proxy-level options below are a stopgap for cookies you cannot change in the application.",
    variants: [
      { label: "Raw header", code: "Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax; Path=/" },
      { label: "Express", code: "res.cookie('session', value, { secure: true, httpOnly: true, sameSite: 'lax' });" },
      { label: "nginx proxy (1.19.3+)", code: "proxy_cookie_flags ~ secure httponly samesite=lax;" },
    ],
  },
};

const TLS_PROTOCOL: FixGuide = {
  note: "Disables the old protocol versions. Test with a real client first: very old devices cannot speak TLS 1.2, and dropping them is the intent. For a full, current cipher list use Mozilla's SSL Configuration Generator rather than copying one from here.",
  variants: [
    { label: "nginx", code: "ssl_protocols TLSv1.2 TLSv1.3;" },
    { label: "Apache", code: "SSLProtocol -all +TLSv1.2 +TLSv1.3" },
    { label: "Caddy", code: "tls {\n  protocols tls1.2 tls1.3\n}" },
  ],
};

const TLS_CERT: FixGuide = {
  note: "Certificates should renew themselves. If you use Let's Encrypt, check that the renewal timer is actually running, not just that it was set up once.",
  variants: [
    { label: "certbot", code: "sudo certbot renew --dry-run" },
    { label: "Caddy", code: "# Caddy renews automatically. Check it can reach the CA:\ncaddy validate --config /etc/caddy/Caddyfile" },
  ],
};

export function fixGuideFor(checkId: string): FixGuide | null {
  const base = checkId.replace(/:weak$/, "");
  if (GUIDES[base]) return GUIDES[base];

  if (checkId.startsWith("tls:")) {
    const id = checkId.slice(4).toLowerCase();
    if (/^(sslv|tls1)/.test(id) || id.includes("protocol")) return TLS_PROTOCOL;
    if (id.includes("cert") && (id.includes("expir") || id.includes("valid"))) return TLS_CERT;
  }

  return null;
}
