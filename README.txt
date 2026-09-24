BRICKBUILDERS — GLASSMORPHISM WEBSITE

Open this folder in VS Code and run index.html with Live Server.

IMPORTANT LOGO
The original logo image was not included in the assets available to me, so this version uses a clean BB monogram in the header/footer instead of a broken image. If you have the original logo.jpg, place it at:

    images/logo.jpg

Then I can switch the header/footer to use the exact logo artwork.

FIX INCLUDED
The hero heading previously displayed one character per line because the letter-animation spans were inheriting display:block. That CSS conflict has been fixed: each character is now inline-block, while the two heading lines remain block-level.
