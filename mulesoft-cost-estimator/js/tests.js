(function () {
  "use strict";
  const results = [];
  function eq(name, actual, expected) {
    results.push({ name, pass: actual === expected, actual, expected });
  }
  const cfg = (flowState, apiState, replicas) => ({
      flowState,
      apiState,
      replicas,
      flowOverride: null,
      notes: "",
    }),
    api = {
      id: "acceptance",
      baseFlows: [{ effectiveMonth: "2027-01", value: 2 }],
      owners: [{ effectiveMonth: "2027-01", value: "p" }],
      lifecycle: [{ effectiveMonth: "2027-01", value: "operational" }],
      allocations: [],
      consumers: [],
      environments: {
        dev: [{ effectiveMonth: "2027-01", value: cfg("used", "used", 1) }],
        test: [
          { effectiveMonth: "2027-01", value: cfg("used", "reserved", 2) },
        ],
        prod: [
          { effectiveMonth: "2027-01", value: cfg("reserved", "reserved", 3) },
        ],
      },
    };
  const d = Calc.apiDemand(api, "2027-01");
  eq("DEV used flows", d.byEnv.dev.used, 2);
  eq("TEST used flows", d.byEnv.test.used, 4);
  eq("PROD reserved flows", d.byEnv.prod.reserved, 6);
  eq("Total flows", d.totalFlows, 12);
  eq("Used flows", d.flow.used, 6);
  eq("Reserved flows", d.flow.reserved, 6);
  eq("Pre-production used", d.apiPre.used, 1);
  eq("Pre-production reserved", d.apiPre.reserved, 1);
  eq("Production reserved", d.apiProd.reserved, 1);
  eq("Production used", d.apiProd.used, 0);
  api.allocations = [
    {
      effectiveMonth: "2027-01",
      value: { flow: 10, apiPre: 2, apiProd: 1 },
    },
  ];
  const project = {
      id: "p",
      reservations: [
        {
          effectiveMonth: "2027-01",
          value: { flow: 15, apiPre: 3, apiProd: 2 },
        },
      ],
    },
    projectStats = Calc.projectStats(
      { projects: [project], apis: [api] },
      project,
      "2027-01",
    );
  eq("Project rolls up used API flows", projectStats.usage.flow.used, 6);
  eq(
    "Project rolls up reserved API flows",
    projectStats.usage.flow.reserved,
    6,
  );
  eq(
    "Project rolls up used pre-production APIs",
    projectStats.usage.apiPre.used,
    1,
  );
  eq(
    "Project rolls up reserved pre-production APIs",
    projectStats.usage.apiPre.reserved,
    1,
  );
  eq(
    "Project rolls up reserved production APIs",
    projectStats.usage.apiProd.reserved,
    1,
  );
  eq(
    "Project shows unassigned flow reservation",
    projectStats.unassigned.flow,
    5,
  );
  const organizationData = {
    capacityEntries: [
      {
        pool: "flow",
        quantity: 15,
        effectiveMonth: "2027-01",
        status: "active",
      },
      {
        pool: "flow",
        quantity: 100,
        effectiveMonth: "2027-01",
        status: "planned",
      },
    ],
    projects: [],
    apis: [api],
  };
  let organization = Calc.organization(organizationData, "2027-01");
  eq("Purchased includes active capacity", organization.flow.purchased, 15);
  eq("Planned capacity is not purchased", organization.flow.purchased, 15);
  eq("Extra completes the capacity equation", organization.flow.extra, 3);
  organizationData.capacityEntries[0].quantity = 10;
  organization = Calc.organization(organizationData, "2027-01");
  eq("Extra becomes negative when demand exceeds purchases", organization.flow.extra, -2);
  eq("Purchased remains the recorded quantity", organization.flow.purchased, 10);
  const migrated = Store.migrate({
    capacityEntries: [
      { id: "ordered", status: "ordered" },
      { id: "cancelled", status: "cancelled" },
      { id: "planned", status: "planned" },
    ],
  });
  eq("Legacy ordered capacity becomes active", migrated.capacityEntries[0].status, "active");
  eq("Legacy cancelled capacity is removed", migrated.capacityEntries.length, 2);
  let t = [
    { effectiveMonth: "2027-01", value: 1 },
    { effectiveMonth: "2027-06", value: 2 },
    { effectiveMonth: "2027-10", value: 3 },
  ];
  t = Timelines.upsert(t, "2027-03", 4);
  eq("Historical insert applies in May", Timelines.effective(t, "2027-05"), 4);
  eq("Later June override preserved", Timelines.effective(t, "2027-06"), 2);
  eq("Later October override preserved", Timelines.effective(t, "2027-11"), 3);
  const values = {
      [Store.KEY]: "old workspace",
      [Store.BACKUP_KEY]: "old backup",
    },
    fakeStorage = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => (values[key] = value),
      removeItem: (key) => delete values[key],
    };
  const reset = Store.reset(fakeStorage);
  eq("Reset leaves only the built-in project", reset.projects.length, 1);
  eq("Reset removes user APIs", reset.apis.length, 0);
  eq("Reset removes non-API workloads", reset.nonApiWorkloads.length, 0);
  eq("Reset removes capacity", reset.capacityEntries.length, 0);
  eq(
    "Reset clears the import backup",
    fakeStorage.getItem(Store.BACKUP_KEY),
    null,
  );
  document.querySelector("#results").innerHTML =
    `<h2>${results.every((x) => x.pass) ? "✓ All tests passed" : "⚠ Tests failed"}</h2>` +
    results
      .map(
        (x) =>
          `<p class="${x.pass ? "state used" : "state reserved"}">${x.pass ? "✓" : "✗"} ${x.name}: ${x.actual} (expected ${x.expected})</p>`,
      )
      .join("");
  if (!results.every((x) => x.pass))
    throw new Error("Calculation tests failed");
})();
