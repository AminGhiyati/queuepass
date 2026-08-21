import QRCode from "qrcode";

const QR_CODE_WIDTH_IN_PIXELS = 320;

export function renderQrCodeDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: QR_CODE_WIDTH_IN_PIXELS,
  });
}
