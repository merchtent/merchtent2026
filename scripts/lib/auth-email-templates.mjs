const colours = {
  black: "#050505",
  panel: "#111111",
  border: "#303030",
  cream: "#f4f1e8",
  muted: "#aaa8a1",
  lime: "#b7ff3c",
  red: "#f00000",
};

function absoluteUrl(siteUrl, path) {
  return new URL(path, `${siteUrl.replace(/\/$/, "")}/`).toString();
}

function authEmail({ assetBaseUrl, eyebrow, heading, copy, buttonLabel, buttonUrl, note }) {
  const logoUrl = absoluteUrl(assetBaseUrl, "/images/merch-tent-logo-badge-192.png");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${colours.black};color:${colours.cream};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${colours.black};">
    <tr>
      <td align="center" style="padding:24px 12px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td><img src="${logoUrl}" width="58" height="58" alt="Merch Tent" style="display:block;width:58px;height:58px;border:0;"></td>
                  <td align="right" style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${colours.lime};">Built for the scene</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid ${colours.border};background:${colours.panel};">
              <div style="height:7px;background:${colours.red};line-height:7px;font-size:7px;">&nbsp;</div>
              <div style="padding:34px;">
                <div style="font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${colours.lime};">${eyebrow}</div>
                <h1 style="margin:9px 0 20px;font-size:34px;line-height:1.05;color:${colours.cream};font-family:Arial Black,Arial,Helvetica,sans-serif;text-transform:uppercase;">${heading}</h1>
                <p style="margin:0;font-size:17px;line-height:1.65;color:${colours.cream};">${copy}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr><td bgcolor="${colours.lime}" style="background:${colours.lime};">
                    <a href="${buttonUrl}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:900;color:${colours.black};text-decoration:none;text-transform:uppercase;">${buttonLabel}</a>
                  </td></tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${colours.muted};">${note}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 12px 0;text-align:center;font-size:12px;line-height:1.6;color:${colours.muted};">
              Merch Tent &nbsp;/&nbsp; Local and unsigned band merch<br>
              <a href="mailto:support@merchtent.com.au" style="color:${colours.cream};">support@merchtent.com.au</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAuthEmailConfig(siteUrl, assetBaseUrl = siteUrl) {
  return {
    mailer_subjects_confirmation: "Confirm your Merch Tent account",
    mailer_templates_confirmation_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "One last step",
      heading: "Join the tent.",
      copy: "Confirm your email address to finish setting up your Merch Tent account.",
      buttonLabel: "Confirm email",
      buttonUrl: "{{ .ConfirmationURL }}",
      note: "You can ignore this email if you did not create a Merch Tent account.",
    }),
    mailer_subjects_recovery: "Reset your Merch Tent password",
    mailer_templates_recovery_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "Account access",
      heading: "Reset your password.",
      copy: "Use the secure link below to choose a new password for your Merch Tent account.",
      buttonLabel: "Reset password",
      buttonUrl: "{{ .ConfirmationURL }}",
      note: "This link expires shortly. If you did not request a reset, no action is needed.",
    }),
    mailer_subjects_email_change: "Confirm your new Merch Tent email",
    mailer_templates_email_change_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "Account update",
      heading: "Confirm the new address.",
      copy: "Confirm this email address to complete the change on your Merch Tent account.",
      buttonLabel: "Confirm new email",
      buttonUrl: "{{ .ConfirmationURL }}",
      note: "If you did not request this change, keep your current email and contact support.",
    }),
    mailer_subjects_magic_link: "Your Merch Tent sign-in link",
    mailer_templates_magic_link_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "Secure sign in",
      heading: "Back inside.",
      copy: "Use this one-time link to sign in to Merch Tent.",
      buttonLabel: "Sign in",
      buttonUrl: "{{ .ConfirmationURL }}",
      note: "This link expires shortly and can only be used once.",
    }),
    mailer_subjects_invite: "You have been invited to Merch Tent",
    mailer_templates_invite_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "You are invited",
      heading: "Come inside.",
      copy: "You have been invited to create a Merch Tent account and join the local music scene.",
      buttonLabel: "Accept invite",
      buttonUrl: "{{ .ConfirmationURL }}",
      note: "This invitation is tied to this email address.",
    }),
    mailer_subjects_reauthentication: "{{ .Token }} is your Merch Tent verification code",
    mailer_templates_reauthentication_content: authEmail({
      siteUrl,
      assetBaseUrl,
      eyebrow: "Security check",
      heading: "Confirm it is you.",
      copy: `Enter this verification code in Merch Tent:<br><strong style="display:block;padding-top:14px;font-size:28px;letter-spacing:4px;color:${colours.lime};">{{ .Token }}</strong>`,
      buttonLabel: "Return to Merch Tent",
      buttonUrl: "{{ .SiteURL }}",
      note: "Never share this code. Merch Tent support will not ask you for it.",
    }),
  };
}
