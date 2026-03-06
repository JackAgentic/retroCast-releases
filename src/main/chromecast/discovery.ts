import { Bonjour } from 'bonjour-service';
import type { ChromecastDevice } from '../../shared/types';

export class DeviceDiscovery {
  private bonjour: Bonjour;
  private devices: Map<string, ChromecastDevice> = new Map();
  private browser: ReturnType<Bonjour['find']> | null = null;
  private onChange: (devices: ChromecastDevice[]) => void;

  constructor(onChange: (devices: ChromecastDevice[]) => void) {
    this.bonjour = new Bonjour();
    this.onChange = onChange;
  }

  start() {
    this.browser = this.bonjour.find({ type: 'googlecast' }, (service) => {
      const txt = service.txt as Record<string, string> | undefined;
      const device: ChromecastDevice = {
        id: txt?.id || service.name,
        name: txt?.fn || service.name,
        host: service.addresses?.[0] || service.host,
        port: service.port,
      };
      this.devices.set(device.id, device);
      this.onChange(Array.from(this.devices.values()));
    });
  }

  stop() {
    this.browser?.stop();
    this.bonjour.destroy();
  }

  getDevices(): ChromecastDevice[] {
    return Array.from(this.devices.values());
  }
}
