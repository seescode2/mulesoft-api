/* Effective-dated timeline primitives. */
(function (global) {
  "use strict";
  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  function isMonth(value) {
    return MONTH_RE.test(value || "");
  }
  function sort(timeline) {
    return [...(timeline || [])].sort((a, b) =>
      a.effectiveMonth.localeCompare(b.effectiveMonth),
    );
  }
  function effective(timeline, month, fallback) {
    let found;
    sort(timeline).forEach((entry) => {
      if (entry.effectiveMonth <= month) found = entry.value;
    });
    return found === undefined ? fallback : found;
  }
  function upsert(timeline, month, value) {
    const result = sort(timeline).filter(
      (entry) => entry.effectiveMonth !== month,
    );
    result.push({ effectiveMonth: month, value });
    return sort(result);
  }
  function next(timeline, month) {
    return sort(timeline).find((entry) => entry.effectiveMonth > month) || null;
  }
  function previous(timeline, month) {
    return (
      sort(timeline)
        .filter((entry) => entry.effectiveMonth < month)
        .pop() || null
    );
  }
  function rangePreview(timeline, month) {
    const future = next(timeline, month);
    return {
      start: month,
      end: future ? addMonths(future.effectiveMonth, -1) : null,
      next: future,
    };
  }
  function addMonths(month, amount) {
    const [year, mon] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, mon - 1 + amount, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  function currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function label(month) {
    if (!isMonth(month)) return month;
    return new Date(`${month}-02T00:00:00`).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  function warnings(timeline, month, oldValue, newValue, fieldName) {
    const notes = [],
      preview = rangePreview(timeline, month),
      now = currentMonth();
    if (month < now)
      notes.push(`This change modifies a historical month (${label(month)}).`);
    if (
      oldValue !== undefined &&
      JSON.stringify(oldValue) !== JSON.stringify(newValue)
    )
      notes.push(`Previously recorded ${fieldName || "data"} will change.`);
    if (preview.next)
      notes.push(
        `The change applies through ${label(preview.end)}. A later override begins ${label(preview.next.effectiveMonth)}.`,
      );
    if (
      typeof oldValue === "number" &&
      oldValue &&
      Math.abs(newValue - oldValue) / oldValue >= 0.5
    )
      notes.push(
        `This is a sudden ${newValue > oldValue ? "increase" : "decrease"} of ${Math.round((Math.abs(newValue - oldValue) / oldValue) * 100)}%.`,
      );
    return notes;
  }
  global.Timelines = {
    isMonth,
    sort,
    effective,
    upsert,
    next,
    previous,
    rangePreview,
    addMonths,
    currentMonth,
    label,
    warnings,
  };
})(window);
