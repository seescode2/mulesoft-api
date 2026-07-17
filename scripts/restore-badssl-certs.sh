#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
resources_dir="${repo_root}/src/main/resources"
certs_dir="${resources_dir}/certs"

base64 --decode "${certs_dir}/badssl-client.p12.b64" > "${resources_dir}/badssl-client.p12"
base64 --decode "${certs_dir}/self-signed-badssl-truststore.jks.b64" > "${resources_dir}/self-signed-badssl-truststore.jks"

printf 'Restored BadSSL TLS resources:\n'
printf '  %s\n' "${resources_dir}/badssl-client.p12"
printf '  %s\n' "${resources_dir}/self-signed-badssl-truststore.jks"
