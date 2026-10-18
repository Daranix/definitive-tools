export type QrDataType =
  | 'url'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'json'
  | 'text';

export interface ParsedQrResult {
  raw: string;
  type: QrDataType;
  title: string;
  badgeLabel: string;
  badgeColorClass: string;
  icon: string;
  urlData?: {
    href: string;
    hostname: string;
    protocol: string;
    pathname: string;
  };
  wifiData?: {
    ssid: string;
    password?: string;
    encryption: string;
    hidden: boolean;
  };
  vcardData?: {
    fullName?: string;
    organization?: string;
    title?: string;
    phone?: string;
    email?: string;
    url?: string;
    address?: string;
    note?: string;
  };
  emailData?: {
    to: string;
    subject?: string;
    body?: string;
  };
  phoneData?: {
    number: string;
  };
  smsData?: {
    number: string;
    message?: string;
  };
  geoData?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    googleMapsUrl: string;
    osmUrl: string;
  };
  jsonData?: {
    formatted: string;
    keysCount: number;
  };
  textData?: {
    charCount: number;
    wordCount: number;
    lineCount: number;
  };
}

export function parseQrContent(rawContent: string): ParsedQrResult {
  const trimmed = rawContent.trim();

  // 1. Wi-Fi: WIFI:S:MySSID;T:WPA;P:MyPass;H:false;;
  if (/^WIFI:/i.test(trimmed)) {
    const wifi = parseWifiString(trimmed);
    return {
      raw: rawContent,
      type: 'wifi',
      title: 'Wi-Fi Network',
      badgeLabel: 'Wi-Fi',
      badgeColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: 'wifi',
      wifiData: wifi,
    };
  }

  // 2. vCard: BEGIN:VCARD ... END:VCARD or MECARD:
  if (/^BEGIN:VCARD/i.test(trimmed) || /^MECARD:/i.test(trimmed)) {
    const vcard = parseVCardString(trimmed);
    return {
      raw: rawContent,
      type: 'vcard',
      title: vcard.fullName || 'Contact Card',
      badgeLabel: 'Contact (vCard)',
      badgeColorClass: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: 'id-card',
      vcardData: vcard,
    };
  }

  // 3. Email: mailto: or MATMSG:
  if (/^mailto:/i.test(trimmed) || /^MATMSG:/i.test(trimmed)) {
    const email = parseEmailString(trimmed);
    return {
      raw: rawContent,
      type: 'email',
      title: email.to || 'Email Address',
      badgeLabel: 'Email',
      badgeColorClass: 'bg-sky-100 text-sky-800 border-sky-200',
      icon: 'at-sign',
      emailData: email,
    };
  }

  // 4. Phone: tel:
  if (/^tel:/i.test(trimmed)) {
    const number = trimmed.replace(/^tel:/i, '').trim();
    return {
      raw: rawContent,
      type: 'phone',
      title: number,
      badgeLabel: 'Phone',
      badgeColorClass: 'bg-green-100 text-green-800 border-green-200',
      icon: 'phone',
      phoneData: { number },
    };
  }

  // 5. SMS: sms: or SMSTO:
  if (/^sms:/i.test(trimmed) || /^SMSTO:/i.test(trimmed)) {
    const sms = parseSmsString(trimmed);
    return {
      raw: rawContent,
      type: 'sms',
      title: sms.number ? `SMS to ${sms.number}` : 'SMS Message',
      badgeLabel: 'SMS',
      badgeColorClass: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: 'tablet-smartphone',
      smsData: sms,
    };
  }

  // 6. Geo: geo:lat,lng
  if (/^geo:/i.test(trimmed)) {
    const geo = parseGeoString(trimmed);
    if (geo) {
      return {
        raw: rawContent,
        type: 'geo',
        title: `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}`,
        badgeLabel: 'Location',
        badgeColorClass: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: 'map-pin',
        geoData: geo,
      };
    }
  }

  // 7. URL (http, https, ftp, or standard website)
  if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed) || /^www\.[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
    try {
      const urlString = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const url = new URL(urlString);
      return {
        raw: rawContent,
        type: 'url',
        title: url.hostname,
        badgeLabel: 'Website URL',
        badgeColorClass: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: 'link',
        urlData: {
          href: url.href,
          hostname: url.hostname,
          protocol: url.protocol,
          pathname: url.pathname + url.search + url.hash,
        },
      };
    } catch {
      // If URL parsing fails, continue checking
    }
  }

  // 8. JSON formatted string
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const isObject = typeof parsed === 'object' && parsed !== null;
      if (isObject) {
        return {
          raw: rawContent,
          type: 'json',
          title: Array.isArray(parsed) ? `JSON Array (${parsed.length} items)` : 'JSON Object',
          badgeLabel: 'JSON Data',
          badgeColorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: 'code',
          jsonData: {
            formatted: JSON.stringify(parsed, null, 2),
            keysCount: Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length,
          },
        };
      }
    } catch {
      // Continue to plain text
    }
  }

  // 9. Default: Plain Text
  const words = trimmed.length ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const lines = trimmed.split(/\r\n|\r|\n/).length;

  return {
    raw: rawContent,
    type: 'text',
    title: trimmed.length > 50 ? `${trimmed.substring(0, 47)}...` : trimmed || 'Empty Content',
    badgeLabel: 'Plain Text',
    badgeColorClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: 'file-text',
    textData: {
      charCount: trimmed.length,
      wordCount: words,
      lineCount: lines,
    },
  };
}

