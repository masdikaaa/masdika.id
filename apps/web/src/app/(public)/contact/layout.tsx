import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCachedData } from '@/lib/cache';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.masdika.id';

async function getContactSettings() {
  const [descSetting, emailSetting, phoneSetting, locationSetting] = await Promise.all([
    getCachedData('setting:meta_description_contact', 3600, () =>
      prisma.setting.findUnique({ where: { key: 'meta_description_contact' } })
    ),
    getCachedData('setting:contact_email', 3600, () =>
      prisma.setting.findUnique({ where: { key: 'contact_email' } })
    ),
    getCachedData('setting:contact_phone', 3600, () =>
      prisma.setting.findUnique({ where: { key: 'contact_phone' } })
    ),
    getCachedData('setting:contact_location', 3600, () =>
      prisma.setting.findUnique({ where: { key: 'contact_location' } })
    ),
  ]);

  const description =
    descSetting?.value?.trim() ||
    "Get in touch with Masdika for collaborations, technical consulting, or project inquiries. Let's build scalable systems together.";
  const contactEmail = emailSetting?.value?.trim() || process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'me@masdika.id';
  const contactPhone = phoneSetting?.value?.trim() || '+62 823 3162 3374';
  const contactLocation = locationSetting?.value?.trim() || 'Sidoarjo, Jawa Timur, Indonesia';

  return { description, contactEmail, contactPhone, contactLocation };
}

export async function generateMetadata(): Promise<Metadata> {
  const { description } = await getContactSettings();
  const title = 'Contact';

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: `${siteUrl}/contact`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/contact`,
      siteName: 'Masdika',
      images: ['/images/brand/og-image.webp'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/brand/og-image.webp'],
    },
  };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { description, contactEmail, contactPhone } = await getContactSettings();

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${siteUrl}/contact#webpage`,
    url: `${siteUrl}/contact`,
    name: 'Contact',
    description,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Masdika',
      url: siteUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Contact',
          item: `${siteUrl}/contact`,
        },
      ],
    },
    mainEntity: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Masdika',
      url: siteUrl,
      logo: `${siteUrl}/favicon.ico`,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: contactPhone,
          contactType: 'customer service',
          email: contactEmail,
          areaServed: 'ID',
          availableLanguage: ['Indonesian', 'English'],
        },
        {
          '@type': 'ContactPoint',
          telephone: contactPhone,
          contactType: 'technical support',
          email: contactEmail,
          areaServed: 'ID',
          availableLanguage: ['Indonesian', 'English'],
        },
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Sidoarjo',
        addressRegion: 'Jawa Timur',
        addressCountry: 'ID',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactSchema),
        }}
      />
      {children}
    </>
  );
}
