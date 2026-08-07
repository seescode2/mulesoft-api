(function (global) {
  "use strict";
  const pools = ["flow", "apiPre", "apiProd"],
    capacityStates = ["planned", "active"],
    projectStates = ["planned", "active", "on-hold", "archived"],
    apiStates = [
      "planned",
      "in-development",
      "operational",
      "on-hold",
      "archived",
    ],
    flowStates = ["inactive", "reserved", "used"],
    managerStates = ["not-managed", "reserved", "used"],
    architectureLayers = ["experience", "process", "system"],
    environments = ["dev", "test", "prod"],
    ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

  const isObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value),
    finiteNonNegative = (value) =>
      Number.isFinite(value) && value >= 0,
    optionalString = (value, max = 5000) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.length <= max);

  function requireObject(value, name, errors) {
    if (isObject(value)) return true;
    errors.push(`${name} must be an object.`);
    return false;
  }

  function requireString(value, name, errors, max = 200) {
    if (typeof value === "string" && value.trim() && value.length <= max)
      return true;
    errors.push(
      `${name} must be a non-empty string of at most ${max} characters.`,
    );
    return false;
  }

  function validateId(value, name, errors) {
    if (typeof value !== "string" || !ID_RE.test(value)) {
      errors.push(
        `${name} must be 1-128 letters, numbers, dots, underscores, colons, or hyphens.`,
      );
      return false;
    }
    return true;
  }

  function validateTextFields(entity, name, errors) {
    requireString(entity.name, `${name} name`, errors);
    ["description", "owner"].forEach((field) => {
      if (!optionalString(entity[field]))
        errors.push(
          `${name} ${field} must be a string of at most 5000 characters.`,
        );
    });
  }

  function validateTimeline(timeline, name, errors, validateValue) {
    if (!Array.isArray(timeline)) {
      errors.push(`${name} must be a timeline array.`);
      return;
    }
    const seen = new Set();
    timeline.forEach((entry, index) => {
      const entryName = `${name}[${index}]`;
      if (!requireObject(entry, entryName, errors)) return;
      if (!Timelines.isMonth(entry.effectiveMonth))
        errors.push(`${entryName} has an invalid month.`);
      if (seen.has(entry.effectiveMonth))
        errors.push(`${name} has duplicate month ${entry.effectiveMonth}.`);
      seen.add(entry.effectiveMonth);
      validateValue(entry.value, `${entryName} value`, errors);
    });
  }

  function validateEnum(value, allowed, name, errors) {
    if (!allowed.includes(value))
      errors.push(`${name} must be one of: ${allowed.join(", ")}.`);
  }

  function validatePoolValues(value, name, errors) {
    if (!requireObject(value, name, errors)) return;
    pools.forEach((pool) => {
      if (!finiteNonNegative(value[pool]))
        errors.push(`${name}.${pool} must be a finite non-negative number.`);
    });
  }

  function validateEnvironment(value, name, errors) {
    if (!requireObject(value, name, errors)) return;
    validateEnum(value.flowState, flowStates, `${name}.flowState`, errors);
    validateEnum(value.apiState, managerStates, `${name}.apiState`, errors);
    if (!finiteNonNegative(value.replicas))
      errors.push(`${name}.replicas must be a finite non-negative number.`);
    if (value.flowOverride !== null && !finiteNonNegative(value.flowOverride))
      errors.push(
        `${name}.flowOverride must be null or a finite non-negative number.`,
      );
    if (!optionalString(value.notes))
      errors.push(`${name}.notes must be a string of at most 5000 characters.`);
  }

  function dataset(data) {
    const errors = [];
    if (!isObject(data)) return ["The dataset must be a JSON object."];
    if (data.schemaVersion !== Store.SCHEMA)
      errors.push(`Schema version must be ${Store.SCHEMA}.`);
    if (!isObject(data.metadata)) errors.push("metadata must be an object.");

    const collections = [
      "capacityEntries",
      "projects",
      "apis",
      "nonApiWorkloads",
    ];
    collections.forEach((key) => {
      if (!Array.isArray(data[key])) errors.push(`${key} must be an array.`);
    });
    if (collections.some((key) => !Array.isArray(data[key]))) return errors;

    const all = [
        ...data.capacityEntries,
        ...data.projects,
        ...data.apis,
        ...data.nonApiWorkloads,
      ],
      ids = new Set();
    all.forEach((item, index) => {
      if (!requireObject(item, `Entity ${index + 1}`, errors)) return;
      if (!validateId(item.id, `Entity ${index + 1} ID`, errors)) return;
      if (ids.has(item.id)) errors.push(`Duplicate internal ID: ${item.id}.`);
      ids.add(item.id);
    });

    data.capacityEntries.forEach((entry, index) => {
      const name = `Capacity entry ${index + 1}`;
      if (!isObject(entry)) return;
      validateEnum(entry.pool, pools, `${name} pool`, errors);
      validateEnum(entry.status, capacityStates, `${name} status`, errors);
      if (!Timelines.isMonth(entry.effectiveMonth))
        errors.push(`${name} has an invalid month.`);
      if (!finiteNonNegative(entry.quantity))
        errors.push(`${name} quantity must be a finite non-negative number.`);
      if (!optionalString(entry.description))
        errors.push(
          `${name} description must be a string of at most 5000 characters.`,
        );
    });

    data.projects.forEach((project, index) => {
      const name = `Project ${index + 1}`;
      if (!isObject(project)) return;
      validateTextFields(project, name, errors);
      validateTimeline(
        project.lifecycle,
        `${name} lifecycle`,
        errors,
        (value, valueName, list) =>
          validateEnum(value, projectStates, valueName, list),
      );
      validateTimeline(
        project.reservations,
        `${name} reservations`,
        errors,
        validatePoolValues,
      );
    });

    const projectIds = new Set(
      data.projects.filter(isObject).map((project) => project.id),
    );
    data.apis.forEach((api, index) => {
      const name = `API ${index + 1}`;
      if (!isObject(api)) return;
      validateTextFields(api, name, errors);
      if (
        api.architectureLayer !== undefined &&
        !architectureLayers.includes(api.architectureLayer)
      )
        errors.push(`${name} architectureLayer is invalid.`);
      validateTimeline(
        api.lifecycle,
        `${name} lifecycle`,
        errors,
        (value, valueName, list) =>
          validateEnum(value, apiStates, valueName, list),
      );
      validateTimeline(
        api.baseFlows,
        `${name} flows`,
        errors,
        (value, valueName, list) => {
          if (!finiteNonNegative(value))
            list.push(`${valueName} must be a finite non-negative number.`);
        },
      );
      validateTimeline(
        api.owners,
        `${name} owners`,
        errors,
        (value, valueName, list) => {
          if (!validateId(value, valueName, list)) return;
          if (!projectIds.has(value))
            list.push(`${valueName} references a missing project.`);
        },
      );
      validateTimeline(
        api.allocations,
        `${name} allocations`,
        errors,
        validatePoolValues,
      );
      if (!requireObject(api.environments, `${name} environments`, errors)) return;
      environments.forEach((environment) =>
        validateTimeline(
          api.environments[environment],
          `${name} ${environment}`,
          errors,
          validateEnvironment,
        ),
      );
      if (!Array.isArray(api.consumers)) {
        errors.push(`${name} consumers must be an array.`);
      } else {
        api.consumers.forEach((consumer, consumerIndex) => {
          const consumerName = `${name} consumer ${consumerIndex + 1}`;
          if (!requireObject(consumer, consumerName, errors)) return;
          if (!projectIds.has(consumer.projectId))
            errors.push(`${consumerName} references a missing project.`);
          if (
            !Timelines.isMonth(consumer.startMonth) ||
            (consumer.endMonth && !Timelines.isMonth(consumer.endMonth))
          )
            errors.push(`${consumerName} has an invalid month.`);
          if (!optionalString(consumer.notes))
            errors.push(
              `${consumerName} notes must be a string of at most 5000 characters.`,
            );
        });
      }
    });

    data.nonApiWorkloads.forEach((workload, index) => {
      const name = `Workload ${index + 1}`;
      if (!isObject(workload)) return;
      validateTextFields(workload, name, errors);
      if (!projectIds.has(workload.projectId))
        errors.push(`${name} references a missing project.`);
      validateEnum(workload.lifecycle, apiStates, `${name} lifecycle`, errors);
      if (
        !optionalString(workload.kind, 200) ||
        !optionalString(workload.schedule, 500)
      )
        errors.push(
          `${name} kind and schedule must be strings within their size limits.`,
        );
      if (
        !Array.isArray(workload.environments) ||
        workload.environments.some((environment) => !environments.includes(environment))
      )
        errors.push(`${name} environments must contain only dev, test, or prod.`);
      ["flowUsed", "flowReserved"].forEach((field) => {
        if (!finiteNonNegative(workload[field]))
          errors.push(`${name} ${field} must be a finite non-negative number.`);
      });
    });
    return [...new Set(errors)];
  }

  function nonNegative(value, label) {
    const n = Number(value);
    return !Number.isFinite(n) || n < 0
      ? `${label} must be zero or greater.`
      : "";
  }
  global.Validate = { dataset, nonNegative };
})(window);
