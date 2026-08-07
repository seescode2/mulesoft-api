(function (global) {
  "use strict";
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const n = (v) => Number(v || 0).toLocaleString();
  const title = (s) =>
    String(s || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const badge = (text, type = "") =>
    `<span class="badge ${type}">${esc(text)}</span>`;
  const capacityTerms = {
    used: "Capacity currently consumed by API environments marked used.",
    reserved:
      "Capacity held for projects or API environments but not yet in use.",
    extra:
      "Capacity remaining after used and reserved demand. A negative value means demand exceeds purchased capacity.",
  };
  function capacityLabel(term) {
    return `<span class="capacity-label">${title(term)} <button type="button" class="info-tip" aria-label="${title(term)}: ${esc(capacityTerms[term])}" data-tooltip="${esc(capacityTerms[term])}">i</button></span>`;
  }
  function head(eyebrow, h, sub, actions = "") {
    return `<header class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${h}</h1><p>${sub}</p></div><div class="actions">${actions}</div></header>`;
  }
  function poolCard(key, v) {
    const state = v.shortfall
        ? "danger"
        : v.purchased && v.extra < Math.max(1, v.purchased * 0.15)
          ? "warning"
          : "",
      usedPct = v.purchased
        ? Math.min(100, (v.used / v.purchased) * 100)
        : 0,
      reservedPct = v.purchased
        ? Math.min(100 - usedPct, (v.reserved / v.purchased) * 100)
        : 0;
    return `<article class="pool-card ${state}"><div class="pool-head"><h2>${Calc.POOLS[key]}</h2>${badge(v.shortfall ? `⚠ Exceeded by ${n(v.shortfall)}` : state ? "△ Near limit" : "✓ Healthy", v.shortfall ? "bad" : state ? "warn" : "good")}</div><div class="big-number">${n(v.purchased)} <small>purchased</small></div><div class="meter purchased-meter" title="Purchased capacity contains used, reserved, and extra"><span class="used" style="width:${usedPct}%"></span><span class="reserved" style="width:${reservedPct}%"></span></div><div class="capacity-equation">Purchased = Used + Reserved + Extra</div><div class="pool-stats"><div>${capacityLabel("used")}<strong>${n(v.used)}</strong></div><div>${capacityLabel("reserved")}<strong>${n(v.reserved)}</strong></div><div>${capacityLabel("extra")}<strong class="${v.extra < 0 ? "negative" : ""}">${n(v.extra)}</strong></div></div></article>`;
  }
  function dashboard(data, state) {
    const o = Calc.organization(data, state.month, state.mode),
      counts = {};
    ["operational", "planned", "in-development", "on-hold", "archived"].forEach(
      (s) =>
        (counts[s] = data.apis.filter(
          (a) => Calc.lifecycle(a, state.month) === s,
        ).length),
    );
    const pc = { active: 0, "on-hold": 0 };
    data.projects.forEach((p) => {
      const s = Calc.lifecycle(p, state.month);
      if (pc[s] !== undefined) pc[s]++;
    });
    const warns = [];
    Object.keys(Calc.POOLS).forEach((p) => {
      if (o[p].shortfall)
        warns.push(`${Calc.POOLS[p]} exceed capacity by ${n(o[p].shortfall)}.`);
    });
    data.projects.forEach((p) => {
      const s = Calc.projectStats(data, p, state.month);
      if (Object.values(s.overrun).some(Boolean))
        warns.push(`${p.name} has demand above its project reservation.`);
    });
    const max = Math.max(
      1,
      ...["dev", "test", "prod"].map(
        (e) => o.byEnv[e].used + o.byEnv[e].reserved,
      ),
    );
    return (
      head(
        "Monthly command center",
        Timelines.label(state.month),
        "Purchased capacity and delivery demand for the selected month.",
      ) +
      `<div class="metric-grid">${Object.keys(Calc.POOLS)
        .map((p) => poolCard(p, o[p]))
        .join(
          "",
        )}</div><div class="dashboard-grid"><div><section class="panel"><h2>Flow demand by environment</h2><p class="panel-sub">Used and reserved flow licenses; replicas are included.</p>${[
        "dev",
        "test",
        "prod",
      ]
        .map((e) => {
          const x = o.byEnv[e];
          return `<div class="breakdown-row"><strong>${e.toUpperCase()}</strong><div class="bar"><span class="used" style="width:${(x.used / max) * 100}%"></span><span class="reserved" style="width:${(x.reserved / max) * 100}%"></span></div><span>${n(x.used + x.reserved)}</span></div>`;
        })
        .join(
          "",
        )}<div class="legend"><span><i style="background:#1769e0"></i>Used</span><span><i style="background:#f79009"></i>Reserved</span></div></section><section class="panel"><h2>Portfolio pulse</h2><p class="panel-sub">Lifecycle is informational and never changes capacity automatically.</p><div class="kpi-row"><div class="stat-card"><strong>${counts.operational}</strong><span>Operational APIs</span></div><div class="stat-card"><strong>${counts.planned}</strong><span>Planned APIs</span></div><div class="stat-card"><strong>${counts["on-hold"]}</strong><span>APIs on hold</span></div><div class="stat-card"><strong>${pc.active}</strong><span>Active projects</span></div></div></section></div><aside><section class="panel"><h2>Attention needed</h2><p class="panel-sub">Advisory only—changes are never automatic.</p><div class="warning-list">${warns.length ? warns.map((w) => `<div class="warning-item"><span>△</span><span>${esc(w)}</span></div>`).join("") : '<div class="empty">✓ No capacity warnings for this month.</div>'}</div></section><section class="panel"><h2>Future capacity</h2><p class="panel-sub">Capacity becoming available after this month.</p>${
        Calc.futureCapacity(data, state.month)
          .slice(0, 5)
          .map(
            (c) =>
              `<div class="breakdown-row"><span>${Timelines.label(c.effectiveMonth)}</span><strong>${n(c.quantity)} ${title(c.pool)}</strong>${badge(title(c.status), c.status === "planned" ? "warn" : "")}</div>`,
          )
          .join("") || '<div class="empty">No future entries.</div>'
      }</section></aside></div>`
    );
  }
  function filters(kind, data, state) {
    const projects = data.projects
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join("");
    return `<div class="toolbar"><input type="search" data-filter="search" placeholder="Search ${kind} by name…" value="${esc(state.filters.search || "")}">${kind === "APIs" ? `<select data-filter="owner"><option value="">All owning projects</option>${projects}</select><select data-filter="lifecycle"><option value="">All lifecycle states</option>${["planned", "in-development", "operational", "on-hold", "archived"].map((x) => `<option>${x}</option>`).join("")}</select><select data-filter="demand"><option value="">Reserved and used</option><option value="used">Used</option><option value="reserved">Reserved</option><option value="override">With overrides</option></select>` : `<select data-filter="lifecycle"><option value="">All lifecycle states</option>${["planned", "active", "on-hold", "archived"].map((x) => `<option>${x}</option>`).join("")}</select>`}</div>`;
  }
  function architectureLayer(api) {
    const explicit = String(api.architectureLayer || "").toLowerCase(),
      aliases = {
        exp: "experience",
        experience: "experience",
        prc: "process",
        process: "process",
        sys: "system",
        system: "system",
      };
    if (aliases[explicit]) return aliases[explicit];
    const words = `${api.name || ""} ${api.description || ""}`.toLowerCase();
    if (/system|database|record|identity|legacy|sap|salesforce/.test(words))
      return "system";
    if (/experience|channel|mobile|web|portal|gateway|customer/.test(words))
      return "experience";
    return "process";
  }
  function projectName(data, id) {
    return (
      data.projects.find((project) => project.id === id) || {
        name: "Missing project",
      }
    ).name;
  }
  function groupClass(data, projectId) {
    const index = Math.max(
      0,
      data.projects.findIndex((project) => project.id === projectId),
    );
    return `group-color-${index % 8}`;
  }
  function architectureFilters(data, state) {
    return `<div class="toolbar architecture-toolbar"><input type="search" data-filter="search" placeholder="Search architecture assets…" value="${esc(state.filters.search || "")}"><select data-filter="lifecycle"><option value="">All lifecycle states</option>${["planned", "in-development", "operational", "on-hold", "archived"].map((x) => `<option value="${x}" ${state.filters.lifecycle === x ? "selected" : ""}>${title(x)}</option>`).join("")}</select></div>`;
  }
  function apis(data, state) {
    const workloads = data.nonApiWorkloads || [],
      q = (state.filters.search || "").toLowerCase(),
      matches = (item, lifecycle) =>
        (!q ||
          `${item.name || ""} ${item.description || ""}`
            .toLowerCase()
            .includes(q)) &&
        (!state.filters.lifecycle || state.filters.lifecycle === lifecycle),
      matchingApis = data.apis.filter((api) =>
        matches(api, Calc.lifecycle(api, state.month)),
      ),
      matchingWorkloads = workloads.filter((workload) =>
        matches(workload, workload.lifecycle || "operational"),
      ),
      apiRows = matchingApis.filter(
        (api) =>
          !state.filters.owner ||
          state.filters.owner === Calc.owner(api, state.month),
      ),
      workloadRows = matchingWorkloads.filter(
        (workload) =>
          !state.filters.owner ||
          state.filters.owner ===
            (workload.projectId || "project_shared_platform"),
      ),
      layers = [
        {
          id: "experience",
          short: "EXP",
          name: "Experience APIs",
          description: "Channel-facing APIs tailored to a consumer experience.",
          items: apiRows.filter(
            (api) => architectureLayer(api) === "experience",
          ),
        },
        {
          id: "process",
          short: "PRC",
          name: "Process APIs",
          description: "Business orchestration and reusable process logic.",
          items: apiRows.filter((api) => architectureLayer(api) === "process"),
        },
        {
          id: "system",
          short: "SYS",
          name: "System APIs",
          description: "Controlled access to systems of record and core data.",
          items: apiRows.filter((api) => architectureLayer(api) === "system"),
        },
      ],
      activeProjectIds = new Set([
        ...matchingApis.map((api) => Calc.owner(api, state.month)),
        ...matchingWorkloads.map(
          (workload) =>
            workload.projectId || "project_shared_platform",
        ),
      ]),
      groupButtons = data.projects
        .filter((project) => activeProjectIds.has(project.id))
        .map((project) => {
          const count =
            matchingApis.filter(
              (api) => Calc.owner(api, state.month) === project.id,
            ).length +
            matchingWorkloads.filter(
              (workload) =>
                (workload.projectId || "project_shared_platform") ===
                project.id,
            ).length;
          return `<button class="group-key ${groupClass(data, project.id)} ${state.filters.owner === project.id ? "active" : ""}" data-group-filter="${esc(project.id)}"><i></i>${esc(project.name)} <strong>${count}</strong></button>`;
        })
        .join(""),
      apiPill = (api) => {
        const owner = Calc.owner(api, state.month),
          demand = Calc.apiDemand(api, state.month);
        return `<button class="architecture-pill ${groupClass(data, owner)}" data-action="inspect-architecture-item" data-kind="api" data-id="${esc(api.id)}"><i></i><span><strong>${esc(api.name)}</strong><small>${esc(projectName(data, owner))} · ${n(demand.totalFlows)} flows</small></span><b aria-hidden="true">›</b></button>`;
      },
      workloadPill = (workload) => {
        const owner = workload.projectId || "project_shared_platform";
        return `<button class="architecture-pill workload-pill ${groupClass(data, owner)}" data-action="inspect-architecture-item" data-kind="workload" data-id="${esc(workload.id)}"><i></i><span><strong>${esc(workload.name)}</strong><small>${esc(projectName(data, owner))} · ${esc(workload.kind || "Non-API workload")}</small></span><b aria-hidden="true">›</b></button>`;
      };
    return (
      head(
        "API-led architecture",
        "APIs",
        `Read-only architecture and demand effective ${Timelines.label(state.month)}. Select any asset to inspect it.`,
      ) +
      architectureFilters(data, state) +
      `<section class="architecture-groups" aria-label="Architecture groups"><div><span class="group-label">Group by owning project</span><p>Color identifies the project responsible for each asset.</p></div><div class="group-keys"><button class="group-key group-all ${state.filters.owner ? "" : "active"}" data-group-filter=""><i></i>All groups</button>${groupButtons}</div></section><div class="architecture-stack">${layers
        .map(
          (layer) =>
            `<section class="architecture-layer layer-${layer.id}"><header><span class="layer-code">${layer.short}</span><div><h2>${layer.name}</h2><p>${layer.description}</p></div><strong>${layer.items.length}</strong></header><div class="architecture-pills">${layer.items.map(apiPill).join("") || `<div class="layer-empty">No ${layer.name.toLowerCase()} match this view.</div>`}</div></section>`,
        )
        .join("")}<section class="architecture-layer layer-workload"><header><span class="layer-code">JOB</span><div><h2>Non-API workloads</h2><p>Scheduled processes, batch jobs, event workers, and other runtime workloads.</p></div><strong>${workloadRows.length}</strong></header><div class="architecture-pills">${workloadRows.map(workloadPill).join("") || '<div class="layer-empty">No non-API workloads are recorded in this dataset.</div>'}</div></section></div>`
    );
  }
  function architectureDetail(data, state, kind, id) {
    if (kind === "workload") {
      const workload = (data.nonApiWorkloads || []).find(
        (item) => item.id === id,
      );
      if (!workload) return '<div class="empty">Workload not found.</div>';
      const owner = workload.projectId || "project_shared_platform";
      return `<div class="inspector-heading"><span class="layer-code">JOB</span><p class="eyebrow">${esc(workload.kind || "Non-API workload")}</p><h2>${esc(workload.name)}</h2><p>${esc(workload.description || "No description provided.")}</p></div><div class="inspector-stats"><div><span>Group</span><strong>${esc(projectName(data, owner))}</strong></div><div><span>Lifecycle</span><strong>${title(workload.lifecycle || "operational")}</strong></div><div><span>Schedule</span><strong>${esc(workload.schedule || "Not recorded")}</strong></div><div><span>Environment</span><strong>${esc((Array.isArray(workload.environments) ? workload.environments : []).map((env) => String(env).toUpperCase()).join(", ") || "Not recorded")}</strong></div><div><span>Used flows</span><strong>${n(workload.flowUsed)}</strong></div><div><span>Reserved flows</span><strong>${n(workload.flowReserved)}</strong></div></div>`;
    }
    const api = data.apis.find((item) => item.id === id);
    if (!api) return '<div class="empty">API not found.</div>';
    const owner = Calc.owner(api, state.month),
      demand = Calc.apiDemand(api, state.month),
      layer = architectureLayer(api),
      layerCodes = { experience: "EXP", process: "PRC", system: "SYS" },
      environments = ["dev", "test", "prod"]
        .map((env) => {
          const config = Timelines.effective(
            api.environments[env],
            state.month,
            { flowState: "inactive", apiState: "not-managed", replicas: 0 },
          );
          return `<div class="inspector-environment"><strong>${env.toUpperCase()}</strong><span class="state ${config.flowState}">${title(config.flowState)}</span><small>${n(demand.byEnv[env].used)} used · ${n(demand.byEnv[env].reserved)} reserved flows</small><small>API Manager: ${title(config.apiState)} · ${n(config.replicas)} replicas</small></div>`;
        })
        .join("");
    return `<div class="inspector-heading"><span class="layer-code">${layerCodes[layer]}</span><p class="eyebrow">${title(layer)} API</p><h2>${esc(api.name)}</h2><p>${esc(api.description || "No description provided.")}</p></div><div class="inspector-stats"><div><span>Group</span><strong>${esc(projectName(data, owner))}</strong></div><div><span>Lifecycle</span><strong>${title(Calc.lifecycle(api, state.month))}</strong></div><div><span>Base flows</span><strong>${n(Timelines.effective(api.baseFlows, state.month, 0))}</strong></div><div><span>Used flows</span><strong>${n(demand.flow.used)}</strong></div><div><span>Reserved flows</span><strong>${n(demand.flow.reserved)}</strong></div><div><span>API Manager pre-prod</span><strong>${n(demand.apiPre.used)} used · ${n(demand.apiPre.reserved)} reserved</strong></div><div><span>API Manager production</span><strong>${n(demand.apiProd.used)} used · ${n(demand.apiProd.reserved)} reserved</strong></div></div><section class="inspector-section"><h3>Environment demand</h3><div class="inspector-environments">${environments}</div></section>`;
  }
  function projects(data, state) {
    let rows = data.projects.filter((p) => {
      const q = (state.filters.search || "").toLowerCase(),
        life = Calc.lifecycle(p, state.month);
      return (
        (!q || p.name.toLowerCase().includes(q)) &&
        (!state.filters.lifecycle || state.filters.lifecycle === life)
      );
    });
    return (
      head(
        "Delivery portfolio",
        "Projects",
        `Reservations and API ownership effective ${Timelines.label(state.month)}.`,
        `<button class="primary-button" data-action="add-project">+ Add project</button>`,
      ) +
      filters("Projects", data, state) +
      `<div class="project-list">${rows
        .map((p) => {
          const s = Calc.projectStats(data, p, state.month),
            owned = data.apis.filter(
              (a) => Calc.owner(a, state.month) === p.id,
            ),
            consumer = data.apis.reduce(
              (x, a) =>
                x +
                a.consumers.filter(
                  (c) =>
                    c.projectId === p.id &&
                    c.startMonth <= state.month &&
                    (!c.endMonth || c.endMonth >= state.month),
                ).length,
              0,
            ),
            lifecycle = Calc.lifecycle(p, state.month),
            capacityCard = (pool) => {
              const names = {
                flow: "Flow licenses",
                apiPre: "API Manager pre-production",
                apiProd: "API Manager production",
              };
              return `<div class="project-capacity"><div class="project-capacity-head"><strong>${names[pool]}</strong>${s.overrun[pool] ? badge(`△ ${n(s.overrun[pool])} over`, "warn") : badge("Covered", "good")}</div><div class="project-stat-row"><span><small>Project reservation</small><strong>${n(s.reservation[pool])}</strong></span><span><small>Used by APIs</small><strong>${n(s.usage[pool].used)}</strong></span><span><small>Reserved by APIs</small><strong>${n(s.usage[pool].reserved)}</strong></span><span><small>Unassigned</small><strong>${n(s.unassigned[pool])}</strong></span></div></div>`;
            },
            apiRows = owned
              .map((a) => {
                const d = Calc.apiDemand(a, state.month),
                  env = (e) =>
                    Timelines.effective(a.environments[e], state.month, {
                      flowState: "inactive",
                      apiState: "not-managed",
                    });
                return `<tr><td><strong>${esc(a.name)}</strong><span class="subtle">Base ${n(Timelines.effective(a.baseFlows, state.month, 0))} flows</span></td><td>${badge(title(Calc.lifecycle(a, state.month)))}</td>${["dev", "test", "prod"].map((e) => `<td><span class="state ${env(e).flowState}">${title(env(e).flowState)}</span><br><span class="subtle">AM: ${title(env(e).apiState)}</span></td>`).join("")}<td>${n(d.flow.used)}</td><td>${n(d.flow.reserved)}</td><td>${n(d.apiPre.used + d.apiPre.reserved)} / ${n(d.apiProd.used + d.apiProd.reserved)}</td><td><div class="row-actions"><button data-action="edit-api" data-id="${a.id}">Edit</button></div></td></tr>`;
              })
              .join("");
          return `<article class="project-card"><header class="project-card-head"><div><div class="project-title-line"><h2>${esc(p.name)}</h2>${badge(title(lifecycle))}</div><p>${p.builtIn ? "Built-in · protected" : esc(p.owner || "No owner")} · ${owned.length} owned API${owned.length === 1 ? "" : "s"} · ${consumer} consumer link${consumer === 1 ? "" : "s"}</p></div><div class="actions"><button class="primary-button" data-action="add-project-api" data-id="${p.id}" ${lifecycle === "archived" ? 'disabled title="Restore this project before adding an API"' : ""}>+ Add API</button><button class="quiet-button" data-action="edit-project" data-id="${p.id}">Edit project</button><button class="quiet-button" data-action="archive-project" data-id="${p.id}">${lifecycle === "archived" ? "Restore" : "Archive"}</button></div></header><div class="project-capacity-grid">${Object.keys(Calc.POOLS).map(capacityCard).join("")}</div><div class="project-apis"><div class="project-apis-head"><h3>APIs in this project</h3><span>Effective ${Timelines.label(state.month)}</span></div>${owned.length ? `<div class="table-wrap"><table><thead><tr><th>API</th><th>Lifecycle</th><th>DEV</th><th>TEST</th><th>PROD</th><th>Used flows</th><th>Reserved flows</th><th>API Manager pre/prod</th><th></th></tr></thead><tbody>${apiRows}</tbody></table></div>` : `<div class="empty project-api-empty">No APIs belong to this project for the selected month.<br><button class="quiet-button" data-action="add-project-api" data-id="${p.id}" ${lifecycle === "archived" ? "disabled" : ""}>+ Add the first API</button></div>`}</div></article>`;
        })
        .join("") || '<div class="empty">No projects match these filters.</div>'}</div>`
    );
  }
  function capacity(data, state) {
    return (
      head(
        "Organization supply",
        "Purchased Capacity",
        "Record capacity purchases independently from project and API demand.",
        `<button class="primary-button" data-action="add-capacity">+ Add purchase</button>`,
      ) +
      `<div class="table-wrap"><table><thead><tr><th>License pool</th><th>Quantity</th><th>Effective month</th><th>Status</th><th>Description</th><th>Counts as purchased</th><th></th></tr></thead><tbody>${
        data.capacityEntries
          .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
          .map(
            (c) =>
              `<tr><td><strong>${Calc.POOLS[c.pool]}</strong></td><td>${n(c.quantity)}</td><td>${Timelines.label(c.effectiveMonth)}</td><td>${badge(title(c.status), c.status === "planned" ? "warn" : "")}</td><td>${esc(c.description || "—")}</td><td>${c.status === "active" ? "✓ Yes" : "— No"}</td><td><div class="row-actions"><button data-action="edit-capacity" data-id="${c.id}">Edit</button><button data-action="delete-capacity" data-id="${c.id}">Delete</button></div></td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="7"><div class="empty">No capacity entries yet.</div></td></tr>`
      }</tbody></table></div>`
    );
  }
  function forecast(data, state) {
    const months = Array.from({ length: 12 }, (_, i) =>
      Timelines.addMonths(state.month, i),
    );
    return (
      head(
        "Twelve-month outlook",
        "Monthly Forecast",
        "Forward view preserves every explicit future override.",
      ) +
      `<div class="table-wrap"><table class="forecast-table"><thead><tr><th>Month</th>${Object.values(
        Calc.POOLS,
      )
        .map(
          (x) =>
            `<th>${x}<br><span class="subtle">purchased / used / reserved / extra</span></th>`,
        )
        .join("")}<th>Status</th></tr></thead><tbody>${months
        .map((m) => {
          const o = Calc.organization(data, m, state.mode),
            short = Object.values(Calc.POOLS).some(
              (_, i) => o[Object.keys(Calc.POOLS)[i]].shortfall,
            );
          return `<tr><td>${Timelines.label(m)}</td>${Object.keys(Calc.POOLS)
            .map(
              (p) =>
                `<td>${n(o[p].purchased)} / ${n(o[p].used)} / ${n(o[p].reserved)} / <strong class="${o[p].extra < 0 ? "negative" : ""}">${n(o[p].extra)}</strong></td>`,
            )
            .join(
              "",
            )}<td>${short ? badge("⚠ Shortfall", "bad") : badge("✓ Covered", "good")}</td></tr>`;
        })
        .join("")}</tbody></table></div>`
    );
  }
  function dataView(data) {
    return (
      head(
        "Data portability",
        "Import / Export",
        "Your complete normalized dataset remains under your control.",
      ) +
      `<div class="data-actions"><article class="action-tile"><h3>Export complete dataset</h3><p>Download schema, metadata, timelines, relationships, reservation coverage, and archive records.</p><button class="primary-button" data-action="export">Export JSON</button></article><article class="action-tile"><h3>Import and replace</h3><p>Validate a JSON file, preview its contents, then create a local backup before replacement.</p><button class="quiet-button" data-action="import">Choose JSON file</button></article><article class="action-tile"><h3>Sample planning scenario</h3><p>Load the clearly identified 2027 example with projects, overruns, and future purchases.</p><button class="quiet-button" data-action="sample">Load sample data</button></article><article class="action-tile"><h3>Reset local workspace</h3><p>Permanently remove all local data and backups. The required Shared Platform / Unassigned project will be recreated.</p><button class="danger-button" data-action="reset">Reset all data</button></article></div><section class="panel" style="margin-top:16px"><h2>Dataset summary</h2><p class="panel-sub">Schema ${data.schemaVersion} · localStorage key <code>${Store.KEY}</code></p><div class="kpi-row"><div class="stat-card"><strong>${data.capacityEntries.length}</strong><span>Capacity entries</span></div><div class="stat-card"><strong>${data.projects.length}</strong><span>Projects</span></div><div class="stat-card"><strong>${data.apis.length}</strong><span>APIs</span></div><div class="stat-card"><strong>${new Blob([JSON.stringify(data)]).size.toLocaleString()}</strong><span>Bytes</span></div></div></section>`
    );
  }
  global.UI = {
    esc,
    title,
    badge,
    architectureDetail,
    render(view, data, state) {
      return {
        dashboard,
        apis,
        projects,
        capacity,
        forecast,
        data: dataView,
      }[view](data, state);
    },
  };
})(window);
