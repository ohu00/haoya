const fs = require('fs');
const path = require('path');

const indexPath = path.join('/usr/share/nginx/html', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`Error: File not found at ${indexPath}`);
  return;
}

let indexContent = fs.readFileSync(indexPath, 'utf8');

if (process.env.ENVIRONMENT === 'production') {
  const metatags = `
  <meta name="robots" content="index, follow">
  <meta name="author" content="MAZANOKE">

  <meta property="og:title" content="MAZANOKE | Online Image Optimizer That Runs Privately in Your Browser">
  <meta property="og:description" content="Optimize images locally and privately by converting and compressing them offline in your browser. Supports JPG, PNG, WebP, HEIC, AVIF, GIF, SVG.">
  <meta property="og:url" content="https://www.mazanoke.com">
  <meta property="og:image" content="https://mazanoke.com/assets/images/og-image.jpg">
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MAZANOKE | Online Image Optimizer That Runs Privately in Your Browser">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="MAZANOKE | Online Image Optimizer That Runs Privately in Your Browser">
  <meta name="twitter:description" content="Optimize images locally and privately by converting and compressing them offline in your browser. Supports JPG, PNG, WebP, HEIC, AVIF, GIF, SVG.">
  <meta name="twitter:image" content="https://mazanoke.com/assets/images/og-image.jpg">

  <link rel="canonical" href="https://www.mazanoke.com">
  
  <meta name="keywords" content="online image optimizer, image compression, local image processing, offline image optimizer, private image optimizer, convert svg, convert heic, convert png, convert jpg, convert gif">
  `;
  indexContent = indexContent.replace('<meta name="robots" content="noindex, nofollow">', metatags);
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
