/*
  One rule for a client's display name, used by the dashboard, the office APIs and the
  calendar sync alike (owner's rule, 2026-08-19): the name the owner wrote in the
  booking's own fields (الاسم الأول / اسم العائلة) always wins. The legacy `name` column —
  the WhatsApp profile name on WhatsApp leads, or the website form's single field — is
  only the fallback for rows the owner never named by hand.
*/

// JS side, for rows that carry first_name/last_name. Returns '' when nothing is stored.
export function displayName(row) {
  const parts = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
  return parts || String(row?.name ?? '').trim()
}

// The same rule in SQL, for queries that alias the result (… AS name / AS client) and
// can't ship first/last to the client. `p` is the table alias prefix ('' or 'b.').
export const nameSql = (p = '') =>
  `COALESCE(NULLIF(TRIM(COALESCE(${p}first_name, '') || ' ' || COALESCE(${p}last_name, '')), ''), ${p}name)`
