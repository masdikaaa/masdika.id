import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

const ORDER_KEY  = 'mega_menu_order';
const BADGES_KEY = 'mega_menu_badges';
const VALID_KEYS = ['events', 'vacancies', 'community', 'blog', 'series'];

const DEV_ORDER_KEY = 'dev_menu_order';
const DEV_BADGES_KEY = 'dev_menu_badges';
const DEV_VALID_KEYS = ['api-hub', 'shortener', 'upload', 'storage', 'vps', 'k3s'];

const COMPANY_ORDER_KEY = 'company_menu_order';
const COMPANY_BADGES_KEY = 'company_menu_badges';
const COMPANY_VALID_KEYS = ['about', 'services', 'portfolio', 'skills'];

function parseJson(val: string | null, fallback: any) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET() {
  try {
    const [orderSetting, badgesSetting, devOrderSetting, devBadgesSetting, companyOrderSetting, companyBadgesSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: ORDER_KEY } }),
      prisma.setting.findUnique({ where: { key: BADGES_KEY } }),
      prisma.setting.findUnique({ where: { key: DEV_ORDER_KEY } }),
      prisma.setting.findUnique({ where: { key: DEV_BADGES_KEY } }),
      prisma.setting.findUnique({ where: { key: COMPANY_ORDER_KEY } }),
      prisma.setting.findUnique({ where: { key: COMPANY_BADGES_KEY } }),
    ]);

    const savedOrder  = parseJson(orderSetting?.value ?? null,  VALID_KEYS);
    const savedBadges = parseJson(badgesSetting?.value ?? null, {});

    const order: string[] = [
      ...savedOrder.filter((k: string) => VALID_KEYS.includes(k)),
      ...VALID_KEYS.filter(k => !savedOrder.includes(k)),
    ];

    const savedDevOrder  = parseJson(devOrderSetting?.value ?? null, DEV_VALID_KEYS);
    const savedDevBadges = parseJson(devBadgesSetting?.value ?? null, {});

    const devOrder: string[] = [
      ...savedDevOrder.filter((k: string) => DEV_VALID_KEYS.includes(k)),
      ...DEV_VALID_KEYS.filter(k => !savedDevOrder.includes(k)),
    ];

    const savedCompanyOrder  = parseJson(companyOrderSetting?.value ?? null, COMPANY_VALID_KEYS);
    const savedCompanyBadges = parseJson(companyBadgesSetting?.value ?? null, {});

    const companyOrder: string[] = [
      ...savedCompanyOrder.filter((k: string) => COMPANY_VALID_KEYS.includes(k)),
      ...COMPANY_VALID_KEYS.filter(k => !savedCompanyOrder.includes(k)),
    ];

    return NextResponse.json({ 
      order, badges: savedBadges,
      devOrder, devBadges: savedDevBadges,
      companyOrder, companyBadges: savedCompanyBadges
    });
  } catch (error) {
    console.error('Error fetching menu config:', error);
    return NextResponse.json({ 
      order: VALID_KEYS, badges: {},
      devOrder: DEV_VALID_KEYS, devBadges: {},
      companyOrder: COMPANY_VALID_KEYS, companyBadges: {}
    });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { order, badges, devOrder, devBadges, companyOrder, companyBadges } = await req.json();

    // Validate Explore Menu
    if (order !== undefined) {
      if (!Array.isArray(order) || !order.every(k => typeof k === 'string' && VALID_KEYS.includes(k))) {
        return NextResponse.json({ error: 'Invalid explore menu order' }, { status: 400 });
      }
      if (badges !== undefined && (typeof badges !== 'object' || Array.isArray(badges))) {
        return NextResponse.json({ error: 'Invalid explore badges' }, { status: 400 });
      }
      if (badges) {
        for (const [k, v] of Object.entries(badges)) {
          if (!VALID_KEYS.includes(k)) return NextResponse.json({ error: `Invalid key: ${k}` }, { status: 400 });
          if (v !== null && v !== false && (typeof v !== 'string' || (v as string).length > 20)) {
            return NextResponse.json({ error: `Invalid badge value for ${k}` }, { status: 400 });
          }
        }
      }
    }

    // Validate Developers Menu
    if (devOrder !== undefined) {
      if (!Array.isArray(devOrder) || !devOrder.every(k => typeof k === 'string' && DEV_VALID_KEYS.includes(k))) {
        return NextResponse.json({ error: 'Invalid developers menu order' }, { status: 400 });
      }
      if (devBadges !== undefined && (typeof devBadges !== 'object' || Array.isArray(devBadges))) {
        return NextResponse.json({ error: 'Invalid developers badges' }, { status: 400 });
      }
      if (devBadges) {
        for (const [k, v] of Object.entries(devBadges)) {
          if (!DEV_VALID_KEYS.includes(k)) return NextResponse.json({ error: `Invalid key: ${k}` }, { status: 400 });
          if (v !== null && v !== false && (typeof v !== 'string' || (v as string).length > 20)) {
            return NextResponse.json({ error: `Invalid badge value for ${k}` }, { status: 400 });
          }
        }
      }
    }
    // Validate Company Menu
    if (companyOrder !== undefined) {
      if (!Array.isArray(companyOrder) || !companyOrder.every(k => typeof k === 'string' && COMPANY_VALID_KEYS.includes(k))) {
        return NextResponse.json({ error: 'Invalid company menu order' }, { status: 400 });
      }
      if (companyBadges !== undefined && (typeof companyBadges !== 'object' || Array.isArray(companyBadges))) {
        return NextResponse.json({ error: 'Invalid company badges' }, { status: 400 });
      }
      if (companyBadges) {
        for (const [k, v] of Object.entries(companyBadges)) {
          if (!COMPANY_VALID_KEYS.includes(k)) return NextResponse.json({ error: `Invalid key: ${k}` }, { status: 400 });
          if (v !== null && v !== false && (typeof v !== 'string' || (v as string).length > 20)) {
            return NextResponse.json({ error: `Invalid badge value for ${k}` }, { status: 400 });
          }
        }
      }
    }

    const updates = [];
    if (order !== undefined) {
      updates.push(prisma.setting.upsert({
        where: { key: ORDER_KEY },
        update: { value: JSON.stringify(order) },
        create: { key: ORDER_KEY, value: JSON.stringify(order) },
      }));
      updates.push(prisma.setting.upsert({
        where: { key: BADGES_KEY },
        update: { value: JSON.stringify(badges ?? {}) },
        create: { key: BADGES_KEY, value: JSON.stringify(badges ?? {}) },
      }));
    }

    if (devOrder !== undefined) {
      updates.push(prisma.setting.upsert({
        where: { key: DEV_ORDER_KEY },
        update: { value: JSON.stringify(devOrder) },
        create: { key: DEV_ORDER_KEY, value: JSON.stringify(devOrder) },
      }));
      updates.push(prisma.setting.upsert({
        where: { key: DEV_BADGES_KEY },
        update: { value: JSON.stringify(devBadges ?? {}) },
        create: { key: DEV_BADGES_KEY, value: JSON.stringify(devBadges ?? {}) },
      }));
    }

    if (companyOrder !== undefined) {
      updates.push(prisma.setting.upsert({
        where: { key: COMPANY_ORDER_KEY },
        update: { value: JSON.stringify(companyOrder) },
        create: { key: COMPANY_ORDER_KEY, value: JSON.stringify(companyOrder) },
      }));
      updates.push(prisma.setting.upsert({
        where: { key: COMPANY_BADGES_KEY },
        update: { value: JSON.stringify(companyBadges ?? {}) },
        create: { key: COMPANY_BADGES_KEY, value: JSON.stringify(companyBadges ?? {}) },
      }));
    }

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving menu config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
