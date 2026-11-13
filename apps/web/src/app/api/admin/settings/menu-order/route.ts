import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

const ORDER_KEY  = 'mega_menu_order';
const BADGES_KEY = 'mega_menu_badges';
const VALID_KEYS = ['events', 'vacancies', 'community', 'blog', 'series'];

const DEV_ORDER_KEY = 'dev_menu_order';
const DEV_BADGES_KEY = 'dev_menu_badges';
const DEV_VALID_KEYS = ['api-hub', 'reseller-api', 'upload', 'vps', 'app-catalog', 'managed-db', 'k3s'];

const COMPANY_ORDER_KEY = 'company_menu_order';
const COMPANY_BADGES_KEY = 'company_menu_badges';
const COMPANY_VALID_KEYS = ['about', 'services', 'portfolio', 'skills'];

function parseJson(val: string | null, fallback: any) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'Cannot modify menu order during impersonation.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { order, badges, devOrder, devBadges, companyOrder, companyBadges } = body;

    const updates = [];

    // 1. Explore Menu
    if (order !== undefined || badges !== undefined) {
      const cleanOrder = Array.isArray(order)
        ? [
            ...order.filter((k): k is string => typeof k === 'string' && VALID_KEYS.includes(k)),
            ...VALID_KEYS.filter(k => !order.includes(k)),
          ]
        : VALID_KEYS;

      const cleanBadges: Record<string, string | false> = {};
      if (badges && typeof badges === 'object' && !Array.isArray(badges)) {
        for (const [k, v] of Object.entries(badges)) {
          if (VALID_KEYS.includes(k)) {
            if (v === false || v === null || v === '') {
              cleanBadges[k] = false;
            } else if (typeof v === 'string') {
              cleanBadges[k] = v.trim().slice(0, 20);
            }
          }
        }
      }

      updates.push(
        prisma.setting.upsert({
          where: { key: ORDER_KEY },
          update: { value: JSON.stringify(cleanOrder) },
          create: { key: ORDER_KEY, value: JSON.stringify(cleanOrder) },
        }),
        prisma.setting.upsert({
          where: { key: BADGES_KEY },
          update: { value: JSON.stringify(cleanBadges) },
          create: { key: BADGES_KEY, value: JSON.stringify(cleanBadges) },
        })
      );
    }

    // 2. Developers Menu
    if (devOrder !== undefined || devBadges !== undefined) {
      const cleanDevOrder = Array.isArray(devOrder)
        ? [
            ...devOrder.filter((k): k is string => typeof k === 'string' && DEV_VALID_KEYS.includes(k)),
            ...DEV_VALID_KEYS.filter(k => !devOrder.includes(k)),
          ]
        : DEV_VALID_KEYS;

      const cleanDevBadges: Record<string, string | false> = {};
      if (devBadges && typeof devBadges === 'object' && !Array.isArray(devBadges)) {
        for (const [k, v] of Object.entries(devBadges)) {
          if (DEV_VALID_KEYS.includes(k)) {
            if (v === false || v === null || v === '') {
              cleanDevBadges[k] = false;
            } else if (typeof v === 'string') {
              cleanDevBadges[k] = v.trim().slice(0, 20);
            }
          }
        }
      }

      updates.push(
        prisma.setting.upsert({
          where: { key: DEV_ORDER_KEY },
          update: { value: JSON.stringify(cleanDevOrder) },
          create: { key: DEV_ORDER_KEY, value: JSON.stringify(cleanDevOrder) },
        }),
        prisma.setting.upsert({
          where: { key: DEV_BADGES_KEY },
          update: { value: JSON.stringify(cleanDevBadges) },
          create: { key: DEV_BADGES_KEY, value: JSON.stringify(cleanDevBadges) },
        })
      );
    }

    // 3. Company Menu
    if (companyOrder !== undefined || companyBadges !== undefined) {
      const cleanCompanyOrder = Array.isArray(companyOrder)
        ? [
            ...companyOrder.filter((k): k is string => typeof k === 'string' && COMPANY_VALID_KEYS.includes(k)),
            ...COMPANY_VALID_KEYS.filter(k => !companyOrder.includes(k)),
          ]
        : COMPANY_VALID_KEYS;

      const cleanCompanyBadges: Record<string, string | false> = {};
      if (companyBadges && typeof companyBadges === 'object' && !Array.isArray(companyBadges)) {
        for (const [k, v] of Object.entries(companyBadges)) {
          if (COMPANY_VALID_KEYS.includes(k)) {
            if (v === false || v === null || v === '') {
              cleanCompanyBadges[k] = false;
            } else if (typeof v === 'string') {
              cleanCompanyBadges[k] = v.trim().slice(0, 20);
            }
          }
        }
      }

      updates.push(
        prisma.setting.upsert({
          where: { key: COMPANY_ORDER_KEY },
          update: { value: JSON.stringify(cleanCompanyOrder) },
          create: { key: COMPANY_ORDER_KEY, value: JSON.stringify(cleanCompanyOrder) },
        }),
        prisma.setting.upsert({
          where: { key: COMPANY_BADGES_KEY },
          update: { value: JSON.stringify(cleanCompanyBadges) },
          create: { key: COMPANY_BADGES_KEY, value: JSON.stringify(cleanCompanyBadges) },
        })
      );
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving menu config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
