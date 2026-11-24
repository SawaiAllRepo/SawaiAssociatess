// src/utils/seo.js
//
// Single source of truth for on-page SEO: site-wide metadata plus a per-route
// map of <title>/<meta description> consumed by <Seo /> (components/Seo.jsx).
//
// This is a client-rendered SPA, so the tags are applied on route change; the
// static defaults in index.html cover the first paint and non-JS crawlers.

import { CONTACT } from "../data/contact";

export const SITE = {
  name: CONTACT.brand,
  // Production origin — update if the custom domain ever changes.
  url: "https://www.sawaiassociates.com",
  title: "Sawai Associates | Real Estate, Insurance & IT Services in Pune",
  description:
    "Sawai Associates, Karve Nagar Pune — trusted real estate, insurance and IT services. Call +91 7774880776 or chat with us on WhatsApp.",
  keywords:
    "Sawai Associates, Pravin Sonwane, software developer, web development, real estate Pune, insurance Pune, IT services, Karve Nagar Pune",
  locale: "en_IN",
  image: "https://www.sawaiassociates.com/og-image.png",
};

// Keyed by the exact route path. Key order follows the navigation hierarchy.
export const PAGE_META = {
  "/": {
    title: "Sawai Associates | Real Estate, Insurance & IT Services in Pune",
    description:
      "Sawai Associates, Karve Nagar Pune — trusted real estate, insurance and IT services. Call +91 7774880776 or chat with us on WhatsApp.",
  },
  "/about": {
    title: "About Sawai Associates | Real Estate, Insurance & IT in Pune",
    description:
      "Meet the Sawai Associates team — real estate, insurance and IT expertise in Pune. Founder Amit Sawai's vision: trust, transparency and complete solutions.",
  },
  "/contact": {
    title: "Contact Sawai Associates | Real Estate, Insurance & IT — Pune",
    description:
      "Contact Sawai Associates in Karve Nagar, Pune. Call +91 72760 63476, email info@sawaiassociates.com or WhatsApp us for real estate, insurance and IT services.",
  },
  "/insurance": {
    title: "Insurance Services in Pune | Sawai Associates",
    description:
      "Life, health, motor and business insurance guidance in Pune. Compare coverage, get expert advice and protect what matters — with Sawai Associates.",
  },
  "/insurance/life-insurance": {
    title: "Life Insurance Plans in Pune | Sawai Associates",
    description:
      "Secure your family's future with the right life insurance plan. Expert guidance on term, endowment and ULIP plans in Pune — Sawai Associates.",
  },
  "/insurance/health-insurance": {
    title: "Health Insurance in Pune | Sawai Associates",
    description:
      "Health insurance plans for individuals and families in Pune. Affordable coverage, cashless claim support and expert guidance — Sawai Associates.",
  },
  "/insurance/motor-insurance": {
    title: "Motor Insurance in Pune | Car & Bike | Sawai Associates",
    description:
      "Car and two-wheeler insurance in Pune — third party and comprehensive covers, renewals and claims support. Trusted advice from Sawai Associates.",
  },
  "/insurance/business-insurance": {
    title: "Business Insurance in Pune for Companies | Sawai Associates",
    description:
      "Business insurance in Pune: fire, marine, liability, group covers and more. Protect your company with practical guidance from Sawai Associates.",
  },
  "/real-estate": {
    title: "Real Estate Services in Pune | Buy, Rent & Sell | Sawai Associates",
    description:
      "Real estate services in Pune: residential, commercial, plots and villas. Buy, sell, rent or invest with trusted guidance from Sawai Associates, Karve Nagar.",
  },
  "/it-services": {
    title: "IT Services in Pune | Software, AI & Cloud | Sawai Associates",
    description:
      "IT services in Pune: web development, mobile apps, custom software, AI, cloud and DevOps. Practical technology solutions from Sawai Associates.",
  },
  "/it-services/web-development": {
    title: "Web Development Services in Pune | Sawai Associates",
    description:
      "Professional website design and development in Pune. Responsive, fast and SEO-friendly websites built to grow your business — Sawai Associates.",
  },
  "/it-services/mobile-app-development": {
    title: "Mobile App Development in Pune | Sawai Associates",
    description:
      "Android and iOS app development in Pune. Custom mobile apps designed around your users and business goals — Sawai Associates.",
  },
  "/it-services/software-solutions": {
    title: "Custom Software Solutions in Pune | Sawai Associates",
    description:
      "Custom software development in Pune: enterprise applications, integrations and automation tailored to your business — Sawai Associates.",
  },
  "/it-services/it-consultancy": {
    title: "IT Consultancy Services in Pune | Sawai Associates",
    description:
      "IT consultancy in Pune: technology roadmap, architecture and digital transformation guidance for growing businesses — Sawai Associates.",
  },
};

/** Normalise a location.pathname to the keys used in PAGE_META. */
export function normalizePath(pathname) {
  if (pathname === "/") return "/";
  const clean = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return clean || "/";
}

/** Resolve page metadata for any pathname, falling back to the homepage. */
export function getPageMeta(pathname) {
  const path = normalizePath(pathname);
  return PAGE_META[path] || { title: SITE.title, description: SITE.description };
}

/** "life-insurance" -> "Life Insurance" (used for breadcrumbs). */
export function humanizeSegment(segment) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
