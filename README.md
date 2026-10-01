# Mule HTTPS/TLS Connectivity Diagnostics

An intentionally small, interactive Mule 4 troubleshooting API for answering a precise question: **can this Mule runtime establish an unauthenticated HTTPS connection to this target, and does using the corporate truststore change the answer?** It replaces the former TODO sample. It is a learning POC and an operator tool—not a proxy, monitor, or certificate-management service.

## How it works

`POST /diagnostics/test` applies defaults, rejects unsafe syntax, resolves every address returned for the host, blocks the entire request if **any** address is loopback or link-local, then selects one of two HTTPS request configurations. The outbound URL is assembled by the HTTP connector from the separately validated host, port, and path. Callers cannot provide a scheme, outbound body, or outbound headers.

| Profile | TLS behavior | Question answered |
| --- | --- | --- |
| `default` | `TLS_Default` has no explicit truststore and therefore uses normal Mule/JVM trust configuration. | Does the runtime trust and reach it normally? |
| `corporate` | `TLS_Corporate` uses the externally supplied PKCS12 truststore. | Does the organization-specific trust set change the result? |

Only those exact profiles and only `GET`/`HEAD` are accepted. HTTP status 4xx/5xx is a completed DNS/TCP/TLS/HTTP exchange and is reported as `HTTP_4XX`/`HTTP_5XX`, rather than thrown as a generic API 500.

## TLS and PKIX in brief

During TLS negotiation the server presents a **leaf** certificate (the server identity) and normally one or more **intermediate** CA certificates. Java attempts to build a cryptographically valid path from the leaf through intermediates to a trusted **root** CA in the selected truststore. It also verifies dates and that the requested hostname matches the certificate SAN.

`PKIX path building failed` usually means Java could not build that path to a trusted anchor: a needed root is absent, the server omitted an intermediate, or the chain is otherwise invalid. It does not, by itself, prove which certificate should be imported. Fix the server chain where possible; add an organizational CA only after it has been validated through your certificate-management process. Never import an unverified leaf merely to silence the error.

## Configuration

Java 17 and Mule 4.11 are required. Set these runtime/environment properties before startup:

```bash
export TLS_CORPORATE_TRUSTSTORE_PATH=/absolute/path/to/corporate-truststore.p12
export TLS_CORPORATE_TRUSTSTORE_PASSWORD='obtain-from-your-secret-manager'
```

No truststore or password is committed. On CloudHub, configure both as application properties and mark the password secure. The path can point to a file added through your controlled deployment packaging process. A conventional local location is `src/main/resources/tls/corporate-truststore.p12`; `.gitignore` prevents committing it.

Create an empty PKCS12 and import reviewed CA certificates (prefer the issuing corporate root/intermediate, not a private key):

```bash
keytool -importcert -alias corporate-root-2026 \
  -file /approved/corporate-root.pem \
  -keystore src/main/resources/tls/corporate-truststore.p12 \
  -storetype PKCS12

keytool -list -v \
  -keystore src/main/resources/tls/corporate-truststore.p12 \
  -storetype PKCS12
```

`keytool` prompts for the password, keeping it out of shell history and source control. To add another approved CA, repeat `-importcert` with a unique alias. Rebuild/redeploy after changing a bundled store; this application never modifies truststores.

## Run locally

```bash
mise exec java@17 -- mvn clean test
mise exec java@17 -- mvn package
# Run/deploy the generated Mule application with the two environment variables above.
```

The listener defaults to `0.0.0.0:8081`; routes begin with `/api/diagnostics`.

## API

### Test one target

Only `host` is required. Defaults are path `/`, port `443`, method `GET`, and profile `default`.

```bash
curl -sS -X POST http://localhost:8081/api/diagnostics/test \
  -H 'Content-Type: application/json' \
  -d '{"host":"example.com","method":"HEAD","trustProfile":"default"}'
```

A success contains `dnsResolved`, `tcpConnected`, `tlsHandshake`, `httpConnected`, HTTP status, duration, and timestamp. HTTP errors remain useful diagnostic results. Connectivity failures contain the normalized category, Mule error type, and sanitized connector description.

### Compare trust profiles

```bash
curl -sS -X POST http://localhost:8081/api/diagnostics/compare-trust \
  -H 'Content-Type: application/json' \
  -d '{"host":"example.com","path":"/","port":443,"method":"HEAD"}'
```

