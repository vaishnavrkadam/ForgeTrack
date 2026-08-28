import { BadRequestException } from '@nestjs/common';
import * as url from 'url';

export class SsrfValidator {
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS/cloud metadata service
    'metadata.google.internal', // GCP metadata service
  ]);

  /**
   * Validate that a target URL is safe and does not target internal / private subnets
   */
  static validateUrl(targetUrl: string): boolean {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new BadRequestException('Target URL is missing or invalid');
    }

    let parsed: url.UrlWithStringQuery;
    try {
      parsed = url.parse(targetUrl);
    } catch {
      throw new BadRequestException('Malformed URL structure');
    }

    if (!parsed.protocol || !['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
      throw new BadRequestException('Only HTTP and HTTPS protocols are allowed');
    }

    const hostname = (parsed.hostname || '').toLowerCase();
    if (!hostname) {
      throw new BadRequestException('URL hostname is required');
    }

    // Check exact blocked hosts
    if (this.BLOCKED_HOSTNAMES.has(hostname)) {
      throw new BadRequestException(`Access to host "${hostname}" is blocked for security`);
    }

    // Check IPv4 private IP ranges
    if (this.isPrivateIp(hostname)) {
      throw new BadRequestException(`Target address "${hostname}" resolves to a private network space`);
    }

    return true;
  }

  /**
   * Check if an IP address belongs to RFC 1918 / Loopback / Link-Local ranges
   */
  static isPrivateIp(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 0.0.0.0/8
    if (parts[0] === 0) return true;

    return false;
  }
}
