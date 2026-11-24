// Build static, route-specific HTML so search crawlers see the actual page
// content and metadata before they execute the React application.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

process.env.NODE_ENV = "production";
const [{ createServer }, React, { renderToString }, { MemoryRouter }] =
  await Promise.all([
    import("vite"),
    import("react"),
    import("react-dom/server"),
    import("react-router-dom"),
  ]);

const dist = join(process.cwd(), "dist");
const template = await readFile(join(dist, "index.html"), "utf8");
const manifest = JSON.parse(await readFile(join(dist, ".vite/manifest.json"), "utf8"));
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

function changeTag(html, expression, replacement, name) {
  if (!expression.test(html)) throw new Error(`Missing ${name} in built index.html`);
  return html.replace(expression, replacement);
}

try {
  const [{ default: App }, { SITE, PAGE_META, humanizeSegment }] =
    await Promise.all([
      server.ssrLoadModule("/src/App.jsx"),
      server.ssrLoadModule("/src/utils/seo.js"),
    ]);

  for (const [path, meta] of Object.entries(PAGE_META)) {
    const url = SITE.url + path;
    const title = escapeHtml(meta.title);
    const description = escapeHtml(meta.description);
    const segments = path.split("/").filter(Boolean);
    const crumbs = [{ name: "Home", item: `${SITE.url}/` }].concat(
      segments.map((segment, index) => ({
        name: humanizeSegment(segment),
        item: `${SITE.url}/${segments.slice(0, index + 1).join("/")}`,
      }))
    );

    let html = template;
    html = changeTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, "title");
    html = changeTag(html, /<meta name="description"[^>]*>/,
      `<meta name="description" content="${description}" />`, "description");
    html = changeTag(html, /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${escapeHtml(url)}" />`, "canonical");
    for (const [property, value] of [
      ["og:title", title], ["og:description", description], ["og:url", escapeHtml(url)],
    ]) {
      html = changeTag(html, new RegExp(`<meta property="${property}"[^>]*>`),
        `<meta property="${property}" content="${value}" />`, property);
    }
    for (const [name, value] of [
      ["twitter:title", title], ["twitter:description", description],
    ]) {
      html = changeTag(html, new RegExp(`<meta name="${name}"[^>]*>`),
        `<meta name="${name}" content="${value}" />`, name);
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: meta.title,
      url,
      description: meta.description,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map(({ name, item }, index) => ({
          "@type": "ListItem", position: index + 1, name, item,
        })),
      },
    };
    html = html.replace("</head>",
      `<script id="route-jsonld" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n  </head>`);

    let content = renderToString(React.createElement(MemoryRouter,
      { initialEntries: [path] }, React.createElement(App)));
    // Vite's SSR module loader resolves image imports to source URLs. Map
    // those URLs to the hashed production assets emitted by the client build.
    content = content.replace(/\/src\/assets\/([^"'\s)]+\.(?:png|jpe?g|svg|webp))/g, (url, relative) => {
      const entry = manifest[`src/assets/${relative}`];
      if (!entry?.file) throw new Error(`No built asset for ${url}`);
      return `/${entry.file}`;
    });
    html = changeTag(html, /<div id="root"><\/div>/,
      `<div id="root">${content}</div>`, "React root");

    const output = path === "/" ? join(dist, "index.html") : join(dist, `${path}.html`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, html);
    console.log(`Prerendered ${path}`);
  }
} finally {
  await server.close();
}
