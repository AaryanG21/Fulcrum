import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cookie policy",
  robots: { index: true, follow: true },
  alternates: { canonical: "/cookies" },
  description:
    "The cookies Fulcrum sets, what each one does, how long it lasts, and why you are not asked to consent to any of them.",
};

export default function CookiePolicy() {
  return (
    <>
      <h1>Cookie policy</h1>

      <p>
        Fulcrum sets five cookies that exist to sign you in and keep that
        session safe. It sets a sixth, <code>fulcrum_theme</code>, only if you
        press the light/dark switch, to remember what you picked. There are no
        analytics, advertising, tracking or A/B-testing cookies — not disabled,
        not present.
      </p>

      <h2>Why there is no cookie banner</h2>

      <p>
        Consent is required for cookies that are not strictly necessary.
        Consent is not needed for the five sign-in cookies, because they are
        necessary to provide the service you asked for — you cannot sign in
        without them — and asking anyway would be a pretence: a banner offering
        a choice that does not exist. The sixth, <code>fulcrum_theme</code>, is
        not needed to sign in, which is why it is never set on its own: it
        appears only as the direct result of you pressing the theme switch, and
        a visitor who never touches the switch never receives it.
      </p>

      <p>
        If analytics or any other non-essential cookie is ever added, that
        changes, and a real consent mechanism will be added with it.
      </p>

      <h2>The cookies</h2>

      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Purpose</th>
            <th scope="col">Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>fulcrum_at</code>
            </td>
            <td>
              Proves you are signed in. Short-lived on purpose, so a copied
              session is useful only briefly.
            </td>
            <td>10 minutes</td>
          </tr>
          <tr>
            <td>
              <code>fulcrum_rt</code>
            </td>
            <td>
              Renews the above without making you sign in again. Sent only to
              the sign-in endpoints, not with every request. Rotates on each
              use, and re-use of an old one ends every session in that family.
            </td>
            <td>7 days</td>
          </tr>
          <tr>
            <td>
              <code>fulcrum_mfa</code>
            </td>
            <td>
              Holds the gap between entering your password and entering your
              two-factor code. On its own it cannot sign you in.
            </td>
            <td>5 minutes</td>
          </tr>
          <tr>
            <td>
              <code>fulcrum_reauth</code>
            </td>
            <td>
              Records that an administrator has just re-confirmed their
              password and two-factor code before a destructive action.
            </td>
            <td>5 minutes</td>
          </tr>
          <tr>
            <td>
              <code>fulcrum_csrf</code>
            </td>
            <td>
              Stops another website from making requests as you. This is the
              one cookie readable by JavaScript on this site, because the page
              has to echo its value back — it grants no access by itself.
            </td>
            <td>7 days</td>
          </tr>
          <tr>
            <td>
              <code>fulcrum_theme</code>
            </td>
            <td>
              Remembers whether you chose the light or the dark theme. Set only
              when you press the theme switch. It contains the single word{" "}
              <code>light</code> or <code>dark</code>. Readable by JavaScript,
              because the switch writes it.
            </td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <p>
        All six are restricted to this site only and are never sent to another
        domain. Four of the six cannot be read by JavaScript at all. When this
        site is served over HTTPS, all are marked so the browser will only send
        them over an encrypted connection.
      </p>

      <h2>What happens when you sign out</h2>

      <p>
        Signing out deletes <code>fulcrum_at</code>, <code>fulcrum_rt</code>,{" "}
        <code>fulcrum_mfa</code> and <code>fulcrum_reauth</code>, and revokes
        the session on the server so the refresh token cannot be used again
        even if it were copied beforehand.
      </p>

      <p>
        <strong>
          <code>fulcrum_csrf</code> is not deleted when you sign out
        </strong>{" "}
        and may remain in your browser for up to 7 days. It contains a random
        value, is tied to no account, and grants no access on its own — but it
        is still there, and saying &ldquo;signing out removes all cookies&rdquo;
        would not have been true. You can clear it through your browser at any
        time. <code>fulcrum_theme</code> is not deleted either: it is a display
        preference, tied to no account, and it stays for up to a year or until
        you clear it in your browser or press the switch again.
      </p>

      <h2>Other storage</h2>

      <p>
        Fulcrum does not use local storage, session storage, IndexedDB or
        browser fingerprinting. No authentication token is ever written
        anywhere JavaScript can read it, which is why the cookies above do the
        work instead.
      </p>

      <h2>Blocking cookies</h2>

      <p>
        You can block these cookies in your browser. You will not be able to
        sign in — there is no other mechanism for keeping you signed in, and no
        fallback that would work. The public pages, including this one, will
        still be readable.
      </p>

      <p>
        For what is stored on our side rather than in your browser, see the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </>
  );
}
