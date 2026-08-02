/* All localStorage access is centralized here. */
(function (global) {
  'use strict';
  const KEY = 'mulesoft-cost-estimator-data', BACKUP_KEY = `${KEY}-import-backup`, SCHEMA = 1;
  function id(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }
  function builtInProject() { const now = new Date().toISOString(); return { id: 'project_shared_platform', name: 'Shared Platform / Unassigned', description: 'Built-in ownership home for shared and unassigned APIs.', owner: '', builtIn: true, lifecycle: [{ effectiveMonth: '2000-01', value: 'active' }], reservations: [{ effectiveMonth: '2000-01', value: { flow: 0, apiPre: 0, apiProd: 0 } }], archive: null, createdAt: now, updatedAt: now }; }
  function empty() { return { schemaVersion: SCHEMA, metadata: { app: 'MuleSoft Capacity Planner', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, capacityEntries: [], strategicReserves: { flow: [], apiPre: [], apiProd: [] }, projects: [builtInProject()], apis: [] }; }
  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: empty(), isNew: true, error: null };
    try { const data = JSON.parse(raw); if (!data || data.schemaVersion !== SCHEMA) throw new Error(`Unsupported schema version. Expected ${SCHEMA}.`); return { data, isNew: false, error: null }; }
    catch (error) { return { data: empty(), isNew: false, error: { message: error.message, raw } }; }
  }
  function save(data) { data.metadata.updatedAt = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(data)); }
  function backup() { const raw = localStorage.getItem(KEY); if (raw) localStorage.setItem(BACKUP_KEY, raw); }
  function replace(data) { backup(); save(data); }
  function reset(storage = localStorage) {
    const fresh = empty();
    storage.removeItem(KEY);
    storage.removeItem(BACKUP_KEY);
    storage.setItem(KEY, JSON.stringify(fresh));
    const raw = storage.getItem(KEY);
    if (!raw) throw new Error('The browser did not persist the clean workspace.');
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== SCHEMA || saved.projects.length !== 1 || saved.projects[0].id !== 'project_shared_platform' || saved.apis.length || saved.capacityEntries.length) {
      throw new Error('The clean workspace could not be verified.');
    }
    return saved;
  }
  function exportRaw() { return localStorage.getItem(KEY); }
  global.Store = { KEY, BACKUP_KEY, SCHEMA, id, empty, load, save, backup, replace, reset, exportRaw };
})(window);
