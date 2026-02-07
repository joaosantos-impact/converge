import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://converge.pt';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamic blog posts — fetch from API
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/api/blog`);
    if (res.ok) {
      const posts: Array<{ slug: string; updatedAt?: string; createdAt?: string }> = await res.json();
      blogPages = posts.map((post: { slug: string; updatedAt?: string; createdAt?: string }) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt || post.createdAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // API not available at build time — skip dynamic routes
  }

  return [...staticPages, ...blogPages];
}
