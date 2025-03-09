import { z } from "zod";
import { Prettify } from "../../utils/types";
import { CornerDotType, DotType } from "qr-code-styling";

export const QR_CONTENT_TYPES = [
    'url',
    'text',
    'email',
    'phone',
    'sms',
    'vcard',
    'wifi',
    'geo'
] as const;

export const DOT_TYPES = [
    "dots",
    "rounded",
    "classy",
    "classy-rounded",
    "square",
    "extra-rounded"
] as const satisfies Array<DotType>;

export const CORNERS_STYLES = [
    "square",
    "rounded",
    "extra-rounded"
] as const satisfies Array<CornerDotType>;


export const QrBaseSchema = z.object({
    contentType: z.enum([...QR_CONTENT_TYPES]).default('url'),
    size: z.number().min(100).max(2000).default(200),
    errorCorrectionLevel: z.enum(['low', 'medium', 'quartile', 'high']).default('quartile'),
    foregroundColor: z.string().default('#000000'),
    backgroundColor: z.string().default('#ffffff'),
    dotsType: z.enum([...DOT_TYPES]).default('square'),
    cornersStyle: z.enum([...CORNERS_STYLES]).default('square')
});

export type QrBase = z.infer<typeof QrBaseSchema>;
export type QrContentType = QrBase['contentType'];

export const QrUrlSchema = QrBaseSchema.extend({
    contentType: z.literal('url'),
    url: z.string().url()
});

export type QrUrl = Prettify<z.infer<typeof QrUrlSchema>>;

export const QrTextSchema = QrBaseSchema.extend({
    contentType: z.literal('text'),
    textInput: z.string()
});

export type QrText = Prettify<z.infer<typeof QrTextSchema>>;

export const QrEmailSchema = QrBaseSchema.extend({
    contentType: z.literal('email'),
    emailAddress: z.string(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional()
});

export type QrEmail = Prettify<z.infer<typeof QrEmailSchema>>;

export const QrPhoneSchema = QrBaseSchema.extend({
    contentType: z.literal('phone'),
    phoneNumber: z.string()
});

export type QrPhone = Prettify<z.infer<typeof QrPhoneSchema>>;

export const QrSmsSchema = QrBaseSchema.extend({
    contentType: z.literal('sms'),
    smsPhoneNumber: z.string(),
    smsMessage: z.string()
});

export type QrSms = Prettify<z.infer<typeof QrSmsSchema>>;

export const QrVcardSchema = QrBaseSchema.extend({
    contentType: z.literal('vcard'),
    vcardFirstName: z.string(),
    vcardLastName: z.string(),
    vcardCompany: z.string().optional(),
    vcardPhoneNumber: z.string(),
    vcardEmail: z.string(),
    vcardWebsite: z.string().optional(),
    vcardAddress: z.string().optional()
});

export type QrVcard = Prettify<z.infer<typeof QrVcardSchema>>;

export const QrWifiSchema = QrBaseSchema.extend({
    contentType: z.literal('wifi'),
    wifiSsid: z.string(),
    wifiPassword: z.string().optional(),
    wifiEncryption: z.enum(['wpa', 'wep', 'none']).default('wpa')
});

export type QrWifi = Prettify<z.infer<typeof QrWifiSchema>>;
export type QrWifiEncryption = QrWifi['wifiEncryption'];

export const QrGeoSchema = QrBaseSchema.extend({
    contentType: z.literal('geo'),
    geoLatitude: z.string(),
    geoLongitude: z.string()
});

export type QrGeo = Prettify<z.infer<typeof QrGeoSchema>>;

export const QrSchemas = {
    url: QrUrlSchema,
    text: QrTextSchema,
    email: QrEmailSchema,
    phone: QrPhoneSchema,
    sms: QrSmsSchema,
    vcard: QrVcardSchema,
    wifi: QrWifiSchema,
    geo: QrGeoSchema
} as const;

export type QrZodSchema = typeof QrSchemas[keyof typeof QrSchemas];
export type QrFormData = z.infer<QrZodSchema>;