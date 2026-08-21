import { generateKeyPairSync } from "node:crypto";
import forge from "node-forge";

export function throwawayServiceAccountKeyPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

export function selfSignedPassCertificates() {
  const keyPair = forge.pki.rsa.generateKeyPair(1024);
  const certificate = forge.pki.createCertificate();
  const issuedTo = [{ name: "commonName", value: "QueuePass Test" }];

  certificate.publicKey = keyPair.publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = new Date("2026-01-01T00:00:00.000Z");
  certificate.validity.notAfter = new Date("2027-01-01T00:00:00.000Z");
  certificate.setSubject(issuedTo);
  certificate.setIssuer(issuedTo);
  certificate.sign(keyPair.privateKey);

  const certificatePem = forge.pki.certificateToPem(certificate);

  return {
    wwdr: certificatePem,
    signerCert: certificatePem,
    signerKey: forge.pki.privateKeyToPem(keyPair.privateKey),
  };
}