function parseWifiString(str: string): NonNullable<ParsedQrResult['wifiData']> {
  // WIFI:S:MySSID;T:WPA;P:MyPass;H:false;;
  const extract = (key: string): string => {
    const match = str.match(new RegExp(`(?:^|;)${key}:([^;]*)`, 'i'));
    return match ? match[1] : '';
  };

  const ssid = extract('S');
  const password = extract('P') || undefined;
  const encryption = (extract('T') || 'nopass').toUpperCase();
  const hiddenStr = extract('H');
  const hidden = hiddenStr.toLowerCase() === 'true';

  return {
    ssid,
    password,
    encryption: encryption === 'NOPASS' ? 'None' : encryption,
    hidden,
  };
}

function parseVCardString(str: string): NonNullable<ParsedQrResult['vcardData']> {
  const result: NonNullable<ParsedQrResult['vcardData']> = {};

  if (/^MECARD:/i.test(str)) {
    const extract = (key: string): string | undefined => {
      const match = str.match(new RegExp(`${key}:([^;]*)`, 'i'));
      return match ? match[1] : undefined;
    };
    result.fullName = extract('N');
    result.phone = extract('TEL');
    result.email = extract('EMAIL');
    result.url = extract('URL');
    result.address = extract('ADR');
    result.note = extract('NOTE');
    return result;
  }

  // Standard vCard
  const lines = str.split(/\r\n|\r|\n/);
  for (const line of lines) {
    const [rawKey, ...valParts] = line.split(':');
    if (!rawKey || valParts.length === 0) continue;
    const key = rawKey.split(';')[0].toUpperCase().trim();
    const val = valParts.join(':').trim();

    if (key === 'FN' && !result.fullName) {
      result.fullName = val;
    } else if (key === 'N' && !result.fullName) {
      result.fullName = val.split(';').filter(Boolean).reverse().join(' ');
    } else if (key === 'ORG' && !result.organization) {
      result.organization = val.replace(/;/g, ' - ');
    } else if (key === 'TITLE' && !result.title) {
      result.title = val;
    } else if (key === 'TEL' && !result.phone) {
      result.phone = val;
    } else if (key === 'EMAIL' && !result.email) {
      result.email = val;
    } else if (key === 'URL' && !result.url) {
      result.url = val;
    } else if (key === 'ADR' && !result.address) {
      result.address = val.replace(/;/g, ', ').replace(/^,\s*/, '').trim();
    } else if (key === 'NOTE' && !result.note) {
      result.note = val;
    }
  }

  return result;
}

function parseEmailString(str: string): NonNullable<ParsedQrResult['emailData']> {
  if (/^MATMSG:/i.test(str)) {
    const extract = (key: string): string => {
      const match = str.match(new RegExp(`${key}:([^;]*)`, 'i'));
      return match ? match[1] : '';
    };
    return {
      to: extract('TO'),
      subject: extract('SUB') || undefined,
      body: extract('BODY') || undefined,
    };
  }

  // mailto:email@example.com?subject=...&body=...
  const withoutScheme = str.replace(/^mailto:/i, '');
  const [recipient, query] = withoutScheme.split('?');
  const params = new URLSearchParams(query || '');

  return {
    to: decodeURIComponent(recipient || ''),
    subject: params.get('subject') || undefined,
    body: params.get('body') || undefined,
  };
}

function parseSmsString(str: string): NonNullable<ParsedQrResult['smsData']> {
  if (/^SMSTO:/i.test(str)) {
    const parts = str.replace(/^SMSTO:/i, '').split(':');
    return {
      number: parts[0] || '',
      message: parts.slice(1).join(':') || undefined,
    };
  }

  const withoutScheme = str.replace(/^sms:/i, '');
  const [number, query] = withoutScheme.split('?');
  const params = new URLSearchParams(query || '');

  return {
    number: decodeURIComponent(number || ''),
    message: params.get('body') || undefined,
  };
}

function parseGeoString(str: string): ParsedQrResult['geoData'] | undefined {
  const coords = str.replace(/^geo:/i, '').split('?')[0].split(',');
  const lat = parseFloat(coords[0]);
  const lng = parseFloat(coords[1]);
  const alt = coords[2] ? parseFloat(coords[2]) : undefined;

  if (isNaN(lat) || isNaN(lng)) return undefined;

  return {
    latitude: lat,
    longitude: lng,
    altitude: isNaN(alt as number) ? undefined : alt,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
  };
}
