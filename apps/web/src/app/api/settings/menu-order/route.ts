import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_KEYS = ['events', 'vacancies', 'community', 'blog', 'series'];
const DEV_VALID_KEYS = ['api-hub', 'shortener', 'upload', 'storage', 'vps', 'k3s'];
const COMPANY_VALID_KEYS = ['about', 'services', 'portfolio', 'skills'];

function parseJson(val: string | null, fallback: any) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET() {
  try {
    const [orderSetting, badgesSetting, devOrderSetting, devBadgesSetting, companyOrderSetting, companyBadgesSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'mega_menu_order' } }),
      prisma.setting.findUnique({ where: { key: 'mega_menu_badges' } }),
      prisma.setting.findUnique({ where: { key: 'dev_menu_order' } }),
      prisma.setting.findUnique({ where: { key: 'dev_menu_badges' } }),
      prisma.setting.findUnique({ where: { key: 'company_menu_order' } }),
      prisma.setting.findUnique({ where: { key: 'company_menu_badges' } }),
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
  } catch {
    return NextResponse.json({ 
      order: VALID_KEYS, badges: {},
      devOrder: DEV_VALID_KEYS, devBadges: {},
      companyOrder: COMPANY_VALID_KEYS, companyBadges: {}
    });
  }
}
