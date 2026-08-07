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
    return `<article class="pool-card ${state}"><div class="pool-head"><h2>${Calc.POOLS[key]}</h2>${badge(v.shortfall ? `⚠ Exceeded by ${n(v.shortfall)}` : state ? "△ Near limit" : "✓ Healthy", v.shortfall ? "bad" : state ? "warn" : "good")}</div><div class="big-number">${n(v.purchased)} <small>purchased</small></div><div class="meter purchased-meter" title="Purchased capacity contains used, reserved, and extra"><span class="used" style="width:${usedPct}%"></span><span class="reserved" style="width:${reservedPct}%"></span></div><div class="capacity-equation">Purchased = Used + Reserved + Extra</div><div class="pool-stats"><div><span>Used</span><strong>${n(v.used)}</strong></div><div><span>Reserved</span><strong>${n(v.reserved)}</strong></div><div><span>Extra</span><strong class="${v.extra < 0 ? "negative" : ""}">${n(v.extra)}</strong></div></div></article>`;
  }
  function capacityGlossary() {
    return `<section class="panel capacity-glossary" aria-labelledby="capacity-terms-heading"><h2 id="capacity-terms-heading">How purchased capacity is divided</h2><p class="panel-sub">Each value applies to the selected month and is calculated separately for each capacity pool.</p><dl><div><dt>Purchased</dt><dd>The active or ordered capacity bought by the organization.</dd></div><div><dt>Used</dt><dd>Purchased capacity currently consumed by API environments marked used.</dd></div><div><dt>Reserved</dt><dd>Purchased capacity held for projects or API environments but not yet in use.</dd></div><div><dt>Extra</dt><dd>What remains after used and reserved capacity. A negative value means demand exceeds what was purchased.</dd></div></dl><p class="capacity-formula"><strong>Purchased</strong> = Used + Reserved + Extra</p></section>`;
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
        )}</div>${capacityGlossary()}<div class="dashboard-grid"><div><section class="panel"><h2>Flow demand by environment</h2><p class="panel-sub">Used and reserved flow licenses; replicas are included.</p>${[
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
  function apis(data, state) {
    let rows = data.apis.filter((a) => {
      const q = (state.filters.search || "").toLowerCase(),
        life = Calc.lifecycle(a, state.month),
        own = Calc.owner(a, state.month),
        d = Calc.apiDemand(a, state.month);
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (state.filters.owner && state.filters.owner !== own) return false;
      if (state.filters.lifecycle && state.filters.lifecycle !== life)
        return false;
      if (state.filters.demand === "used" && !d.flow.used) return false;
      if (state.filters.demand === "reserved" && !d.flow.reserved) return false;
      if (
        state.filters.demand === "override" &&
        !["dev", "test", "prod"].some((e) => {
          const c = Timelines.effective(a.environments[e], state.month, {});
          return (
            c.flowOverride !== null &&
            c.flowOverride !== "" &&
            c.flowOverride !== undefined
          );
        })
      )
        return false;
      return true;
    });
    const project = (id) =>
      (data.projects.find((p) => p.id === id) || { name: "Missing project" })
        .name;
    return (
      head(
        "API portfolio",
        "APIs",
        `Configuration and demand effective ${Timelines.label(state.month)}.`,
        `<button class="primary-button" data-action="add-api">+ Add API</button>`,
      ) +
      filters("APIs", data, state) +
      `<div class="table-wrap"><table><thead><tr><th>API</th><th>Owning project</th><th>Lifecycle</th><th>DEV</th><th>TEST</th><th>PROD</th><th>Used flows</th><th>Reserved flows</th><th>API Manager pre/prod</th><th>Consumers</th><th></th></tr></thead><tbody>${
        rows
          .map((a) => {
            const d = Calc.apiDemand(a, state.month),
              env = (e) =>
                Timelines.effective(a.environments[e], state.month, {
                  flowState: "inactive",
                  apiState: "not-managed",
                });
            return `<tr><td><strong>${esc(a.name)}</strong><span class="subtle">Base ${n(Timelines.effective(a.baseFlows, state.month, 0))} flows</span></td><td>${esc(project(Calc.owner(a, state.month)))}</td><td>${badge(title(Calc.lifecycle(a, state.month)))}</td>${["dev", "test", "prod"].map((e) => `<td><span class="state ${env(e).flowState}">${title(env(e).flowState)}</span><br><span class="subtle">AM: ${title(env(e).apiState)}</span></td>`).join("")}<td>${n(d.flow.used)}</td><td>${n(d.flow.reserved)}</td><td>${n(d.apiPre.used + d.apiPre.reserved)} / ${n(d.apiProd.used + d.apiProd.reserved)}</td><td>${a.consumers.filter((c) => c.startMonth <= state.month && (!c.endMonth || c.endMonth >= state.month)).length}</td><td><div class="row-actions"><button data-action="edit-api" data-id="${a.id}">Edit</button><button data-action="archive-api" data-id="${a.id}">${Calc.lifecycle(a, state.month) === "archived" ? "Restore" : "Archive"}</button><button data-action="delete-api" data-id="${a.id}">Delete</button></div></td></tr>`;
          })
          .join("") ||
        `<tr><td colspan="11"><div class="empty">No APIs match these filters.</div></td></tr>`
      }</tbody></table></div>`
    );
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
      `<div class="table-wrap"><table><thead><tr><th>Project</th><th>Lifecycle</th><th>Owned APIs</th><th>Consumer links</th><th>Reserved flows</th><th>Covered</th><th>Unassigned</th><th>Pre-prod</th><th>Production</th><th>Overrun</th><th></th></tr></thead><tbody>${rows
        .map((p) => {
          const s = Calc.projectStats(data, p, state.month),
            owned = data.apis.filter(
              (a) => Calc.owner(a, state.month) === p.id,
            ).length,
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
            over = Object.values(s.overrun).reduce((a, b) => a + b, 0);
          return `<tr><td><strong>${esc(p.name)}</strong><span class="subtle">${p.builtIn ? "Built-in · protected" : esc(p.owner || "No owner")}</span></td><td>${badge(title(Calc.lifecycle(p, state.month)))}</td><td>${owned}</td><td>${consumer}</td><td>${n(s.reservation.flow)}</td><td>${n(s.assigned.flow)}</td><td>${n(s.unassigned.flow)}</td><td>${n(s.reservation.apiPre)}</td><td>${n(s.reservation.apiProd)}</td><td>${over ? badge(`△ ${n(over)}`, "warn") : badge("✓", "good")}</td><td><div class="row-actions"><button data-action="edit-project" data-id="${p.id}">Edit</button><button data-action="archive-project" data-id="${p.id}">${Calc.lifecycle(p, state.month) === "archived" ? "Restore" : "Archive"}</button></div></td></tr>`;
        })
        .join("")}</tbody></table></div>`
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
              `<tr><td><strong>${Calc.POOLS[c.pool]}</strong></td><td>${n(c.quantity)}</td><td>${Timelines.label(c.effectiveMonth)}</td><td>${badge(title(c.status), c.status === "planned" ? "warn" : "")}</td><td>${esc(c.description || "—")}</td><td>${["active", "ordered"].includes(c.status) ? "✓ Yes" : "— No"}</td><td><div class="row-actions"><button data-action="edit-capacity" data-id="${c.id}">Edit</button><button data-action="cancel-capacity" data-id="${c.id}">${c.status === "cancelled" ? "Restore" : "Cancel"}</button><button data-action="delete-capacity" data-id="${c.id}">Delete</button></div></td></tr>`,
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
