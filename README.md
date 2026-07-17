# MuleSoft BadSSL TLS API

This Mule application exposes a small API that proxies to BadSSL TLS test sites:

- `GET /api/v1/mtls/client-badssl` calls `https://client.badssl.com/` with the BadSSL client certificate.
- `GET /api/v1/tls/self-signed-badssl` calls `https://self-signed.badssl.com/` with a dedicated truststore.

The RAML remains at `src/main/resources/api/todo-api.raml` because the existing Exchange workflow expects that path.

## Local TLS verification

BadSSL publishes the demo client certificate at `https://badssl.com/download/`.  The PEM and PKCS#12 passwords are `badssl.com`.

```bash
mkdir -p /tmp/badssl
curl -fsSL https://badssl.com/certs/badssl.com-client.pem -o /tmp/badssl/badssl.com-client.pem
curl --cert /tmp/badssl/badssl.com-client.pem:badssl.com https://client.badssl.com/
```

In this execution environment, outbound HTTPS is intercepted by an egress proxy.  The TLS handshake with the client certificate completed, but the proxy returned `421 Misdirected Request` instead of the BadSSL success page.  On a normal network, the same command should return the BadSSL client-certificate page with HTTP 200.

For the self-signed endpoint, export the live certificate from `self-signed.badssl.com` and import it into the truststore used by the app:

```bash
openssl s_client -connect self-signed.badssl.com:443 -servername self-signed.badssl.com </dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > self-signed.badssl.com.pem

keytool -importcert -noprompt \
  -alias self-signed.badssl.com \
  -file self-signed.badssl.com.pem \
  -keystore src/main/resources/self-signed-badssl-truststore.jks \
  -storepass changeit
```

> Note: when running behind a TLS-inspecting corporate or CI proxy, the exported certificate may be the proxy's generated certificate instead of BadSSL's live self-signed certificate.  Build the truststore from a non-intercepted network for production-like validation.

## Configuration

Runtime values live in `src/main/resources/application.yaml`:

| Property | Purpose |
| --- | --- |
| `badssl.client.host` | Host for the mTLS request. |
| `badssl.client.keystore.path` | PKCS#12 client certificate on the Mule classpath. |
| `badssl.client.keystore.password` | Client certificate password. |
| `badssl.selfSigned.host` | Host for the self-signed certificate request. |
| `badssl.selfSigned.truststore.path` | Truststore on the Mule classpath. |
| `badssl.selfSigned.truststore.password` | Truststore password. |

The BadSSL certificate artifacts are stored as Base64-encoded text fixtures under `src/main/resources/certs/` so PR systems that reject binary diffs can still review the change. Decode them before building or running locally:

```bash
scripts/restore-badssl-certs.sh
```

The restored BadSSL client certificate is a public demo credential intended only for BadSSL test endpoints.  Do not copy this pattern for real private client keys; use secure properties or a secret manager instead.

## Build

```bash
scripts/restore-badssl-certs.sh
mvn -DskipTests package
```

## Deployment notes

The deployment workflow still publishes RAML changes from `src/main/resources/api/todo-api.raml` and deploys Mule application versions from `pom.xml`.  Increment the Maven version before publishing a new immutable Exchange application asset.
