(function () {
  "use strict";
  const loaded = Store.load();
  let data = loaded.data;
  const state = {
    view: "dashboard",
    month: Timelines.currentMonth(),
    mode: "committed",
    filters: {},
  };
  const $ = (s) => document.querySelector(s),
    modal = $("#modal"),
    form = $("#modal-form");
  function persist(message) {
    Store.save(data);
    render();
    if (message) toast(message);
  }
  function render() {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const target = $(`#view-${state.view}`);
    target.classList.add("active");
    target.innerHTML = UI.render(state.view, data, state);
    document
      .querySelectorAll(".nav-item")
      .forEach((x) =>
        x.classList.toggle("active", x.dataset.view === state.view),
      );
    $("#selected-month").value = state.month;
  }
  function toast(msg) {
    const e = document.createElement("div");
    e.className = "toast";
    e.setAttribute("role", "status");
    e.textContent = msg;
    document.body.append(e);
    setTimeout(() => e.remove(), 2600);
  }
  function showModal(title, eyebrow, body, onSave, saveLabel = "Save changes") {
    $("#modal-title").textContent = title;
    $("#modal-eyebrow").textContent = eyebrow;
    $("#modal-body").innerHTML = body;
    $("#modal-actions").innerHTML =
      `<button type="button" class="quiet-button" data-close>Cancel</button><button type="submit" class="primary-button">${saveLabel}</button>`;
    form.onsubmit = (e) => {
      e.preventDefault();
      onSave(new FormData(form));
    };
    modal.showModal();
  }
  function close() {
    modal.close();
  }
  function advisory(notes, commit) {
    if (!notes.length) {
      commit();
      return;
    }
    $("#confirm-body").innerHTML =
      notes.map((n) => `<div class="advisory">△ ${UI.esc(n)}</div>`).join("") +
      "<p>Warnings are advisory. Invalid values remain blocked.</p>";
    const d = $("#confirm-dialog");
    d.showModal();
    d.onclose = () => {
      if (d.returnValue === "confirm") commit();
    };
  }
  function commonFields(entity, type) {
    return `<div class="form-grid"><div class="field"><label>${type} name</label><input name="name" required value="${UI.esc(entity?.name || "")}"></div><div class="field"><label>Effective month</label><input type="month" name="month" required value="${state.month}"></div><div class="field full"><label>Description</label><textarea name="description">${UI.esc(entity?.description || "")}</textarea></div>`;
  }
  function projectModal(id) {
    const p = id ? data.projects.find((x) => x.id === id) : null,
      current = p ? Calc.lifecycle(p, state.month) : "planned",
      r = p
        ? Calc.projectReservation(p, state.month)
        : { flow: 0, apiPre: 0, apiProd: 0 };
    showModal(
      p ? "Edit project" : "Add project",
      "Project plan",
      commonFields(p, "Project") +
        `<div class="field"><label>Owner or contact</label><input name="owner" value="${UI.esc(p?.owner || "")}"></div><div class="field"><label>Lifecycle</label><select name="lifecycle">${["planned", "active", "on-hold", "archived"].map((x) => `<option value="${x}" ${x === current ? "selected" : ""}>${UI.title(x)}</option>`).join("")}</select></div><div class="field"><label>Reserved flows</label><input type="number" min="0" name="flow" value="${r.flow}"></div><div class="field"><label>Reserved pre-production</label><input type="number" min="0" name="apiPre" value="${r.apiPre}"></div><div class="field"><label>Reserved production</label><input type="number" min="0" name="apiProd" value="${r.apiProd}"></div></div>`,
      (fd) => {
        const month = fd.get("month"),
          life = fd.get("lifecycle"),
          vals = {
            flow: +fd.get("flow"),
            apiPre: +fd.get("apiPre"),
            apiProd: +fd.get("apiProd"),
          };
        if (Object.values(vals).some((v) => v < 0))
          return toast("Values cannot be negative.");
        const notes = p
          ? Timelines.warnings(
              p.reservations,
              month,
              r,
              vals,
              "project reservations",
            )
          : [];
        if (life === "on-hold")
          notes.push(
            "On hold does not release reservations. Review whether reservations should remain.",
          );
        advisory(notes, () => {
          const now = new Date().toISOString(),
            x = p || {
              id: Store.id("project"),
              builtIn: false,
              lifecycle: [],
              reservations: [],
              archive: null,
              createdAt: now,
            };
          Object.assign(x, {
            name: fd.get("name").trim(),
            description: fd.get("description").trim(),
            owner: fd.get("owner").trim(),
            updatedAt: now,
          });
          x.lifecycle = Timelines.upsert(x.lifecycle, month, life);
          x.reservations = Timelines.upsert(x.reservations, month, vals);
          if (!p) data.projects.push(x);
          autoAssign(x.id, month);
          close();
          persist(p ? "Project updated." : "Project created.");
        });
      },
    );
  }
  function envFields(api, env) {
    const c = api
      ? Timelines.effective(api.environments[env], state.month, {})
      : {};
    return `<div class="env-box"><h3>${env.toUpperCase()}</h3><div class="field"><label>Flow state</label><select name="${env}Flow">${["inactive", "reserved", "used"].map((x) => `<option ${c.flowState === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>API Manager</label><select name="${env}Api">${["not-managed", "reserved", "used"].map((x) => `<option ${c.apiState === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>Replicas</label><input type="number" min="0" name="${env}Replicas" value="${c.replicas ?? (env === "prod" ? 2 : 1)}"></div><div class="field"><label>Flow override <span class="subtle">optional</span></label><input type="number" min="0" name="${env}Override" value="${c.flowOverride ?? ""}"></div></div>`;
  }
  function autoAssign(projectId, month) {
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) return;
    const remaining = { ...Calc.projectReservation(project, month) };
    data.apis
      .filter((api) => Calc.owner(api, month) === projectId)
      .forEach((api) => {
        const demand = Calc.apiDemand(api, month), values = {};
        Object.keys(Calc.POOLS).forEach((pool) => {
          values[pool] = Math.min(
            demand[pool].used + demand[pool].reserved,
            Number(remaining[pool] || 0),
          );
          remaining[pool] = Math.max(
            0,
            Number(remaining[pool] || 0) - values[pool],
          );
        });
        api.allocations = Timelines.upsert(api.allocations, month, values);
      });
  }

  function apiModal(id) {
    const api = id ? data.apis.find((x) => x.id === id) : null,
      life = api ? Calc.lifecycle(api, state.month) : "planned",
      owner = api ? Calc.owner(api, state.month) : "project_shared_platform",
      base = api ? Timelines.effective(api.baseFlows, state.month, 0) : 0;
    showModal(
      api ? "Edit API" : "Add API",
      "Effective-dated API",
      commonFields(api, "API") +
        `<div class="field"><label>Owning project</label><select name="owner">${data.projects.map((p) => `<option value="${p.id}" ${owner === p.id ? "selected" : ""}>${UI.esc(p.name)}</option>`).join("")}</select></div><div class="field"><label>Lifecycle</label><select name="lifecycle">${["planned", "in-development", "operational", "on-hold", "archived"].map((x) => `<option value="${x}" ${life === x ? "selected" : ""}>${UI.title(x)}</option>`).join("")}</select></div><div class="field"><label>Shared base flow count</label><input type="number" min="0" name="base" value="${base}"></div><div class="field full"><span class="group-label">Independent environment configuration</span><div class="env-grid">${["dev", "test", "prod"].map((e) => envFields(api, e)).join("")}</div></div></div>`,
      (fd) => {
        const month = fd.get("month"),
          newBase = +fd.get("base");
        if (
          newBase < 0 ||
          ["dev", "test", "prod"].some(
            (e) => +fd.get(`${e}Replicas`) < 0 || +fd.get(`${e}Override`) < 0,
          )
        )
          return toast("Flows and replicas cannot be negative.");
        const notes = api
          ? Timelines.warnings(
              api.baseFlows,
              month,
              base,
              newBase,
              "base flow count",
            )
          : [];
        if (api && owner !== fd.get("owner"))
          notes.push(
            "Changing the owning project recalculates reservation coverage for both projects.",
          );
        ["dev", "test", "prod"].forEach((e) => {
          if (api) {
            const old = Timelines.effective(api.environments[e], month, {}),
              next = {
                flowState: fd.get(`${e}Flow`),
                apiState: fd.get(`${e}Api`),
              };
            if (
              old.flowState !== next.flowState &&
              ["used", "reserved"].includes(old.flowState) &&
              ["used", "reserved"].includes(next.flowState)
            )
              notes.push(
                `${e.toUpperCase()} flow classification changes from ${old.flowState} to ${next.flowState}; total demand is unchanged.`,
              );
          }
        });
        advisory(notes, () => {
          const now = new Date().toISOString(),
            x = api || {
              id: Store.id("api"),
              owners: [],
              consumers: [],
              lifecycle: [],
              baseFlows: [],
              environments: { dev: [], test: [], prod: [] },
              allocations: [],
              archive: null,
              createdAt: now,
            };
          Object.assign(x, {
            name: fd.get("name").trim(),
            description: fd.get("description").trim(),
            updatedAt: now,
          });
          x.owners = Timelines.upsert(x.owners, month, fd.get("owner"));
          x.lifecycle = Timelines.upsert(
            x.lifecycle,
            month,
            fd.get("lifecycle"),
          );
          x.baseFlows = Timelines.upsert(x.baseFlows, month, newBase);
          ["dev", "test", "prod"].forEach(
            (e) =>
              (x.environments[e] = Timelines.upsert(x.environments[e], month, {
                flowState: fd.get(`${e}Flow`),
                apiState: fd.get(`${e}Api`),
                replicas: +fd.get(`${e}Replicas`),
                flowOverride:
                  fd.get(`${e}Override`) === ""
                    ? null
                    : +fd.get(`${e}Override`),
                notes: "",
              })),
          );
          if (!api) data.apis.push(x);
          autoAssign(owner, month);
          autoAssign(fd.get("owner"), month);
          close();
          persist(api ? "API timeline updated." : "API created.");
        });
      },
    );
  }
  function capacityModal(id) {
    const c = id ? data.capacityEntries.find((x) => x.id === id) : null;
    showModal(
      c ? "Edit capacity" : "Add capacity",
      "Organization supply",
      `<div class="form-grid"><div class="field"><label>License pool</label><select name="pool">${Object.entries(
        Calc.POOLS,
      )
        .map(
          ([k, v]) =>
            `<option value="${k}" ${c?.pool === k ? "selected" : ""}>${v}</option>`,
        )
        .join(
          "",
        )}</select></div><div class="field"><label>Quantity</label><input type="number" min="0" name="quantity" required value="${c?.quantity ?? 0}"></div><div class="field"><label>Effective month</label><input type="month" name="month" required value="${c?.effectiveMonth || state.month}"></div><div class="field"><label>Status</label><select name="status">${["planned", "ordered", "active", "cancelled"].map((x) => `<option ${c?.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field full"><label>Description or notes</label><textarea name="description">${UI.esc(c?.description || "")}</textarea></div></div>`,
      (fd) => {
        if (+fd.get("quantity") < 0)
          return toast("Quantity cannot be negative.");
        const notes = [];
        if (c && c.effectiveMonth < Timelines.currentMonth())
          notes.push(
            "This edits a historical capacity entry and may change historical forecasts.",
          );
        advisory(notes, () => {
          const now = new Date().toISOString(),
            x = c || { id: Store.id("capacity"), createdAt: now };
          Object.assign(x, {
            pool: fd.get("pool"),
            quantity: +fd.get("quantity"),
            effectiveMonth: fd.get("month"),
            status: fd.get("status"),
            description: fd.get("description").trim(),
            updatedAt: now,
          });
          if (!c) data.capacityEntries.push(x);
          close();
          persist(c ? "Capacity updated." : "Capacity added.");
        });
      },
    );
  }
  function archiveApi(id) {
    const api = data.apis.find((x) => x.id === id),
      archived = Calc.lifecycle(api, state.month) === "archived";
    if (archived) {
      advisory(
        [
          "Restoring lifecycle does not restore prior environment demand. Configure environments explicitly.",
        ],
        () => {
          api.lifecycle = Timelines.upsert(
            api.lifecycle,
            state.month,
            "planned",
          );
          api.archive = null;
          persist("API restored as planned.");
        },
      );
      return;
    }
    showModal(
      `Archive ${api.name}`,
      "Preserve history",
      `<div class="form-grid"><div class="field"><label>Effective month</label><input type="month" name="month" required value="${state.month}"></div><div class="field"><label>Reason</label><select name="reason">${["Cancelled", "Retired", "Replaced", "Duplicate or created by mistake", "Other"].map((x) => `<option>${x}</option>`).join("")}</select></div><div class="field full"><label>Archive notes</label><textarea name="notes" required></textarea></div></div>`,
      (fd) =>
        advisory(
          [
            "All future flow states become inactive and API Manager states become not managed. Capacity is released beginning in the archive month.",
          ],
          () => {
            const month = fd.get("month");
            api.lifecycle = Timelines.upsert(api.lifecycle, month, "archived");
            ["dev", "test", "prod"].forEach((e) => {
              const old = Timelines.effective(api.environments[e], month, {});
              api.environments[e] = Timelines.upsert(
                api.environments[e],
                month,
                {
                  ...old,
                  flowState: "inactive",
                  apiState: "not-managed",
                  replicas: 0,
                },
              );
            });
            api.archive = {
              effectiveMonth: month,
              reason: fd.get("reason"),
              notes: fd.get("notes"),
            };
            autoAssign(Calc.owner(api, month), month);
            close();
            persist("API archived; history preserved.");
          },
        ),
    );
  }
  function archiveProject(id) {
    const p = data.projects.find((x) => x.id === id);
    if (p.builtIn) return toast("The built-in project cannot be archived.");
    const archived = Calc.lifecycle(p, state.month) === "archived";
    if (archived) {
      p.lifecycle = Timelines.upsert(p.lifecycle, state.month, "active");
      p.archive = null;
      return persist("Project restored.");
    }
    const owned = data.apis.filter(
      (a) =>
        Calc.owner(a, state.month) === id &&
        Calc.lifecycle(a, state.month) !== "archived",
    );
    advisory(
      [
        `Archiving releases unassigned reservations and leaves ${owned.length} active API(s) to resolve. APIs are not automatically archived.`,
      ],
      () => {
        const s = Calc.projectStats(data, p, state.month);
        p.lifecycle = Timelines.upsert(p.lifecycle, state.month, "archived");
        p.reservations = Timelines.upsert(p.reservations, state.month, {
          flow: s.assigned.flow,
          apiPre: s.assigned.apiPre,
          apiProd: s.assigned.apiProd,
        });
        p.archive = { effectiveMonth: state.month, reason: "Archived by user" };
        persist("Project archived; assigned API capacity preserved.");
      },
    );
  }
  function resetWorkspace() {
    if (
      prompt(
        "This permanently removes all local projects, APIs, capacity, and backups. Type RESET to continue.",
      ) !== "RESET"
    )
      return;
    try {
      data = Store.reset();
      state.filters = {};
      render();
      toast("Workspace reset. Only Shared Platform / Unassigned remains.");
    } catch (error) {
      toast(`Reset failed: ${error.message}`);
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mulesoft-capacity-${state.month}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Complete dataset exported.");
  }
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        return toast(`Invalid JSON: ${e.message}`);
      }
      const errors = Validate.dataset(parsed);
      if (errors.length) {
        showModal(
          "Import validation failed",
          "Invalid dataset",
          errors
            .map((e) => `<div class="advisory">${UI.esc(e)}</div>`)
            .join(""),
          () => {},
          "Close",
        );
        $("#modal-actions").innerHTML =
          '<button type="button" class="primary-button" data-close>Close</button>';
        return;
      }
      showModal(
        "Replace current dataset?",
        "Validated import",
        `<div class="kpi-row"><div class="stat-card"><strong>${parsed.capacityEntries.length}</strong><span>Capacity entries</span></div><div class="stat-card"><strong>${parsed.projects.length}</strong><span>Projects</span></div><div class="stat-card"><strong>${parsed.apis.length}</strong><span>APIs</span></div></div><div class="advisory">Current local data will be replaced. A temporary backup will be stored at <code>${Store.BACKUP_KEY}</code>.</div>`,
        () => {
          Store.replace(parsed);
          data = parsed;
          close();
          render();
          toast("Import complete; prior data backed up.");
        },
        "Replace and import",
      );
    };
    reader.readAsText(file);
  }
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-view]");
    if (nav) {
      state.view = nav.dataset.view;
      state.filters = {};
      return render();
    }
    const action = e.target.closest("[data-action]")?.dataset.action,
      id = e.target.closest("[data-id]")?.dataset.id;
    if (!action) return;
    (
      ({
        "add-api": () => apiModal(),
        "edit-api": () => apiModal(id),
        "archive-api": () => archiveApi(id),
        "delete-api": () => {
          const a = data.apis.find((x) => x.id === id);
          if (
            confirm(
              `Permanently delete ${a.name} and all historical timelines? Type confirmation is required.`,
            ) &&
            prompt("Type DELETE to confirm") === "DELETE"
          ) {
            const projectId = Calc.owner(a, state.month);
            data.apis = data.apis.filter((x) => x.id !== id);
            autoAssign(projectId, state.month);
            persist("API permanently deleted.");
          }
        },
        "add-project": () => projectModal(),
        "edit-project": () => projectModal(id),
        "archive-project": () => archiveProject(id),
        "add-capacity": () => capacityModal(),
        "edit-capacity": () => capacityModal(id),
        "cancel-capacity": () => {
          const c = data.capacityEntries.find((x) => x.id === id);
          c.status = c.status === "cancelled" ? "planned" : "cancelled";
          persist("Capacity status updated.");
        },
        "delete-capacity": () => {
          if (
            confirm(
              "Permanently delete this capacity entry? Historical forecasts may change.",
            )
          ) {
            data.capacityEntries = data.capacityEntries.filter(
              (x) => x.id !== id,
            );
            persist("Capacity entry deleted.");
          }
        },
        export: exportData,
        import: () => $("#import-file").click(),
        sample: () => {
          if (
            (data.apis.length || data.capacityEntries.length) &&
            !confirm("Replace current data with the 2027 sample scenario?")
          )
            return;
          Store.backup();
          data = SampleData.create();
          state.month = "2027-01";
          persist("2027 sample scenario loaded.");
        },
        reset: resetWorkspace,
      })[action] || (() => {})
    )();
  });
  document.addEventListener("input", (e) => {
    if (e.target.dataset.filter) {
      state.filters[e.target.dataset.filter] = e.target.value;
      render();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.dataset.filter) {
      state.filters[e.target.dataset.filter] = e.target.value;
      render();
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) close();
  });
  $("#selected-month").addEventListener("change", (e) => {
    if (Timelines.isMonth(e.target.value)) {
      state.month = e.target.value;
      render();
    }
  });
  $("#prev-month").onclick = () => {
    state.month = Timelines.addMonths(state.month, -1);
    render();
  };
  $("#next-month").onclick = () => {
    state.month = Timelines.addMonths(state.month, 1);
    render();
  };
  $("#today-month").onclick = () => {
    state.month = Timelines.currentMonth();
    render();
  };
  $("#import-file").onchange = (e) => {
    if (e.target.files[0]) importFile(e.target.files[0]);
    e.target.value = "";
  };
  window.addEventListener("storage", (e) => {
    if (e.key !== Store.KEY) return;
    const latest = Store.load();
    if (!latest.error) {
      data = latest.data;
      render();
      toast("Workspace updated from another browser tab.");
    }
  });
  if (loaded.error)
    $("#alert-region").innerHTML =
      `<div class="advisory"><strong>Stored data could not be read.</strong> ${UI.esc(loaded.error.message)} The corrupt value was not overwritten. Use Import / Export to reset or replace it.</div>`;
  if (!loaded.error) Store.save(data);

  render();
})();
