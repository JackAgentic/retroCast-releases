import os from 'node:os';
import type { NetworkInterface } from '../../shared/types';

export function getNetworkInterfaces(): NetworkInterface[] {
  const interfaces = os.networkInterfaces();
  const results: NetworkInterface[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push({
          name,
          address: iface.address,
          label: `${name} (${iface.address})`,
        });
      }
    }
  }
  return results;
}

export function getLocalIP(lockedAddress?: string | null): string {
  if (lockedAddress) {
    const all = getNetworkInterfaces();
    if (all.some((i) => i.address === lockedAddress)) {
      return lockedAddress;
    }
    console.warn(`Locked address ${lockedAddress} not found, falling back to auto-detect`);
  }
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}
