import { emailProviderLabel } from "@/lib/email/provider-label";
import Link from "next/link";
import { JURISDICTION, OPERATOR } from "@/lib/legal/operator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy policy",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
  description:
    "What personal data Fulcrum collects, why, how long it is kept, and how to have it erased. Written against the Digital Personal Data Protection Act, 2023.",
};

export default function PrivacyPolicy() {
  return (
    <>
      <h1>Privacy policy</h1>

      <p>
        This policy describes the personal data Fulcrum collects, why it is
        collected, how long it is kept, and what you can ask us to do with it.
        It is written against the {JURISDICTION.law} of {JURISDICTION.country}{" "}
        (the &ldquo;{JURISDICTION.lawShort}&rdquo;), under which{" "}
        {OPERATOR.name} is the <strong>Data Fiduciary</strong> and you are a{" "}
        <strong>Data Principal</strong>.
      </p>

      <p>
        It describes the service as it is actually built. Where a limitation is
        awkward, it is stated rather than omitted.
      </p>

      <h2>Who operates this service</h2>

      <p>
        Fulcrum is operated by {OPERATOR.name}, {OPERATOR.legalForm}. For any
        question, complaint or request about your personal data, including
        erasure, contact the Grievance Officer at{" "}
        <a href={`mailto:${OPERATOR.grievanceEmail}`}>
          {OPERATOR.grievanceEmail}
        </a>
        .
      </p>

      <h2>You must be {JURISDICTION.minimumAge} or older</h2>

      <p>
        Accounts are only for people aged {JURISDICTION.minimumAge} or over.
        You confirm your age when you register, and we record that you did so
        and when. We do not ask for your date of birth, because confirming the
        threshold is all that is needed and collecting the exact date would be
        more data than the purpose requires.
      </p>

      <p>
        Under the {JURISDICTION.lawShort} anyone under 18 is a child, and
        processing a child&rsquo;s data requires verifiable parental consent.
        Fulcrum is not built to obtain that, which is why the threshold is{" "}
        {JURISDICTION.minimumAge} rather than lower. If you believe someone
        under {JURISDICTION.minimumAge} has created an account, write to the
        Grievance Officer and it will be deleted.
      </p>

      <h2>What we collect, and why</h2>

      <h3>Information you give us</h3>

      <table>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address</td>
            <td>
              Identifies your account, is how you sign in, and labels the entry
              in your authenticator app. We also send a small number of
              messages to it, described under <a href="#email">Email</a> below
              — never marketing.
            </td>
          </tr>
          <tr>
            <td>Password</td>
            <td>
              Stored only as an argon2id hash, never in a form that can be
              reversed back to your password. We cannot read it, and neither
              can anyone who obtains the database.
            </td>
          </tr>
          <tr>
            <td>Two-factor secret and backup codes</td>
            <td>
              Required on every account. The secret is encrypted at rest with
              AES-256-GCM; backup codes are stored hashed, like passwords.
            </td>
          </tr>
          <tr>
            <td>Age and terms confirmation</td>
            <td>
              The fact that you confirmed you are {JURISDICTION.minimumAge} or
              over and accepted the Terms, and when. A consent record is only
              meaningful if it is timestamped.
            </td>
          </tr>
          <tr>
            <td>Hostnames you register</td>
            <td>
              To check you control a domain before scanning it, and to list
              your domains back to you.
            </td>
          </tr>
          <tr>
            <td>Whether and when you confirmed your email address</td>
            <td>
              Nothing can sign in until the address has been confirmed, so we
              know the person registering can read mail sent to it.
            </td>
          </tr>
          <tr>
            <td>Scan schedules you set</td>
            <td>
              Which domain, how often, and whether you want an email if the
              result gets worse — so the scans run and you are told.
            </td>
          </tr>
          <tr>
            <td>Share links you create</td>
            <td>
              When each was made, when it expires and whether it was revoked.
              The link itself is not stored — only a one-way hash of it — so
              it cannot be recovered, only replaced.
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Information created by using the service</h3>

      <table>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Scan results</td>
            <td>
              The findings, score, grade and remediation plan for each scan,
              and the hostname scanned. These are your results and are shown
              only to you.
            </td>
          </tr>
          <tr>
            <td>Sign-in activity</td>
            <td>
              Each sign-in attempt — successful or not — with the time and
              outcome. Used to lock an account under attack, to rate limit, and
              to show you your own recent activity on the account page.
            </td>
          </tr>
          <tr>
            <td>Security audit records</td>
            <td>
              Sign-ins, failed sign-ins, rejected requests, rate-limit trips,
              domain changes, scans and administrator actions, recorded against
              your email address. This is the record that makes it possible to
              tell what happened if an account is compromised.
            </td>
          </tr>
          <tr>
            <td>Session records</td>
            <td>
              A hash of each session token, so a stolen session can be detected
              and every session in that family revoked at once.
            </td>
          </tr>
          <tr>
            <td>Browser user-agent string</td>
            <td>
              Recorded with sign-ins and sessions, to help you recognise
              activity that was not you.
            </td>
          </tr>
        </tbody>
      </table>

      <h3>One-time links we email you</h3>

      <p>
        To confirm your address and to reset a password, we generate a random
        single-use link and email it to you. We store only a one-way hash of
        it and its expiry time, never the link, so reading our database does
        not yield a working link. It is deleted shortly after it expires or is
        used.
      </p>

      <h3>IP addresses — only in some deployments</h3>

      <p>
        Whether your IP address is recorded depends on how this instance is
        configured. Fulcrum only accepts a client IP when it is deployed behind
        a reverse proxy it has been explicitly told to trust, and that setting
        is <strong>off by default</strong>. When it is off, no IP address is
        stored against your sign-ins, sessions or audit records at all.
      </p>

      <p>
        When it is on, IP addresses are recorded alongside sign-in attempts,
        sessions and audit records, for the same reasons: detecting attacks and
        letting you recognise activity that was not you. Separately, whatever
        reverse proxy or hosting provider sits in front of this service keeps
        its own access logs, which are outside this application.
      </p>

      <p>
        Scans run in the background, after your request has finished, so the
        audit record written when a scan completes or fails names your account
        but carries no IP address or browser details. Those are recorded once,
        on the entry made when you asked for the scan.
      </p>

      <h3>The check on the home page</h3>

      <p>
        You can check a site&rsquo;s headers from the home page without an
        account. Nothing about that check is stored for you: there is no
        result to look up later. The security audit log records that a check of
        that hostname was requested and its grade, and your IP address where
        this deployment collects one (see below), for the reasons given there —
        chiefly so the feature cannot be used to send traffic at someone else
        without anyone being able to tell who.
      </p>

      <h3>Data about the sites you scan</h3>

      <p>
        A scan records what the target host sent back: response headers, any
        software version it advertises, cookie <em>names</em> (never cookie
        values), and TLS and certificate facts. Where the site you scan belongs
        to someone else, that content is stored in your scan result. All of it
        is truncated and sanitised before storage, and it is never treated as
        instructions — only as data to display.
      </p>

      <h2>What we do not do</h2>

      <p>These are verifiable by reading the source, not just promises:</p>

      <ul>
        <li>
          <strong>No analytics, advertising or tracking of any kind.</strong>{" "}
          There is no analytics provider, tag manager, advertising SDK, session
          recorder, heat-mapping tool or error-reporting service in this
          application. Not configured off — not present.
        </li>
        <li>
          <strong>No third-party code runs in your browser.</strong> No
          external scripts, no embedded frames, no third-party fonts. The
          Content Security Policy this site sends would block them if any were
          added.
        </li>
        <li>
          <strong>No profiling and no automated decisions about you.</strong>{" "}
          Fulcrum grades websites, not people.
        </li>
        <li>
          <strong>We never sell or share your personal data</strong>, and there
          are no advertising or data-broker relationships to disclose.
        </li>
      </ul>

      <h2>Who else receives your data</h2>

      <p>
        <strong>Your email address is handled by one service: the one that
        delivers our email.</strong> That is {emailProviderLabel()}. It sees
        the address and the content of each message we send you, and nothing
        else about you. Fulcrum sends no data to any analytics endpoint, advertising
        network or other processor.
      </p>

      <p>
        Apart from that, the only outbound network activity is caused by you,
        and consists of:
      </p>

      <ul>
        <li>
          <strong>DNS lookups</strong> for hostnames you submit — which
          necessarily disclose that hostname to DNS infrastructure.
        </li>
        <li>
          <strong>Connections to the hostname you asked us to check</strong> —
          which disclose this server&rsquo;s IP address and a Fulcrum user-agent
          string to that host. Your identity is not sent.
        </li>
      </ul>

      <p>
        The infrastructure this service runs on — the hosting provider and the
        database it runs against — necessarily processes data on our behalf.
      </p>

      <h2 id="email">Email</h2>

      <p>
        Fulcrum sends email for exactly four reasons, and no others. There is
        no marketing list, no newsletter and no tracking: the messages contain
        no images, no tracking pixels and no wrapped links.
      </p>

      <ul>
        <li>
          <strong>To confirm your address</strong> when you register.
        </li>
        <li>
          <strong>To reset a password</strong>, when you ask us to.
        </li>
        <li>
          <strong>To tell you your password was changed</strong>, so a change
          you did not make does not go unnoticed.
        </li>
        <li>
          <strong>Alerts you turned on yourself:</strong> if you schedule scans
          of a domain and choose to be told when the result gets worse, we email
          you when it does, and if a schedule is paused because ownership of the
          domain is no longer verified. You can turn these off at any time from
          your dashboard.
        </li>
      </ul>

      <p>
        Because none of these is marketing, they are sent whether or not you
        have opted into anything else, and the first three cannot be switched
        off. There is no unsubscribe link on them for that reason; the alerts
        you chose have a switch in your dashboard instead.
      </p>

      <h3>If you lose access</h3>

      <p>
        Resetting a password by email also needs a code from your authenticator
        app or one of your backup codes. This is deliberate: access to an inbox
        alone must not be enough to take over an account on a security tool,
        or two-factor authentication would protect nothing. The consequence is
        that if you lose your authenticator <em>and</em> every backup code, we
        cannot restore access — we hold nothing that would let us tell it is
        really you. Keep your backup codes somewhere other than your phone.
      </p>

      <h2>How long we keep it</h2>

      <table>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Kept for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account, domains, scan results, sign-in history</td>
            <td>Until you delete your account, then removed.</td>
          </tr>
          <tr>
            <td>Expired session records</td>
            <td>Removed automatically once expired.</td>
          </tr>
          <tr>
            <td>One-time email links (as hashes)</td>
            <td>Removed automatically a week after they expire or are used.</td>
          </tr>
          <tr>
            <td>Share links and scan schedules</td>
            <td>
              Until you revoke or remove them or delete the account. Share links
              also stop working at their expiry, 30 days after they are made.
            </td>
          </tr>
          <tr>
            <td>Security audit records</td>
            <td>
              <strong>{OPERATOR.auditRetentionDays} days</strong>, then
              destroyed — including after you delete your account. See below.
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Why audit records outlive your account</h3>

      <p>
        The security audit log is <strong>append-only</strong>: the database
        itself refuses to let this application modify or delete a row in it.
        That is deliberate. A log an attacker can edit after the fact records
        nothing worth having, and the entries that matter most are usually the
        ones concerning an account that was later removed.
      </p>

      <p>
        The consequence is honest and worth stating plainly: after you delete
        your account, audit entries naming your email address, and your IP
        address where one was collected, remain for up to{" "}
        {OPERATOR.auditRetentionDays} days. They are then destroyed
        automatically when the storage holding them is dropped. Nothing is kept
        beyond that window, and no person has to remember to delete it.
      </p>

      <h2>Your rights</h2>

      <p>
        Under the {JURISDICTION.lawShort} you may, at any time:
      </p>

      <ul>
        <li>
          <strong>Ask what we hold about you.</strong> Your account page shows
          your details, domains, scans and recent sign-in activity. You can
          also download everything in machine-readable form.
        </li>
        <li>
          <strong>Correct or complete it.</strong> Write to the Grievance
          Officer.
        </li>
        <li>
          <strong>Erase it.</strong> Delete your account from the account page.
          This removes your account, domains, scan results, sessions and
          sign-in history immediately, subject to the audit-record window
          above. It cannot be undone.
        </li>
        <li>
          <strong>Complain.</strong> Write to the Grievance Officer, who will
          respond. You may also complain to the Data Protection Board of India.
        </li>
        <li>
          <strong>Nominate someone</strong> to exercise these rights on your
          behalf in the event of your death or incapacity. Contact the
          Grievance Officer.
        </li>
      </ul>

      <h2>How your data is protected</h2>

      <ul>
        <li>Two-factor authentication is required on every account.</li>
        <li>
          Passwords and backup codes are stored as argon2id hashes; two-factor
          secrets are encrypted at rest.
        </li>
        <li>
          Sessions use short-lived tokens that rotate, and re-use of a rotated
          token revokes the entire session family.
        </li>
        <li>
          The security audit log cannot be altered by the application.
        </li>
        <li>
          Administrators must re-enter their password and a two-factor code
          before any action affecting another account, and every such action is
          logged.
        </li>
      </ul>

      <p>
        No service can promise it will not be breached, and this one does not.
        If a breach affects your personal data, we will notify you and the Data
        Protection Board as required.
      </p>

      <h2>Cookies</h2>

      <p>
        Fulcrum sets five cookies that are strictly necessary to sign you in and
        keep the session safe, and one more, <code>fulcrum_theme</code>, only
        if you press the light/dark switch, to remember your choice. There are
        no analytics or advertising cookies, which is why you are not asked to
        consent to any. The{" "}
        <Link href="/cookies">cookie policy</Link> lists each one, what it does
        and how long it lasts.
      </p>

      <h2>Changes to this policy</h2>

      <p>
        If this policy changes materially, the date at the foot of the page
        changes and signed-in users are told. Continuing to use the service
        after a change means the new version applies.
      </p>
    </>
  );
}
