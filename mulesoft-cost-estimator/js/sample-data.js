(function (global) {
  "use strict";
  function create() {
    const now = new Date().toISOString(),
      Y = 2027,
      m = (n) => `${Y}-${String(n).padStart(2, "0")}`;
    const project = (id, name, status, res) => ({
      id,
      name,
      description: `${name} capacity plan`,
      owner: name === "Customer Experience" ? "Jamie Chen" : "",
      builtIn: false,
      lifecycle: [{ effectiveMonth: m(1), value: status }],
      reservations: [{ effectiveMonth: m(1), value: res }],
      archive: null,
      createdAt: now,
      updatedAt: now,
    });
    const shared = Store.empty().projects[0];
    const projects = [
      shared,
      project("project_cx", "Customer Experience", "active", {
        flow: 10,
        apiPre: 3,
        apiProd: 1,
      }),
      project("project_orders", "Order Modernization", "active", {
        flow: 8,
        apiPre: 2,
        apiProd: 1,
      }),
      project("project_insights", "Data Insights", "planned", {
        flow: 6,
        apiPre: 2,
        apiProd: 1,
      }),
    ];
    function api(id, name, owner, status, base, envs, alloc, extra = {}) {
      return {
        id,
        name,
        description: extra.description || `${name} API`,
        owners: [{ effectiveMonth: m(1), value: owner }],
        consumers: extra.consumers || [],
        lifecycle: [{ effectiveMonth: m(1), value: status }],
        baseFlows: [{ effectiveMonth: m(1), value: base }],
        environments: {
          dev: [{ effectiveMonth: m(1), value: envs.dev }],
          test: [{ effectiveMonth: m(1), value: envs.test }],
          prod: [{ effectiveMonth: m(1), value: envs.prod }],
        },
        allocations: [{ effectiveMonth: m(1), value: alloc }],
        archive: extra.archive || null,
        createdAt: now,
        updatedAt: now,
      };
    }
    const cfg = (f, a, r = 1, o = null) => ({
      flowState: f,
      apiState: a,
      replicas: r,
      flowOverride: o,
      notes: "",
    });
    const apis = [
      api(
        "api_customer",
        "Customer Profile",
        "project_cx",
        "operational",
        2,
        {
          dev: cfg("used", "used"),
          test: cfg("used", "used", 2),
          prod: cfg("used", "used", 3),
        },
        { flow: 9, apiPre: 2, apiProd: 1 },
        {
          consumers: [
            {
              projectId: "project_orders",
              startMonth: m(3),
              endMonth: "",
              notes: "Order checkout consumer",
            },
          ],
        },
      ),
      api(
        "api_orders",
        "Order Orchestration",
        "project_orders",
        "in-development",
        3,
        {
          dev: cfg("used", "used"),
          test: cfg("reserved", "reserved", 2),
          prod: cfg("reserved", "reserved", 2),
        },
        { flow: 8, apiPre: 2, apiProd: 1 },
      ),
      api(
        "api_forecast",
        "Demand Forecast",
        "project_insights",
        "planned",
        2,
        {
          dev: cfg("reserved", "reserved"),
          test: cfg("inactive", "not-managed", 0),
          prod: cfg("inactive", "not-managed", 0),
        },
        { flow: 0, apiPre: 0, apiProd: 0 },
      ),
      api(
        "api_shared",
        "Identity Gateway",
        "project_shared_platform",
        "operational",
        1,
        {
          dev: cfg("used", "used"),
          test: cfg("used", "used"),
          prod: cfg("used", "used", 2),
        },
        { flow: 0, apiPre: 0, apiProd: 0 },
      ),
      api(
        "api_legacy",
        "Legacy Quote",
        "project_cx",
        "archived",
        1,
        {
          dev: cfg("inactive", "not-managed", 0),
          test: cfg("inactive", "not-managed", 0),
          prod: cfg("inactive", "not-managed", 0),
        },
        { flow: 0, apiPre: 0, apiProd: 0 },
        {
          archive: {
            effectiveMonth: m(4),
            reason: "Cancelled",
            notes: "Sample cancelled API",
          },
        },
      ),
    ];
    const cap = (id, pool, q, month, status, description) => ({
      id,
      pool,
      quantity: q,
      effectiveMonth: month,
      status,
      description,
      createdAt: now,
      updatedAt: now,
    });
    return {
      schemaVersion: 1,
      metadata: {
        app: "MuleSoft Capacity Planner",
        sampleYear: Y,
        createdAt: now,
        updatedAt: now,
      },
      capacityEntries: [
        cap("cap_flow", "flow", 30, m(1), "active", "Core flow entitlement"),
        cap(
          "cap_pre",
          "apiPre",
          10,
          m(1),
          "active",
          "Initial pre-production capacity",
        ),
        cap(
          "cap_prod",
          "apiProd",
          10,
          m(1),
          "active",
          "Initial production capacity",
        ),
        cap("cap_aug", "apiPre", 5, m(8), "active", "August expansion"),
        cap("cap_oct", "apiPre", 10, m(10), "planned", "October forecast"),
        cap("cap_dec", "apiPre", 10, m(12), "planned", "December forecast"),
      ],
      projects,
      apis,
    };
  }
  global.SampleData = { create };
})(window);
