BRICKBUILDERS — GLASSMORPHISM WEBSITE

Open this folder in VS Code. Live Server can preview the static page, but it does not run the Vercel email API. Use `npx vercel dev` to test the website and `/api/contact` together.

IMPORTANT LOGO
The original logo image was not included in the assets available to me, so this version uses a clean BB monogram in the header/footer instead of a broken image. If you have the original logo.jpg, place it at:

    images/logo.jpg

Then I can switch the header/footer to use the exact logo artwork.

FIX INCLUDED
The hero heading previously displayed one character per line because the letter-animation spans were inheriting display:block. That CSS conflict has been fixed: each character is now inline-block, while the two heading lines remain block-level.

CONTACT FORM ON VERCEL
The contact form sends to the Vercel function at /api/contact. To enable email delivery, add these environment variables in Vercel Project Settings > Environment Variables, then redeploy:

    SMTP_HOST       Your email provider's SMTP server
    SMTP_PORT       SMTP port, commonly 465 or 587
    SMTP_SECURE     true for port 465; false for port 587
    SMTP_USER       SMTP account username
    SMTP_PASS       SMTP password or provider-specific app password
    CONTACT_EMAIL   Recipient address (currently intended for testing: priyasekar0137@gmail.com)
    SMTP_FROM       Optional sender address; defaults to SMTP_USER

For Gmail SMTP, use smtp.gmail.com, port 465, SMTP_SECURE=true, your Gmail address as SMTP_USER, and a Google App Password as SMTP_PASS. Do not put email passwords in website code or commit them. The API endpoint cannot send mail until the SMTP settings are configured in Vercel.

For local end-to-end testing, link this folder to the Vercel project and pull its development environment variables with `vercel env pull .env.development.local`. The local environment file is ignored by Git.
