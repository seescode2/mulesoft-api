(function (global) {
  "use strict";
  const POOLS = {
    flow: "Flow licenses",
    apiPre: "API Manager pre-production",
    apiProd: "API Manager production",
  };
  const emptyDemand = () => ({
    flow: { used: 0, reserved: 0 },
    apiPre: { used: 0, reserved: 0 },
    apiProd: { used: 0, reserved: 0 },
    byEnv: {
      dev: { used: 0, reserved: 0, apiUsed: 0, apiReserved: 0 },
      test: { used: 0, reserved: 0, apiUsed: 0, apiReserved: 0 },
      prod: { used: 0, reserved: 0, apiUsed: 0, apiReserved: 0 },
    },
  });
  function apiDemand(api, month) {
    const result = emptyDemand(),
      base = Number(Timelines.effective(api.baseFlows, month, 0)) || 0;
    ["dev", "test", "prod"].forEach((env) => {
      const cfg = Timelines.effective(api.environments[env], month, {
        flowState: "inactive",
        apiState: "not-managed",
        replicas: 0,
        flowOverride: null,
      });
      const count =
        cfg.flowOverride === null ||
        cfg.flowOverride === "" ||
        cfg.flowOverride === undefined
          ? base
          : Number(cfg.flowOverride);
      const flows =
        cfg.flowState === "inactive" ? 0 : count * Number(cfg.replicas || 0);
      if (cfg.flowState === "used") result.flow.used += flows;
      if (cfg.flowState === "reserved") result.flow.reserved += flows;
      result.byEnv[env][cfg.flowState === "used" ? "used" : "reserved"] +=
        flows;
      const pool = env === "prod" ? "apiProd" : "apiPre";
      if (cfg.apiState === "used") {
        result[pool].used += 1;
        result.byEnv[env].apiUsed += 1;
      }
      if (cfg.apiState === "reserved") {
        result[pool].reserved += 1;
        result.byEnv[env].apiReserved += 1;
      }
    });
    result.totalFlows = result.flow.used + result.flow.reserved;
    return result;
  }
  function owner(api, month) {
    return Timelines.effective(api.owners, month, "project_shared_platform");
  }
  function lifecycle(entity, month) {
    return Timelines.effective(entity.lifecycle, month, "planned");
  }
  function allocation(api, month) {
    return Timelines.effective(api.allocations, month, {
      flow: 0,
      apiPre: 0,
      apiProd: 0,
    });
  }
  function projectReservation(project, month) {
    return Timelines.effective(project.reservations, month, {
      flow: 0,
      apiPre: 0,
      apiProd: 0,
    });
  }
  function projectStats(data, project, month) {
    const reservation = projectReservation(project, month),
      assigned = { flow: 0, apiPre: 0, apiProd: 0 },
      demand = { flow: 0, apiPre: 0, apiProd: 0 },
      classified = { reserved: 0, used: 0 };
    data.apis
      .filter((a) => owner(a, month) === project.id)
      .forEach((api) => {
        const d = apiDemand(api, month),
          a = allocation(api, month);
        Object.keys(assigned).forEach((p) => {
          assigned[p] += Math.min(Number(a[p] || 0), d[p].used + d[p].reserved);
          demand[p] += d[p].used + d[p].reserved;
        });
        classified.used += d.flow.used;
        classified.reserved += d.flow.reserved;
      });
    const unassigned = {},
      overrun = {};
    Object.keys(assigned).forEach((p) => {
      unassigned[p] = Math.max(0, reservation[p] - assigned[p]);
      overrun[p] = Math.max(0, demand[p] - reservation[p]);
    });
    return { reservation, assigned, demand, unassigned, overrun, classified };
  }
  function organization(data, month) {
    const out = {},
      rawApi = emptyDemand(),
      reservedProjects = { flow: 0, apiPre: 0, apiProd: 0 },
      allocated = { flow: 0, apiPre: 0, apiProd: 0 };
    data.apis.forEach((api) => {
      const d = apiDemand(api, month);
      ["flow", "apiPre", "apiProd"].forEach((p) => {
        rawApi[p].used += d[p].used;
        rawApi[p].reserved += d[p].reserved;
      });
      ["dev", "test", "prod"].forEach((e) =>
        Object.keys(rawApi.byEnv[e]).forEach(
          (k) => (rawApi.byEnv[e][k] += d.byEnv[e][k]),
        ),
      );
    });
    data.projects.forEach((project) => {
      const s = projectStats(data, project, month);
      ["flow", "apiPre", "apiProd"].forEach((p) => {
        reservedProjects[p] += Number(s.reservation[p] || 0);
        allocated[p] += s.assigned[p];
      });
    });
    Object.keys(POOLS).forEach((pool) => {
      let purchased = 0;
      data.capacityEntries
        .filter(
          (c) =>
            c.pool === pool &&
            c.effectiveMonth <= month &&
            c.status !== "cancelled",
        )
        .forEach((c) => {
          if (["active", "ordered"].includes(c.status))
            purchased += c.quantity;
        });
      const reserved =
        Math.max(
          0,
          reservedProjects[pool] - Math.min(allocated[pool], rawApi[pool].used),
        ) + Math.max(0, rawApi[pool].reserved - allocated[pool]);
      const used = rawApi[pool].used;
      const totalDemand = used + reserved;
      const extra = purchased - totalDemand;
      out[pool] = {
        purchased,
        used,
        reserved,
        extra,
        shortfall: Math.max(0, -extra),
        totalDemand,
        allocated: allocated[pool],
      };
    });
    out.byEnv = rawApi.byEnv;
    return out;
  }
  function futureCapacity(data, month) {
    return data.capacityEntries
      .filter((c) => c.effectiveMonth > month && c.status !== "cancelled")
      .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
  }
  global.Calc = {
    POOLS,
    apiDemand,
    owner,
    lifecycle,
    allocation,
    projectReservation,
    projectStats,
    organization,
    futureCapacity,
  };
})(window);
