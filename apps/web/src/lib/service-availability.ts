import { prisma } from './prisma';

export type ServiceSettingKey =
  | 'vps_enabled'
  | 'database_enabled'
  | 'managed_app_enabled'
  | 'cdn_enabled'
  | 'object_storage_enabled'
  | 'ai_gateway_enabled'
  | 'reserved_ip_enabled'
  | 'vpc_enabled'
  | 'app_platform_enabled';

export const SERVICE_SETTING_KEYS: readonly ServiceSettingKey[] = [
  'vps_enabled',
  'database_enabled',
  'managed_app_enabled',
  'cdn_enabled',
  'object_storage_enabled',
  'ai_gateway_enabled',
  'reserved_ip_enabled',
  'vpc_enabled',
  'app_platform_enabled',
] as const;

export async function isServiceEnabled(key: ServiceSettingKey): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value !== 'false';
  } catch {
    return true;
  }
}
