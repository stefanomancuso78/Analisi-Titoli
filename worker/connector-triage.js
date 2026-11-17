// Pure, read-only connector triage. Never equate HTTP success with usable evidence.
export function classifyConnector(source, now = new Date().toISOString()) {
  const cfg = typeof source.payload === 'string' ? JSON.parse(source.payload) : source.config || {};
  const error = String(source.last_error || '');
  const status = String(source.last_status || '');
  const code = Number(error.match(/\bHTTP\s+(\d{3})\b/i)?.[1] || 0) || null;
  const failures = Number(source.consecutive_failures || 0);
  const lastPoll = source.last_poll || null;
  const nextPoll = source.next_poll || null;
  let category = 'unverified';
  if (cfg.enabled === false) category = 'disabled';
  else if (status === 'credentials_required' || /credentials? (?:required|missing)|credenziali mancanti/i.test(error) || code === 401) category = 'requires_credentials';
  else if (status === 'rate_limited' || code === 429) category = 'rate_limited';
  else if (code === 403) category = 'blocked_403';
  else if (code === 404 || code === 410) category = 'permanent_404_410';
  else if (/invalid (?:rss|atom|json)|parse|unrecogniz|risposta .*non |bibliografia non/i.test(error)) category = 'parser_broken';
  else if (status === 'error') category = 'transient';
  else if (status === 'ok' || status === 'stale') category = 'reachable_unverified_content';
  const due = cfg.enabled !== false && (!nextPoll || Date.parse(nextPoll) <= Date.parse(now));
  const action = category === 'permanent_404_410' ? 'investigate_replacement'
    : category === 'requires_credentials' ? 'await_credentials'
    : category === 'blocked_403' ? 'verify_permission_or_alternative'
    : category === 'parser_broken' ? 'repair_parser'
    : category === 'rate_limited' ? 'respect_backoff'
    : category === 'transient' ? 'retry_when_due'
    : category === 'disabled' ? 'keep_disabled'
    : 'measure_end_to_end_yield';
  return { id:source.id, kind:cfg.kind || null, symbol:cfg.symbol || null,
    enabled:cfg.enabled === true, category, action, http_status:code,
    last_status:status || null, last_error:error || null, last_poll:lastPoll,
    next_poll:nextPoll, due, consecutive_failures:failures,
    note:'Reachability alone does not establish attributed events, qualified full text or economic interpretation.' };
}
export function connectorTriageSummary(sources, now = new Date().toISOString()) {
  const rows = sources.map(s => classifyConnector(s,now));
  const by_category = {};
  for (const row of rows) by_category[row.category] = (by_category[row.category] || 0) + 1;
  return {as_of:now,total:rows.length,by_category,rows};
}
