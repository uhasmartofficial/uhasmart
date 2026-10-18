import nodemailer from "nodemailer";

interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

function getMailTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.APP_PASSWORD;

  if (!user || !pass) {
    console.warn("[Email Service] SMTP credentials (SMTP_USER / SMTP_PASS) not configured. Emails will be logged to console in development.");
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.replace(/\s+/g, "").trim(), // Strip any accidental spaces in 16-char app password
    },
  } as TransporterConfig);
}

const DEFAULT_FROM = process.env.SMTP_FROM || `"UHASMART" <${process.env.SMTP_USER || "noreply@uhasmart.com"}>`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uhasmart.vercel.app";

/**
 * 1. Send Seller Subscription Payment & Activation Receipt
 */
export async function sendSubscriptionPaymentConfirmation({
  to,
  sellerName,
  planName,
  amountGhs,
  paymentMethod,
  reference,
  expiryDate,
}: {
  to: string;
  sellerName: string;
  planName: string;
  amountGhs: number;
  paymentMethod: string;
  reference: string;
  expiryDate: string;
}) {
  const subject = `Payment Confirmed: Your UHASMART Seller Subscription is Active! 🎉`;
  const sellerUrl = `${SITE_URL}/seller`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - UHASMART</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2563eb; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">UHASMART</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #bfdbfe; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Official Payment Receipt &bull; Seller Subscription
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; border: 1px solid #a7f3d0; margin-bottom: 12px;">
                ✅ Payment Verified &bull; Active
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Thank You, ${sellerName}! 🎉
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Your Mobile Money payment has been successfully confirmed. Your seller account is now fully active, and all your product listings and promotional flyers are live for students across UHAS and Ho!
              </p>

              <!-- Payment Receipt Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 0 0 24px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Receipt Summary</span>
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="font-size: 11px; font-weight: 800; color: #059669;">CONFIRMED</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Plan:</td>
                  <td style="padding: 12px 20px; font-size: 13px; font-weight: 800; color: #0f172a; text-align: right;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Amount Paid:</td>
                  <td style="padding: 12px 20px; font-size: 16px; font-weight: 900; color: #2563eb; text-align: right;">GHS ${amountGhs}.00</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Payment Method:</td>
                  <td style="padding: 12px 20px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Reference ID:</td>
                  <td style="padding: 12px 20px; font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right;">${reference}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Subscription Valid Until:</td>
                  <td style="padding: 12px 20px; font-size: 13px; font-weight: 800; color: #059669; text-align: right;">${expiryDate}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 5px 0 20px 0;">
                    <a href="${sellerUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                      Manage My Store &amp; Listings &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SPAM NOTIFICATION CALLOUT -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 16px; margin: 15px 0 5px 0;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #92400e;">
                  ⚠️ Can't find customer order alerts or messages?
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #78350f;">
                  If this email arrived in your <strong>Spam</strong> or <strong>Junk</strong> folder, please tap <strong>&quot;Report not spam&quot;</strong> or move it to your <strong>Primary inbox</strong>. This ensures you never miss student buyers messaging you about your products.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b;">
                UHASMART &bull; Sokode &bull; Dave &bull; Trafalgar &bull; Ho, Volta Region, Ghana
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                This is an automated payment receipt. Keep this email for your records.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[Dev Simulation] Email payment confirmation sent to: ${to} | Ref: ${reference}`);
    return { success: true, simulated: true };
  }

  const info = await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * 2. Send Seller Subscription Renewal Reminder
 */
export async function sendSubscriptionRenewalReminder({
  to,
  sellerName,
  daysRemaining,
  expiryDate,
  isExpired,
}: {
  to: string;
  sellerName: string;
  daysRemaining: number;
  expiryDate: string;
  isExpired: boolean;
}) {
  const subject = isExpired
    ? `⚠️ Action Required: Your UHASMART Seller Subscription has Expired`
    : `⚠️ Notice: Your UHASMART Seller Subscription Expires in ${daysRemaining} Days`;

  const sellerUrl = `${SITE_URL}/seller`;

  const urgencyBadge = isExpired ? "🔴 SUBSCRIPTION EXPIRED" : `⏳ ${daysRemaining} DAYS REMAINING`;
  const urgencyBg = isExpired ? "#fef2f2" : "#fffbeb";
  const urgencyBorder = isExpired ? "#fecaca" : "#fde68a";
  const urgencyColor = isExpired ? "#b91c1c" : "#b45309";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewal Notice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2563eb; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">UHASMART</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #bfdbfe; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Seller Subscription Notice
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="display: inline-block; background-color: ${urgencyBg}; color: ${urgencyColor}; font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 999px; border: 1px solid ${urgencyBorder}; margin-bottom: 14px;">
                ${urgencyBadge}
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                Keep Your Campus Shop Open, ${sellerName}! 🛒
              </h2>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${
                  isExpired
                    ? `Your seller subscription on <strong>UHASMART</strong> has expired as of <strong>${expiryDate}</strong>. Your product listings are safely preserved in your account, but are currently <strong>hidden from campus buyers</strong> until you renew.`
                    : `Your seller subscription on <strong>UHASMART</strong> is expiring in <strong>${daysRemaining} days</strong> (on <strong>${expiryDate}</strong>). Renew today so your store remains visible without interruption.`
                }
              </p>

              <!-- Benefits List -->
              <div style="background-color: #f1f5f9; border-radius: 14px; padding: 18px 20px; margin: 0 0 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #0f172a;">
                  Why Stay Active on UHASMART?
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: #334155;">
                  <li><strong>Instant WhatsApp Leads:</strong> Students message you directly with 1 tap.</li>
                  <li><strong>Multiple Pictures &amp; Flyers:</strong> Post up to 20 photos or promotional posters.</li>
                  <li><strong>Ho-Wide Reach:</strong> Sokode, Trafalgar, Dave, and all UHAS campuses.</li>
                  <li><strong>Verified Seller Trust:</strong> Build your reputation with student ratings.</li>
                </ul>
              </div>

              <!-- Available Plans -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Plan</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Duration</th>
                  <th style="padding: 10px 16px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748b;">Price</th>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a;">1 Month Standard</td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">30 Days</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #2563eb; text-align: right;">GHS 30</td>
                </tr>
                <tr style="background-color: #eff6ff; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #1e40af;">
                    1 Semester (4 Mos) <span style="font-size: 10px; background-color: #2563eb; color: #fff; padding: 2px 6px; border-radius: 6px;">POPULAR</span>
                  </td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #1e40af; font-weight: 600;">120 Days</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 900; color: #1e40af; text-align: right;">GHS 80</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a;">1 Full Year Pro</td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">365 Days</td>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #2563eb; text-align: right;">GHS 180</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 5px 0 20px 0;">
                    <a href="${sellerUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 34px; border-radius: 14px; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);">
                      Renew Subscription with Mobile Money &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SPAM NOTIFICATION CALLOUT -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 16px; margin: 15px 0 5px 0;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #92400e;">
                  ⚠️ Found this in Spam or Junk?
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #78350f;">
                  Please mark this email as <strong>&quot;Not Spam&quot;</strong> or move it to your <strong>Primary inbox</strong>. This ensures critical seller renewal alerts and student buyer messages arrive reliably.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b;">
                UHASMART &bull; Sokode &bull; Dave &bull; Trafalgar &bull; Ho, Volta Region, Ghana
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                You are receiving this because you registered as a student business owner on UHASMART.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[Dev Simulation] Subscription renewal reminder sent to: ${to}`);
    return { success: true, simulated: true };
  }

  const info = await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });

  return { success: true, messageId: info.messageId };
}
