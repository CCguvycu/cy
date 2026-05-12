import { useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const DISCOVERY_TIMEOUT_MS = 1500;
const SCAN_PORT = 8000;
// Scan these common LAN subnets
const SCAN_HOSTS = 30; // scan .1 to .30 per subnet

interface DiscoveredServer {
  url: string;
  ip: string;
  hostname?: string;
  tailscale?: string;
}

async function probeHost(ip: string, port: number): Promise<DiscoveredServer | null> {
  const url = `http://${ip}:${port}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

    const res = await fetch(`${url}/api/system/discovery`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.service === 'VoidLink') {
        return {
          url,
          ip,
          hostname: data.hostname,
          tailscale: data.tailscale_hostname,
        };
      }
    }
  } catch {
    // Host not reachable
  }
  return null;
}

function getSubnetBase(myIp: string): string {
  // e.g. "192.168.1.5" -> "192.168.1."
  const parts = myIp.split('.');
  return parts.slice(0, 3).join('.') + '.';
}

export function useServerDiscovery() {
  const [discovering, setDiscovering] = useState(false);
  const [servers, setServers] = useState<DiscoveredServer[]>([]);

  const discover = useCallback(async (): Promise<DiscoveredServer[]> => {
    setDiscovering(true);
    setServers([]);

    const found: DiscoveredServer[] = [];

    try {
      // Always check localhost first (same device)
      const localResult = await probeHost('127.0.0.1', SCAN_PORT);
      if (localResult) {
        found.push(localResult);
        setServers([...found]);
      }

      // Get network info to determine subnet
      const netInfo = await NetInfo.fetch();
      const myIp = (netInfo.details as any)?.ipAddress as string | undefined;

      if (myIp && myIp !== '127.0.0.1') {
        const subnet = getSubnetBase(myIp);

        // Build probe list: .1 to .SCAN_HOSTS, excluding self
        const probes: Promise<DiscoveredServer | null>[] = [];
        for (let i = 1; i <= SCAN_HOSTS; i++) {
          const host = `${subnet}${i}`;
          if (host === myIp) continue;
          probes.push(probeHost(host, SCAN_PORT));
        }

        // Run in parallel batches of 10
        const BATCH = 10;
        for (let i = 0; i < probes.length; i += BATCH) {
          const batch = probes.slice(i, i + BATCH);
          const results = await Promise.all(batch);
          for (const r of results) {
            if (r && !found.some((f) => f.url === r.url)) {
              found.push(r);
              setServers([...found]);
            }
          }
        }
      }
    } catch (e) {
      // Network unavailable — no-op
    } finally {
      setDiscovering(false);
    }

    return found;
  }, []);

  return { discover, discovering, servers };
}
