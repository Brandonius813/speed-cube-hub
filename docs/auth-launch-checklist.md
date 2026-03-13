# Auth Launch Checklist

This app-side auth hardening is only half of the launch work. For real signup traffic, Supabase Auth must also be configured correctly.

## 1. Supabase Auth Email Setup

- Turn on custom SMTP in Supabase Auth.
- Use Resend SMTP credentials from a verified sending domain.
- Keep email confirmation enabled.
- Keep `mailer_autoconfirm = false`.
- Set the sender name and sender address to the production brand/domain you want users to see.
- Disable link tracking / click rewriting in the email provider for auth emails.

## 2. Supabase Auth Redirect Settings

Set the Auth site URL and redirect URLs to include:

- `https://www.speedcubehub.com`
- `https://speedcubehub.com` if the apex is used during auth flows
- local development URLs like `http://127.0.0.1:3000`
- the app callback routes:
  - `/api/auth/callback`
  - `/auth/confirm`

## 3. Capacity and Rate Limits

Default Supabase email limits are too low for launch traffic. Before launch:

- raise email throughput high enough for at least 300 signups in 15 minutes
- include safety headroom for resend-confirmation and password-reset traffic
- confirm both Supabase Auth and Resend account limits can handle the launch window
- contact Supabase support before launch if dashboard settings alone do not provide enough capacity

## 4. Staging Verification

Before launch, run this exact flow in staging:

1. Sign up with email/password.
2. Receive the confirmation email.
3. Click the confirmation link and verify the user lands back in the app already logged in.
4. Log out and log back in with email/password.
5. Use Google signup and confirm the profile/onboarding rows exist.
6. Trigger forgot-password, receive the reset email, and successfully save a new password.
7. Retry a previously failed confirmation link and confirm the app shows a clear recovery path.

## 5. Burst Test

Run a controlled burst test before launch:

- target at least 300 signups in 15 minutes
- monitor Supabase Auth logs
- monitor Resend delivery, bounces, and deferrals
- verify no orphaned auth users
- verify every created auth user also has `profiles` and `user_onboarding` rows
