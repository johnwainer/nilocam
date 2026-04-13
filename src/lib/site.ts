export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://nilo-cam.vercel.app"
  );
}

export function buildEventUrl(slug: string) {
  return `${getSiteUrl()}/e/${slug}`;
}

