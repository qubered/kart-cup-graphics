import os from 'node:os'

export function lanUrls(port: number): string[] {
  const urls = [`http://${os.hostname()}.local:${port}`]
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}`)
    }
  }
  return urls
}
