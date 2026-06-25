// Velo backend — save 7-day-pass leads into Wix CRM (Contacts).
//
// WHERE THIS GOES: in the Wix Velo sidebar, under **Backend**, click the ▼ next to
// the + and choose "Expose site API" — that creates a file named exactly
// `http-functions.js`. Paste this in. It publishes an endpoint at:
//   https://www.lift-stl.com/_functions/lead   (POST)
// which lift-pass.js calls via fetch('/_functions/lead').
//
// Docs:
//   http-functions:  https://dev.wix.com/docs/velo/api-reference/wix-http-functions/introduction
//   contacts:        https://dev.wix.com/docs/velo/api-reference/wix-crm-backend/contacts/introduction

import { ok, badRequest } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';

export async function post_lead(request) {
  try {
    const b = await request.body.json();

    const info = {
      name: { first: b.first_name || '', last: b.last_name || '' },
      emails: b.email ? [{ email: b.email }] : [],
      phones: b.phone ? [{ phone: b.phone }] : []
    };

    // OPTIONAL — capture the journey answers (goal / frequency / challenge).
    // To store these, create matching custom contact fields in your Wix dashboard
    // (Contacts → manage custom fields) and put their field keys below. If you skip
    // this, the core lead (name/email/phone) is still saved.
    const extended = {};
    if (b.goal)      extended['custom.goal'] = b.goal;
    if (b.frequency) extended['custom.frequency'] = b.frequency;
    if (b.challenge) extended['custom.challenge'] = b.challenge;
    if (Object.keys(extended).length) info.extendedFields = extended;

    await contacts.appendOrCreateContact(info);

    return ok({
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: { ok: true }
    });
  } catch (err) {
    return badRequest({
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: { ok: false, error: String(err) }
    });
  }
}

// Lets browsers preflight the POST (harmless for same-origin; needed if cross-origin).
export function options_lead(request) {
  return ok({
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