The same already-resolved and validated target is attempted once per profile. `trustDifference: CORPORATE_TRUST_SUCCEEDED_WHERE_DEFAULT_FAILED` makes the most important case explicit. It is evidence of a trust-configuration difference, not automatic proof that the remote chain is correct.

### Certificate/TLS probe

```bash
curl -sS 'http://localhost:8081/api/diagnostics/certificate?host=example.com&port=443'
```

Mule's standard HTTP connector performs certificate validation but does **not** expose the peer TLS session/X.509 chain to a flow. To avoid pretending otherwise—and to honor this project's no custom Java certificate-client design—the response returns a real default-profile TLS probe plus `certificateDetailsAvailable: false`, `certificate: null`, and an explanation. For a separate observational check:

```bash
openssl s_client -connect example.com:443 -servername example.com -showcerts </dev/null
```

OpenSSL output is not the Mule trust decision; compare it with the probe.

## Reading results and classification

| Category | Meaning |
| --- | --- |
| `DNS_FAILURE` | Java name resolution failed before HTTP. |
| `CONNECTION_TIMEOUT` / `CONNECTION_REFUSED` | Connector cause text unambiguously indicates that condition. |
| `TLS_UNTRUSTED_CERTIFICATE` | Cause text contains PKIX/trust-path evidence. |
| `TLS_HOSTNAME_MISMATCH` | Cause text explicitly identifies hostname/SAN mismatch. |
| `TLS_HANDSHAKE_FAILURE` | Other explicit SSL/TLS handshake evidence. |
| `HTTP_4XX` / `HTTP_5XX` | HTTPS completed and the server returned this class. |
| `INVALID_TARGET` / `BLOCKED_TARGET` | Input validation or destination policy stopped the call. |
| `UNKNOWN_CONNECTIVITY_ERROR` | Mule did not expose enough evidence to classify safely. |

The stage booleans are deliberately conservative. A received HTTP response proves all earlier stages. An explicit TLS failure implies DNS and TCP succeeded, but other connector failures leave uncertain stages as `null`. The HTTP connector can collapse DNS, socket, proxy, and TLS causes into `HTTP:CONNECTIVITY`; text classification inspects the exposed description but never guesses when evidence is ambiguous.

## Security model

* HTTPS is hard-coded in the two request configurations; schemes in `host` are rejected.
* Host must contain no scheme, path, query, user-info, or slash. Port must be `1..65535`; path must begin with one slash and contain no CR/LF.
* Java resolves all answers before connection. Any loopback (`127.0.0.0/8`, `::1`, etc.) or link-local (`169.254.0.0/16`, `fe80::/10`) answer blocks the request, including `localhost` and `169.254.169.254`.
* Only GET and HEAD are supported. The request payload is set to `null`, outbound headers are an explicit empty object, and inbound `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, and all other headers are never copied.
* Logs contain correlation ID, target fields, timing, outcome, normalized category, and Mule type—never inbound headers, cookies, body, truststore password, certificates, or keys.
* This is still SSRF-sensitive infrastructure. Restrict who can call it, apply network egress policy, and deploy only in an internal environment.

### DNS rebinding limitation

The application rejects if any initially resolved address is blocked, which safely handles multi-address answers. The HTTP connector performs its own hostname resolution later; DNS could change between validation and connection (TOCTOU/rebinding). Mule's standard connector cannot be pinned to the validated IP while retaining correct SNI/hostname verification. Network-level egress controls are therefore mandatory. Private RFC1918/ULA addresses are intentionally not blocked because an internal diagnostic tool may need them; tighten that policy for your environment.

## Example targets and boundaries

`example.com` is a convenient public success example. Public deliberately broken-certificate services (for example, BadSSL test hosts) can be useful, but external services and their certificates can change and must never be treated as stable tests or hard-coded application behavior.

This tool can show the runtime's actual trust outcome, returned HTTP status, coarse timing, and defensible categories from exposed causes. It cannot packet-capture, prove firewall policy, identify every omitted intermediate, display the peer chain through standard Mule components, guarantee protection against DNS changes, forward credentials, send bodies, modify truststores, retain history, schedule checks, alert, or monitor. For a small interactive batch, call `/test` repeatedly from a controlled shell script; no background/batch infrastructure is included.
