(function (global) {
  "use strict";
  const pools = ["flow", "apiPre", "apiProd"],
    capacityStates = ["planned", "active"];
  function dataset(data) {
    const errors = [];
    if (!data || typeof data !== "object")
      return ["The import must be a JSON object."];
    if (data.schemaVersion !== Store.SCHEMA)
      errors.push(`Schema version must be ${Store.SCHEMA}.`);
    ["capacityEntries", "projects", "apis"].forEach((k) => {
      if (!Array.isArray(data[k])) errors.push(`${k} must be an array.`);
    });
    const all = [
        ...(data.capacityEntries || []),
        ...(data.projects || []),
        ...(data.apis || []),
      ],
      ids = new Set();
    all.forEach((item) => {
      if (!item.id) errors.push("Every entity requires an ID.");
      else if (ids.has(item.id))
        errors.push(`Duplicate internal ID: ${item.id}.`);
      else ids.add(item.id);
    });
    (data.capacityEntries || []).forEach((c) => {
      if (!pools.includes(c.pool))
        errors.push(`Capacity ${c.id}: invalid pool.`);
      if (!capacityStates.includes(c.status))
        errors.push(`Capacity ${c.id}: invalid status.`);
      if (!Timelines.isMonth(c.effectiveMonth))
        errors.push(`Capacity ${c.id}: invalid month.`);
      if (!Number.isFinite(c.quantity) || c.quantity < 0)
        errors.push(`Capacity ${c.id}: quantity cannot be negative.`);
    });
    (data.projects || []).forEach((p) =>
      validateTimeline(p.lifecycle, `Project ${p.id} lifecycle`, errors),
    );
    const projectIds = new Set((data.projects || []).map((p) => p.id));
    (data.apis || []).forEach((api) => {
      validateTimeline(api.lifecycle, `API ${api.id} lifecycle`, errors);
      validateTimeline(api.baseFlows, `API ${api.id} flows`, errors);
      (api.owners || []).forEach((o) => {
        if (!projectIds.has(o.value))
          errors.push(`API ${api.id}: owner ${o.value} does not exist.`);
      });
      ["dev", "test", "prod"].forEach((env) =>
        validateTimeline(
          api.environments && api.environments[env],
          `API ${api.id} ${env}`,
          errors,
        ),
      );
      (api.consumers || []).forEach((c) => {
        if (!projectIds.has(c.projectId))
          errors.push(`API ${api.id}: consumer ${c.projectId} does not exist.`);
        if (
          !Timelines.isMonth(c.startMonth) ||
          (c.endMonth && !Timelines.isMonth(c.endMonth))
        )
          errors.push(`API ${api.id}: invalid consumer month.`);
      });
    });
    return [...new Set(errors)];
  }
  function validateTimeline(timeline, name, errors) {
    if (!Array.isArray(timeline)) {
      errors.push(`${name} must be a timeline array.`);
      return;
    }
    const seen = new Set();
    timeline.forEach((e) => {
      if (!Timelines.isMonth(e.effectiveMonth))
        errors.push(`${name} has an invalid month.`);
      if (seen.has(e.effectiveMonth))
        errors.push(`${name} has duplicate month ${e.effectiveMonth}.`);
      seen.add(e.effectiveMonth);
    });
  }
  function nonNegative(value, label) {
    const n = Number(value);
    return !Number.isFinite(n) || n < 0
      ? `${label} must be zero or greater.`
      : "";
  }
  global.Validate = { dataset, nonNegative };
})(window);
