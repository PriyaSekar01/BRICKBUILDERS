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
    CONTACT_EMAIL   Recipient address (BRICKBUILDERS inbox)
    SMTP_FROM       Optional sender address; defaults to SMTP_USER

For Gmail SMTP, use smtp.gmail.com, port 465, SMTP_SECURE=true, your Gmail address as SMTP_USER, and a Google App Password as SMTP_PASS. Do not put email passwords in website code or commit them. The API endpoint cannot send mail until the SMTP settings are configured in Vercel.

For local end-to-end testing, link this folder to the Vercel project and pull its development environment variables with `vercel env pull .env.development.local`. The local environment file is ignored by Git.

PRIVATE PROJECT UPLOADS
After deploying the project, open /admin.html on the website to sign in and add projects. Uploaded photos are public because they appear in the public project gallery; only the upload controls and API are password-protected.

Create a Vercel Blob store for the project:

    1. Open the Vercel project's Storage tab and create a Blob store.
    2. Choose Public access, since visitors need to load the project photos.
    3. Connect the store to this project and enable Production (and Preview/Development if needed).
    4. Vercel adds BLOB_READ_WRITE_TOKEN to the selected environment(s).

Add these two Secret environment variables in Vercel:

    ADMIN_PASSWORD         A private password with at least 8 characters (longer is safer)
    ADMIN_SESSION_SECRET   A separate random secret with at least 32 characters

Generate separate random values locally with `openssl rand -base64 32`. Save ADMIN_PASSWORD in a password manager so it can be used to sign in at /admin.html. Never put either secret in website code or chat. Redeploy after adding environment variables.

The admin page supports up to 12 slides per project. Projects 1–4 start from the existing website images/videos and are loaded into the same editable project list as uploads. In "Manage existing projects", select a project to rename it, add JPEG/PNG/WebP photos, delete a slide, or delete the entire project. Deleting an existing project keeps it deleted across deployments. Unused uploaded Blob images are cleaned up in the background; deployed static media is removed from the gallery but remains in deployment files. Images are resized in the browser when needed. The homepage loads every project from the project API.
