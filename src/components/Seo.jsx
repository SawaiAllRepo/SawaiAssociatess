// src/components/Seo.jsx
//
// Route-aware SEO: keeps <title>, meta description/keywords, canonical URL,
// Open Graph / Twitter tags and per-route structured data (breadcrumb) in
// sync with the current URL as the user navigates. Mounted once in App.jsx.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  SITE,
  getPageMeta,
  normalizePath,
  humanizeSegment,
} from "../utils/seo";

function setMeta(attr, key, content) {
  const selector =
    attr === "name"
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setRouteJsonLd(json) {
  let el = document.getElementById("route-jsonld");
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "route-jsonld";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

export default function Seo() {
  const location = useLocation();

  useEffect(() => {
    const path = normalizePath(location.pathname);
    const meta = getPageMeta(path);
    const title = meta.title || SITE.title;
    const description = meta.description || SITE.description;
    const canonical = SITE.url + (path === "/" ? "/" : path);

    document.title = title;

    // Plain meta
    setMeta("name", "description", description);
    setMeta("name", "keywords", meta.keywords || SITE.keywords);
    setMeta("name", "robots", "index, follow");

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", SITE.image);
    setMeta("property", "og:site_name", SITE.name);
    setMeta("property", "og:locale", SITE.locale);

    // Twitter / X
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", SITE.image);

    // Canonical
    setCanonical(canonical);

    // Per-route structured data: WebPage + breadcrumbs.
    const segments = path === "/" ? [] : path.split("/").filter(Boolean);
    const crumbs = [{ name: "Home", path: "/" }].concat(
      segments.map((_seg, index, arr) => ({
        name: humanizeSegment(arr[index]),
        path: "/" + arr.slice(0, index + 1).join("/"),
      }))
    );

    setRouteJsonLd({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: canonical,
      description: description,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: SITE.url + crumb.path,
        })),
      },
    });
  }, [location.pathname]);

  return null;
}