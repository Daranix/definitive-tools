import { QrContentType, QrEmail, QrFormData, QrGeo, QrPhone, QrSms, QrText, QrUrl, QrVcard, QrWifi } from "./qr-generator.schemas";

export type QrContentProcessors = {
    [K in QrContentType]: (data: Extract<QrFormData, { contentType: K }>) => string;
};

export const qrContentProcessors: QrContentProcessors = {
    url(data: QrUrl) {
        const { url } = data;
        return url;
    },
    text(data: QrText) {
        const { textInput } = data;
        return textInput;
    },
    email(data: QrEmail) {
        const { emailAddress, emailSubject, emailBody } = data;
        return `mailto:${emailAddress}?subject=${emailSubject ?? ''}&body=${emailBody ?? ''}`;
    },
    phone(data: QrPhone) {
        const { phoneNumber } = data;
        return `tel:${phoneNumber}`;
    },
    sms(data: QrSms) {
        const { smsPhoneNumber, smsMessage } = data;
        return `sms:${smsPhoneNumber}?body=${smsMessage}`;
    },
    vcard(data: QrVcard) {
        // TODO: Check if this fails for the tabs
        const { vcardFirstName, vcardLastName, vcardCompany, vcardPhoneNumber, vcardEmail, vcardWebsite, vcardAddress } = data;
        return `BEGIN:VCARD
                VERSION:3.0
                N:${vcardFirstName};${vcardLastName}
                FN:${vcardFirstName} ${vcardLastName}
                ${vcardCompany ? `ORG:${vcardCompany}` : ''}
                TEL:${vcardPhoneNumber}
                EMAIL:${vcardEmail}
                URL:${vcardWebsite}
                ADR;HOME;WORK;POSTAL;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:${vcardAddress}
                END:VCARD`.trim();
    },
    wifi(data: QrWifi) {
        const hidden = false;
        const { wifiSsid, wifiPassword, wifiEncryption } = data;
        return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword ?? ''};H:${hidden};;`
    },
    geo(data: QrGeo) {
        const { geoLatitude, geoLongitude } = data;
        return `GEO:${geoLatitude};${geoLongitude}`;
    }
}
