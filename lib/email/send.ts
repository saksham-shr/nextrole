/**
 * Thin email layer over the Resend REST API.
 * No npm package needed — just fetch.
 *
 * Set RESEND_API_KEY in env to enable. When unset, emails are logged
 * to console and silently skipped (safe for local dev without SMTP).
 */

const FROM = process.env.TRIAL_EMAIL_FROM ?? "Braevity <billing@braevity.com>";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextrole.live").replace(/\/$/, "");

// ── Base sender ──────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend error ${res.status} for "${subject}" to ${to}:`, text);
    }
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
  }
}

// ── Shared HTML shell ────────────────────────────────────────────────────────

function shell(bodyHtml: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Braevity</title></head>
<body style="margin:0;padding:0;background:#f7f3ec;font-family:Inter,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;padding:40px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding-bottom:24px">
    <span style="font-family:'Archivo Expanded',system-ui,sans-serif;font-size:14px;font-weight:700;color:#211c19">Braevity</span>
  </td></tr>
  <tr><td style="background:#fffdf8;border:1px solid #e8e2d8;border-radius:12px;padding:32px">
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding-top:20px;font-size:12px;color:#8a8278;line-height:1.6">
    Braevity · <a href="${SITE}" style="color:#c84a1f;text-decoration:none">${SITE.replace("https://", "")}</a><br>
    You're receiving this because you have an account with Braevity.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1a1814">${text}</h2>`;
}
function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#4a4540">${text}</p>`;
}
function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:10px 22px;background:#c84a1f;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px">${text}</a>`;
}
function pill(label: string, color: string) {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:monospace;letter-spacing:.08em;background:${color}20;color:${color}">${label.toUpperCase()}</span>`;
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #e8e2d8;margin:20px 0">`;
}

// ── Email templates ──────────────────────────────────────────────────────────

/** Sent when a Razorpay payment attempt fails. */
export async function sendPaymentFailedEmail(to: string, plan: string): Promise<void> {
  const html = shell(`
    ${h2("Payment failed")}
    ${p(`We couldn't process your payment for the <strong>${plan}</strong> plan. Your account is currently in a <strong>past-due</strong> state.`)}
    ${p("Your access continues for now, but you'll lose access if the payment isn't resolved soon.")}
    ${btn("Retry payment", `${SITE}/dashboard/billing`)}
    ${divider()}
    ${p(`If you continue to have trouble, <a href="mailto:support@braevity.com" style="color:#c84a1f">contact support</a> and we'll sort it out.`)}
  `);
  await sendEmail(to, "Payment failed — action required", html);
}

/** Sent 3 days before subscription_ends_at. */
export async function sendExpiryWarningEmail(
  to: string,
  plan: string,
  daysLeft: number,
  accessUntil: Date,
): Promise<void> {
  const dateStr = accessUntil.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const html = shell(`
    ${h2("Your subscription expires soon")}
    ${pill(plan, "#c84a1f")}
    ${p(`Your <strong>${plan}</strong> plan expires in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> on <strong>${dateStr}</strong>.`)}
    ${p("Renew now to keep your credits, autofill sessions, and premium features.")}
    ${btn("Renew subscription", `${SITE}/dashboard/billing`)}
    ${divider()}
    ${p("After expiry your account moves to the Free tier automatically. You won't be charged — just renew when you're ready.")}
  `);
  await sendEmail(to, `Your ${plan} plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, html);
}

/** Sent immediately when user cancels from the billing page. */
export async function sendCancellationEmail(
  to: string,
  plan: string,
  accessUntil: Date,
): Promise<void> {
  const dateStr = accessUntil.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const html = shell(`
    ${h2("Subscription cancelled")}
    ${p(`Your <strong>${plan}</strong> subscription has been cancelled.`)}
    ${p(`You'll keep full access to all ${plan} features until <strong>${dateStr}</strong>. After that, your account moves to the Free tier.`)}
    ${p("No further charges will be made.")}
    ${btn("Manage plan", `${SITE}/dashboard/billing`)}
    ${divider()}
    ${p("Changed your mind? You can re-subscribe anytime from the billing page.")}
  `);
  await sendEmail(to, "Subscription cancelled — access continues until " + dateStr, html);
}

/** Sent when a refund is fully processed by Razorpay. */
export async function sendRefundEmail(
  to: string,
  plan: string,
  amountPaise: number,
): Promise<void> {
  const amount = `₹${(amountPaise / 100).toFixed(0)}`;
  const html = shell(`
    ${h2("Refund processed")}
    ${p(`Your refund of <strong>${amount}</strong> for the <strong>${plan}</strong> plan has been processed by Razorpay.`)}
    ${p("Funds typically appear in your account within 5–7 business days depending on your bank.")}
    ${p("Your account has been moved to the Free tier.")}
    ${btn("Go to dashboard", `${SITE}/dashboard`)}
    ${divider()}
    ${p(`Questions? <a href="mailto:support@braevity.com" style="color:#c84a1f">Contact support</a>`)}
  `);
  await sendEmail(to, `Refund of ${amount} processed`, html);
}

/** Sent when a halted subscription finally downgrade the user to free. */
export async function sendHaltedEmail(to: string, plan: string): Promise<void> {
  const html = shell(`
    ${h2("Access suspended — payment required")}
    ${p(`After multiple failed payment attempts, your <strong>${plan}</strong> subscription has been suspended and your account has moved to the Free tier.`)}
    ${p("You can re-subscribe at any time to restore full access.")}
    ${btn("Re-subscribe", `${SITE}/dashboard/billing`)}
    ${divider()}
    ${p(`Need help? <a href="mailto:support@braevity.com" style="color:#c84a1f">Contact support</a>`)}
  `);
  await sendEmail(to, "Subscription suspended — action required", html);
}
