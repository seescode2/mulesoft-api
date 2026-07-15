# Deployment notes

This repository includes a GitHub Actions workflow that deploys the Mule application to Anypoint Platform when code is pushed or merged to a `release/*` branch.

## Required GitHub secrets

Configure these in the repository, organization, or selected GitHub environment secrets:

| Secret | Purpose |
| --- | --- |
| `ANYPOINT_CLIENT_ID` | Connected App client id with permissions to deploy to Runtime Manager / CloudHub 2.0. |
| `ANYPOINT_CLIENT_SECRET` | Connected App client secret. |
| `ANYPOINT_BUSINESS_GROUP_ID` | Anypoint business group id where the app will be deployed. |
| `ANYPOINT_ENVIRONMENT` | Target Anypoint environment name. Defaults to `Sandbox` if unset. |
| `ANYPOINT_TARGET` | CloudHub 2.0 private space, shared space, or target name. Defaults to `Cloudhub-US-East-2` if unset. |
| `CLOUDHUB_APP_NAME` | Unique CloudHub application name. Defaults to `mulesoft-todo-api-release` if unset. |
| `API_MANAGER_ID` | Optional API Manager instance id used by API autodiscovery; defaults to `0`. |

## Optional GitHub variables or secrets

These can be set as GitHub environment variables, repository variables, or secrets. The workflow provides defaults if omitted. Manual workflow runs can also override the Anypoint environment, deployment target, and CloudHub application name.

| Name | Default | Purpose |
| --- | --- | --- |
| `CLOUDHUB_REPLICAS` | `1` | CloudHub replica count. |
| `CLOUDHUB_VCORES` | `0.1` | vCore size per replica. |
| `MULE_RUNTIME_VERSION` | value in `pom.xml` | Mule runtime version. |

## API Manager id configuration

The workflow passes `API_MANAGER_ID` into Maven as `-Dapi.manager.id=...`. The Mule app uses that value in API autodiscovery, so you can provide it as either:

1. a GitHub secret named `API_MANAGER_ID`, or
2. a GitHub environment secret named `API_MANAGER_ID` attached to the deployment environment.

Prefer environment secrets when each release environment has a different API Manager instance id.
