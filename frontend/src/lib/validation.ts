// ============================================================
// validation.ts — client-side mirrors of the contracts' input checks
//
// validateHttpUrl() is a line-by-line port of `_require_http_url` in
// contracts/concordat_hall.py and concordat_case.py. It is deliberately
// NOT built on the browser's `URL` class: `new URL()` normalises hosts
// (decodes %-escapes, rewrites 127.1 to 127.0.0.1, drops default ports)
// and would accept input the contract rejects.
//
// This is only a convenience so a user sees the problem before signing a
// transaction. The contract stays the authority; keep this in sync with it.
// ============================================================

/** Matches MAX_URL_CHARS in the contracts */
export const MAX_URL_CHARS = 1000;

const LOCAL_SUFFIXES = [
  '.localhost', '.local', '.internal', '.lan', '.home.arpa', '.localdomain',
  '.corp', '.intranet', '.private', '.test', '.invalid',
];

// Public wildcard-DNS services resolve 127.0.0.1.nip.io to the address
// written inside the name, which would smuggle a private IP past a name check.
const WILDCARD_DNS = [
  'nip.io', 'sslip.io', 'xip.io', 'traefik.me', 'localtest.me', 'lvh.me',
  'vcap.me', 'lacolhost.com', '1u.ms',
];

const DASHED_IPV4_LABEL = /^(?:ip-|ec2-)?([0-9]{1,3})-([0-9]{1,3})-([0-9]{1,3})-([0-9]{1,3})$/;
const HEX_LABEL = /^0x[0-9a-f]+$/;
const DIGITS = /^[0-9]+$/;
const IPV4 = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/;

function isOctet(label: string): boolean {
  return DIGITS.test(label) && label.length <= 3 && Number(label) <= 255;
}

/** True when a hostname spells an IPv4 address (dotted, or as one dashed label). */
function encodesIpv4(labels: string[]): boolean {
  for (let i = 0; i + 3 < labels.length; i++) {
    if (labels.slice(i, i + 4).every(isOctet)) return true;
  }
  return labels.some((label) => {
    const m = DASHED_IPV4_LABEL.exec(label);
    return m !== null && m.slice(1).every((part) => Number(part) <= 255);
  });
}

/** Strict dotted-quad IPv4 (like Python's ipaddress: no leading zeros). */
function isDottedIpv4(host: string): boolean {
  const m = IPV4.exec(host);
  if (!m) return false;
  return m.slice(1).every((p) => Number(p) <= 255 && (p === '0' || !p.startsWith('0')));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Returns a user-facing problem description, or null when the contract
 * would accept the URL. `what` completes the sentence ("the complaint",
 * "the defense", "the appeal grounds").
 */
export function validateHttpUrl(url: string, what: string): string | null {
  const fail = (rest: string) => capitalise(`${what} ${rest}`);

  if (typeof url !== 'string' || url.length > MAX_URL_CHARS) {
    return fail(`must be an http(s) URL of at most ${MAX_URL_CHARS} characters`);
  }
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code <= 32 || code === 127 || url[i] === '\\') {
      return fail('must not contain spaces, control characters or backslashes');
    }
  }

  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)/.exec(url);
  const scheme = match ? match[1].toLowerCase() : '';
  const netloc = match ? match[2] : '';

  if ((netloc.includes('[') && !netloc.includes(']')) || (netloc.includes(']') && !netloc.includes('['))) {
    return fail('is not a valid http(s) URL');
  }

  // userinfo / host / port, split the way Python's urlsplit does
  const at = netloc.lastIndexOf('@');
  const hasUserinfo = at >= 0;
  const hostinfo = hasUserinfo ? netloc.slice(at + 1) : netloc;

  let hostname: string;
  let portText: string;
  if (hostinfo.includes('[')) {
    const bracketed = hostinfo.slice(hostinfo.indexOf('[') + 1);
    const close = bracketed.indexOf(']');
    hostname = close >= 0 ? bracketed.slice(0, close) : bracketed;
    const afterBracket = close >= 0 ? bracketed.slice(close + 1) : '';
    const colon = afterBracket.indexOf(':');
    portText = colon >= 0 ? afterBracket.slice(colon + 1) : '';
  } else {
    const colon = hostinfo.indexOf(':');
    hostname = colon >= 0 ? hostinfo.slice(0, colon) : hostinfo;
    portText = colon >= 0 ? hostinfo.slice(colon + 1) : '';
  }

  let port: number | null = null;
  if (portText !== '') {
    if (!DIGITS.test(portText) || Number(portText) > 65535) {
      return fail('is not a valid http(s) URL');
    }
    port = Number(portText);
  }

  const host = hostname.toLowerCase().replace(/\.+$/, '');
  if ((scheme !== 'http' && scheme !== 'https') || host === '') {
    return fail('must be an http(s) URL');
  }
  if (host.includes('%')) {
    return fail('must not percent-encode its host name');
  }
  if (hasUserinfo) {
    return fail('must not contain credentials');
  }
  if (port !== null && port !== 80 && port !== 443) {
    return fail('must use the default http(s) port');
  }

  let isIp = host.includes(':'); // IPv6 literals
  if (!isIp && isDottedIpv4(host)) isIp = true;
  const labels = host.split('.');
  const tld = labels[labels.length - 1];
  if (DIGITS.test(tld) || labels.some((label) => HEX_LABEL.test(label))) {
    isIp = true; // dotted/hex shorthand such as 127.1 or 0x7f.1
  }
  if (isIp) {
    return fail('must use a domain name, not an IP address');
  }
  if (encodesIpv4(labels) || WILDCARD_DNS.some((s) => host === s || host.endsWith('.' + s))) {
    return fail('must not use a name that encodes an IP address');
  }
  if (host === 'localhost' || !host.includes('.') || LOCAL_SUFFIXES.some((s) => host.endsWith(s))) {
    return fail('must point at a public website');
  }
  return null;
}
