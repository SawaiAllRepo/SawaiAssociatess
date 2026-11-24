# Sawai Associates SEO deployment checklist

Production domain: `https://www.sawaiassociates.com/`

## Build and deploy

1. Run `npm ci` and `npm run build`. The build generates a `dist` folder with static HTML for all 14 sitemap pages, each with its own title, description, canonical URL, social tags, structured data and visible page content.
2. For Netlify Drop, deploy the **contents of `dist`**. For Netlify Git builds, use `npm run build` and publish directory `dist`. The included `_redirects` maps routes to their generated HTML and retains the SPA fallback.
3. For Vercel, deploy the project root; the included `vercel.json` uses `npm run build` and `dist`.
4. Point the custom domain to the deployment. Set `www.sawaiassociates.com` as the primary domain and configure the host's permanent redirect from the bare domain to `www` (or change all canonical URLs consistently if you choose the bare domain). Use HTTPS.
5. Open `/`, `/about`, `/real-estate`, `/insurance`, and `/it-services` directly in a private browser window. View page source for an inner page and confirm its unique title, canonical URL and visible page content. Check `/robots.txt`, `/sitemap.xml`, `/favicon-48.png` and `/favicon.ico` return successfully.

## Search engines after the site is live

1. Verify the domain in Google Search Console. Submit `https://www.sawaiassociates.com/sitemap.xml`, use URL Inspection on key pages, and monitor indexing/errors.
2. Verify the site in Bing Webmaster Tools and submit the same sitemap. Bing is relevant to searches performed with Microsoft Edge when Bing is selected.
3. Keep the Sawai Associates Google Business Profile accurate for local Pune searches, including address, hours, categories, photos and the website URL.
4. Keep service pages useful and current. Add genuine project/service details, helpful answers and legitimate references to the website over time. Search position varies by query, location and competition; deployment and metadata cannot guarantee the first result.

The existing website header/footer logo is unchanged. The SEO favicon uses `public/company-logo.png` (the supplied SA icon). Run `powershell -ExecutionPolicy Bypass -File scripts\generate-seo-assets.ps1` on Windows if these SEO images need regeneration. The script does not modify the header/footer logo.
