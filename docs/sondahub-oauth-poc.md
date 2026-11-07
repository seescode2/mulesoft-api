# SondaHub OAuth client credentials POC

`GET /api/v1/todos` now calls
`GET https://api.sondahub.com/v1/utils/oauth/protected` and returns its response
body. The RAML is intentionally unchanged, so the POC response differs from the
documented todo array. The `status` query parameter no longer filters this
response. The other todo operations retain their mock implementations.

## Authentication and token storage

The HTTP Request connection uses `oauth:client-credentials-grant-type`. Mule
POSTs a form containing `grant_type=client_credentials` and `scope=read` to
`https://api.sondahub.com/v1/utils/oauth/token`, authenticating the client with
HTTP Basic. The connector adds `Authorization: Bearer <access_token>` to the
protected request; callers of the todos API do not supply the SondaHub token.

`sondahub-oauth-token-manager` stores the OAuth context in the explicitly
configured persistent `sondahub-oauth-object-store`. Token acquisition, reuse,
and renewal belong to the OAuth module, rather than a manually implemented
token cache. The module extracts `access_token` and `expires_in` from the token
response. A protected response with status `401` triggers token reacquisition
and a retry. A `403` does not trigger renewal, since it can mean insufficient
scope. Do not assign an independent Object Store TTL that could evict the
manager's context prematurely.

Mule can acquire the initial token during application startup. Both the token
and protected endpoint must therefore be reachable from the deployed runtime.
Upstream failures use the API's existing error handling.

## Configuration

Defaults in `src/main/resources/application.yaml` use the intentionally public
playground client published in the
[SondaHub documentation](https://www.sondahub.com/oauth2-test-server/).
These credentials are for the public test server only.

| Application property | Default |
| --- | --- |
| `sondahub.host` | `api.sondahub.com` |
| `sondahub.port` | `443` |
| `sondahub.protocol` | `HTTPS` |
| `sondahub.protectedPath` | `/v1/utils/oauth/protected` |
| `sondahub.oauth.tokenUrl` | `https://api.sondahub.com/v1/utils/oauth/token` |
| `sondahub.oauth.clientId` | `sonda` |
| `sondahub.oauth.clientSecret` | `probe-secret` |
| `sondahub.oauth.scopes` | `read` |

Override application properties in Runtime Manager to use a registered client;
mark a private `sondahub.oauth.clientSecret` as protected and do not commit it.
After changing credentials, clear the old OAuth context or use a new Object
Store name before restarting, so the previous client's token is not reused.

## Try the POC

Start or deploy the application with its existing API Manager configuration,
then call:

```bash
curl --fail-with-body http://localhost:8081/api/v1/todos
```

Include any client authentication required by the API Manager policies on your
deployment. Call twice to exercise token reuse. The result is SondaHub's
protected JSON response, not a todo list. Do not log or return access tokens.

Run the MUnit suite on Java 17:

```bash
mise exec java@17 -- mvn test
```

The default MUnit tests mock the outbound HTTP operation to verify response
forwarding and upstream error propagation. The optional integration suite runs
the real connector against a loopback OAuth server using Python 3's standard
library:

```bash
mise exec java@17 -- python3 src/test/python/sondahub_oauth_integration.py
```

The harness checks the Basic credentials and grant form, bearer authentication,
token reuse, a new client credentials grant and retry after `401`, no renewal on
`403`, and the presence of OAuth context in the configured Object Store. It uses
an ephemeral local port and supplies test-only endpoint overrides to Maven.
Extra Maven arguments, such as `--settings /path/to/settings.xml`, can be passed
to the Python command. This verifies the OAuth wiring without internet access;
use the deployed smoke test above to verify live SondaHub connectivity.

See also [MuleSoft HTTP authentication](https://docs.mulesoft.com/http-connector/1.10/http-authentication).
