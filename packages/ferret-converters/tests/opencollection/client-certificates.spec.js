import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection } from '../../src/opencollection/ferret-to-opencollection';
import { openCollectionToFerret } from '../../src/opencollection/opencollection-to-ferret';

describe('openCollectionToFerret (import): client certificates', () => {
  it('maps pem/pkcs12 certificates to ferret cert/pfx types', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: {
        clientCertificates: [
          {
            domain: 'localhost',
            type: 'pem',
            certificateFilePath: './certs/client-cert.pem',
            privateKeyFilePath: './certs/client-key.pem',
            passphrase: 'secret'
          },
          {
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: './certs/client.pfx'
          }
        ]
      }
    });

    expect(ferretConfig.clientCertificates.certs).toEqual([
      {
        domain: 'localhost',
        type: 'cert',
        certFilePath: './certs/client-cert.pem',
        keyFilePath: './certs/client-key.pem',
        passphrase: 'secret'
      },
      {
        domain: 'example.com',
        type: 'pfx',
        pfxFilePath: './certs/client.pfx',
        passphrase: ''
      }
    ]);
  });

  it('reads a per-cert disabled flag when set to true', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: {
        clientCertificates: [
          {
            domain: 'localhost',
            type: 'pem',
            certificateFilePath: './certs/client-cert.pem',
            privateKeyFilePath: './certs/client-key.pem',
            disabled: true
          },
          {
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: './certs/client.pfx'
          }
        ]
      }
    });

    expect(ferretConfig.clientCertificates.certs[0].disabled).toBe(true);
    expect(ferretConfig.clientCertificates.certs[1]).not.toHaveProperty('disabled');
  });
});

describe('ferretToOpenCollection (export): client certificates', () => {
  it('maps ferret cert/pfx certificates to pem/pkcs12 types', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'cert',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              passphrase: 'secret'
            },
            {
              domain: 'example.com',
              type: 'pfx',
              pfxFilePath: './certs/client.pfx',
              passphrase: ''
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates).toEqual([
      {
        domain: 'localhost',
        type: 'pem',
        certificateFilePath: './certs/client-cert.pem',
        privateKeyFilePath: './certs/client-key.pem',
        passphrase: 'secret'
      },
      {
        domain: 'example.com',
        type: 'pkcs12',
        pkcs12FilePath: './certs/client.pfx'
      }
    ]);
  });

  it('writes disabled: true only for disabled certs and omits it otherwise', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'cert',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              disabled: true
            },
            {
              domain: 'example.com',
              type: 'pfx',
              pfxFilePath: './certs/client.pfx'
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates[0].disabled).toBe(true);
    expect(oc.config.clientCertificates[1]).not.toHaveProperty('disabled');
  });
});

describe('client certificates: round-trip', () => {
  it('export then import keeps every certificate field, including the disabled flag', () => {
    const certs = [
      {
        domain: 'localhost',
        type: 'cert',
        certFilePath: './certs/client-cert.pem',
        keyFilePath: './certs/client-key.pem',
        passphrase: 'secret',
        disabled: true
      },
      {
        domain: 'example.com',
        type: 'pfx',
        pfxFilePath: './certs/client.pfx',
        passphrase: 'pfx-secret'
      }
    ];

    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: { clientCertificates: { certs } },
      items: []
    });

    const { ferretConfig } = openCollectionToFerret(oc);

    expect(ferretConfig.clientCertificates.certs).toEqual(certs);
  });

  it('import then export keeps every certificate field, including the disabled flag', () => {
    const clientCertificates = [
      {
        domain: 'localhost',
        type: 'pem',
        certificateFilePath: './certs/client-cert.pem',
        privateKeyFilePath: './certs/client-key.pem',
        passphrase: 'secret',
        disabled: true
      },
      {
        domain: 'example.com',
        type: 'pkcs12',
        pkcs12FilePath: './certs/client.pfx',
        passphrase: 'pfx-secret'
      }
    ];

    const ferret = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: { clientCertificates }
    });

    const oc = ferretToOpenCollection(ferret);

    expect(oc.config.clientCertificates).toEqual(clientCertificates);
  });
});
