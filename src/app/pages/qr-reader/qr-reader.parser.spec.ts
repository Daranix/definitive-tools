import { parseQrContent } from './qr-reader.parser';

describe('QR Reader Parser', () => {
  it('should parse website URLs correctly', () => {
    const res = parseQrContent('https://github.com/Daranix/definitive-tools');
    expect(res.type).toBe('url');
    expect(res.title).toBe('github.com');
    expect(res.urlData?.hostname).toBe('github.com');
    expect(res.urlData?.href).toBe('https://github.com/Daranix/definitive-tools');
    expect(res.badgeLabel).toBe('Website URL');
  });

  it('should parse Wi-Fi network configurations', () => {
    const raw = 'WIFI:S:HomeNet;T:WPA;P:SecretPassword123;H:false;;';
    const res = parseQrContent(raw);
    expect(res.type).toBe('wifi');
    expect(res.title).toBe('Wi-Fi Network');
    expect(res.wifiData?.ssid).toBe('HomeNet');
    expect(res.wifiData?.password).toBe('SecretPassword123');
    expect(res.wifiData?.encryption).toBe('WPA');
    expect(res.wifiData?.hidden).toBe(false);
  });

  it('should parse vCard contact cards', () => {
    const raw = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:John Doe',
      'ORG:Acme Corp',
      'TITLE:Lead Engineer',
      'TEL:+1234567890',
      'EMAIL:john@example.com',
      'URL:https://johndoe.dev',
      'END:VCARD',
    ].join('\r\n');

    const res = parseQrContent(raw);
    expect(res.type).toBe('vcard');
    expect(res.vcardData?.fullName).toBe('John Doe');
    expect(res.vcardData?.organization).toBe('Acme Corp');
    expect(res.vcardData?.phone).toBe('+1234567890');
    expect(res.vcardData?.email).toBe('john@example.com');
  });

  it('should parse mailto emails', () => {
    const raw = 'mailto:hello@example.com?subject=Inquiry&body=Hi';
    const res = parseQrContent(raw);
    expect(res.type).toBe('email');
    expect(res.emailData?.to).toBe('hello@example.com');
    expect(res.emailData?.subject).toBe('Inquiry');
    expect(res.emailData?.body).toBe('Hi');
  });

  it('should parse telephone numbers', () => {
    const res = parseQrContent('tel:+34912345678');
    expect(res.type).toBe('phone');
    expect(res.phoneData?.number).toBe('+34912345678');
  });

  it('should parse SMS messages', () => {
    const res = parseQrContent('sms:+1234567890?body=Hello there');
    expect(res.type).toBe('sms');
    expect(res.smsData?.number).toBe('+1234567890');
    expect(res.smsData?.message).toBe('Hello there');
  });

  it('should parse geographic coordinates', () => {
    const res = parseQrContent('geo:40.4168,-3.7038');
    expect(res.type).toBe('geo');
    expect(res.geoData?.latitude).toBeCloseTo(40.4168);
    expect(res.geoData?.longitude).toBeCloseTo(-3.7038);
    expect(res.geoData?.googleMapsUrl).toContain('40.4168');
  });

  it('should parse JSON objects', () => {
    const raw = JSON.stringify({ app: 'definitive-tools', version: 2 });
    const res = parseQrContent(raw);
    expect(res.type).toBe('json');
    expect(res.jsonData?.keysCount).toBe(2);
    expect(res.jsonData?.formatted).toContain('"app": "definitive-tools"');
  });

  it('should fallback to plain text for generic content', () => {
    const res = parseQrContent('Simple plain text message');
    expect(res.type).toBe('text');
    expect(res.textData?.wordCount).toBe(4);
    expect(res.textData?.charCount).toBe(25);
  });
});
