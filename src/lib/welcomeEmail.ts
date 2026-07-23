/**
 * The onboarding / welcome email shown as a one-click template in the admin
 * composer AND sent automatically when an agent or colleague is approved.
 *
 * Plain module (no "server-only") so it can be imported by both the client
 * composer component and server-side mailer. The body deliberately omits a
 * sign-off — the send pipeline appends "Best regards, <sender>".
 */
export const WELCOME_EMAIL = {
  subject: "Welcome to AgentSaathi — Getting Started Guide",
  body: `Dear Members,

Welcome to AgentSaathi! We're glad to have you on board. This platform helps you manage your clients, policies, and renewals in one place. Here's how to get started:

1. Sign in — Open the app and sign in with your Google account. Your access will be active once approved by the admin.

2. Explore your dashboard — After signing in, you'll see your clients, policies, and upcoming renewals at a glance.

3. Upload your policies — Go to the Upload section and add your policy documents as PDF files. You can upload a single policy PDF or a bulk "Policy Register" PDF, and the app will automatically read and organize the details for you.

4. Attach a policy PDF by policy number — You can also upload a policy PDF and the app will match it to the right policy using its policy number. Once matched, the document is attached and can be viewed directly from the policy card by tapping "View".

5. Review and manage clients — Check the extracted client and policy details under the Clients section. You can edit any information and add phone numbers to keep records accurate.

6. Send reminders your way:
• Email — For clients with an email address, use the AI Email Assistant to send professional renewal reminders and follow-ups in seconds.
• WhatsApp — For clients with a mobile number, tap the WhatsApp button on the renewal to open a ready-to-send reminder message instantly.

Working with LIC policies?

AgentSaathi has a separate LIC workspace that keeps your LIC business fully independent from your other data. Switch to the LIC workspace from the workspace switcher at the top, then upload and manage your LIC policies there the same way. Your Home and LIC records never mix, so everything stays clean and organized.

If you have any questions or run into any issues, feel free to reach out to us anytime.

We look forward to working with you.`,
} as const;
