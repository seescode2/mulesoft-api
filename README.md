# MuleSoft Object Store 2.0 API

This learning API demonstrates the Object Store connector against one globally configured persistent store. On CloudHub, the persistent store is backed by Object Store v2.

## Object Store operations

All routes are below `/api/v1`:

| Method | Route | Object Store operation |
| --- | --- | --- |
| `POST` | `/cache-value` | `os:store` |
| `GET` | `/list-cache-keys` | `os:retrieve-all-keys` |
| `GET` | `/check-cache-key/{key}` | `os:contains` |
| `GET` | `/get-value/{key}` | `os:retrieve` |
| `GET` | `/get-value-default/{key}?defaultValue=Cache%20miss` | `os:retrieve` with `os:default-value` |
| `DELETE` | `/delete-value/{key}` | `os:remove` |

Store a sample value with:

```bash
curl -X POST http://localhost:8081/api/v1/cache-value \
  -H 'Content-Type: application/json' \
  -d '{"key":"greeting","value":{"message":"Hello from Object Store 2.0"}}'
```

This repository deploys the Mule application to Anypoint Runtime Manager when commits are pushed to a `release/*` branch. The deployment workflow is defined in [`.github/workflows/deploy-anypoint.yml`](.github/workflows/deploy-anypoint.yml).

Additionally this deploys RAML files to Exchange.  Edit the raml file in `src/main/resources/api/todo-api.raml`.  Do not edit the name of the file.  When commits are pushed to a `raml/*.*.*` where * is a semantic version number it will deploy to Exchange.

## Configure GitHub Actions secrets

In GitHub, open the repository and go to:

**Settings → Secrets and variables → Actions → Secrets → New repository secret**

Add all secrets below. Secret names must match exactly.

| GitHub secret | Value | Where to find it in Anypoint Platform |
| --- | --- | --- |
| `ANYPOINT_BUSINESS_GROUP_ID` | ID of the business group that owns the Exchange asset, API Manager instance, and Runtime Manager environment | **Access Management → Business Groups → select the business group**. In the newer UI, copy the UUID after `businessGroups/` in the browser URL. In the classic UI, copy **Business Group Id**. |
| `ANYPOINT_CLIENT_ID` | Client ID of a connected app used by GitHub Actions to publish to Exchange and deploy through Runtime Manager | **Access Management → Connected Apps → Owned Apps → select the deployment app → Copy ID** |
| `ANYPOINT_CLIENT_SECRET` | Secret belonging to the same connected app | **Access Management → Connected Apps → Owned Apps → select the deployment app → Copy Secret**. If the secret is no longer visible, reset or regenerate it and update GitHub. |
| `ANYPOINT_ENVIRONMENT` | Sandbox | Go to Runtime Manager and select one of the environments.  To keep things simple always use Sandbox. |
| `ANYPOINT_ENV_CLIENT_ID` | Client ID for the Anypoint `Sandbox` environment; Mule Gateway uses it for API Manager autodiscovery | **Access Management → Business Groups → select the business group → Environments → Sandbox → Client ID** |
| `ANYPOINT_ENV_CLIENT_SECRET` | Client secret for the same `Sandbox` environment | **Access Management → Business Groups → select the business group → Environments → Sandbox → Client Secret** |
| `ANYPOINT_TARGET` | Cloudhub-US-East-2 | This is not easy to find.  I had to use chrome devtools while on the website to identify the id.  To keep things simple always use Cloudhub-US-East-2 |
| `API_MANAGER_ID` | 21030256 | Go to Api Manager and then select one.  You should see the api manager id.  To keep things simple always use the same one. |
| `CLOUDHUB_APP_NAME` | mulesoft-todo-api-release | Keep this mulesoft-todo-api-release |

The connected-app credentials and environment credentials are different credential pairs:

- `ANYPOINT_CLIENT_ID` and `ANYPOINT_CLIENT_SECRET` authenticate the GitHub workflow to Anypoint APIs, Exchange, and Runtime Manager.
- `ANYPOINT_ENV_CLIENT_ID` and `ANYPOINT_ENV_CLIENT_SECRET` are passed to the Mule application at deployment time so API Manager can pair with the running Mule Gateway. The environment secret is configured as a secure Runtime Manager application property.

Do not commit any of these values to the repository, Maven configuration, workflow YAML, or application property files.

### Connected app permissions

Create or edit the connected app under **Access Management → Connected Apps**. It must be an app that **acts on its own behalf using client credentials** and must be scoped to the business group and `Sandbox` environment used by this deployment.

Grant permissions sufficient to:

- view the organization and environment;
- publish application assets to Exchange, such as **Exchange Contributor**;
- read and manage applications in Runtime Manager; and
- read the API Manager instance used by the application.

Use the narrowest scopes that allow the workflow to publish and deploy.

## Deployment behavior

The Runtime Manager job runs for pushes to `release/*` branches and can also be started with **Actions → Deploy to Anypoint Platform → Run workflow**.

The job:

1. validates the connected app and required settings;
2. builds the Mule application and publishes its immutable version to Exchange;
3. deploys the Exchange application asset to CloudHub 2.0; and
4. waits for Runtime Manager to confirm that the application started.

Before publishing another release, increment the Maven `<version>` in [`pom.xml`](pom.xml). Exchange release versions are immutable, so reusing an already-published version causes the publication step to fail.

The API base path is:

```text
/api/v1
```

## Update RAML workflow
- Checkout `main` branch
- Pull latest changes
- Make new branch called `feature/something`.
- Edit the raml file in `src/main/resources/api/todo-api.raml`.  Do not edit the name of the file.  
- Commit code
- Make new branch called `raml/*.*.*` where * is a semantic version number it will deploy to Exchange.  Check exchange to make sure this version does not already exist.
- Push.  This should automatically cause github actions to push this to Exchange.

## Update Flows workflow
- Checkout existing `feature/something`
- Pull latest changes
- Edit the flows.  
- Make sure to increment the pom version.  Make sure this version does not already exist on Exchange.
- Commit code
- Make new branch called `release/*.*.*` where * is a semantic version number it will deploy to Exchange.
- Push.  This should automatically cause github actions to deploy to Sandbox environment
- Do not merge code back into `main`.  Keep `main` as is.

## References

- [GitHub: Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [MuleSoft: Connected application authentication](https://docs.mulesoft.com/exchange/connected-app-authentication)
- [MuleSoft: Managing business groups](https://docs.mulesoft.com/access-management/managing-business-groups)
- [MuleSoft: Anypoint Platform environments](https://docs.mulesoft.com/access-management/environments)
- [MuleSoft: Configure API autodiscovery](https://docs.mulesoft.com/anypoint-code-builder/int-configure-api-autodiscovery-local)
