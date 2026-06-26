// Velo backend — save 7-day-pass leads into Wix CRM (Contacts).
//
// WHERE THIS GOES: in the Wix Velo sidebar, under **Backend**, click the ▼ next to
// the + and choose "Expose site API" — that creates a file named exactly
// `http-functions.js`. Paste this in. It publishes an endpoint at:
//   https://www.lift-stl.com/_functions/lead   (POST)
// which lift-pass.js calls via fetch('/_functions/lead').
//
// What it does on every submission:
//   1. Creates (or appends to) the contact from name / email / phone.
//   2. Tags the contact with the "7 Days Free" label — created automatically the
//      first time, reused after that.
//   3. If the follow-up step sent goal / frequency / challenge, saves them into
//      custom contact fields (Goal / Workout Frequency / Biggest Challenge) —
//      also created automatically on first run.
//
// No manual dashboard setup is required — the label and custom fields are created
// by the code via findOrCreateLabel / findOrCreateExtendedField.
//
// Docs:
//   http-functions:  https://dev.wix.com/docs/velo/api-reference/wix-http-functions/introduction
//   contacts:        https://dev.wix.com/docs/velo/api-reference/wix-crm-backend/contacts/introduction

import { ok, serverError } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';

// The endpoint is hit by an anonymous site visitor, so suppress the
// Manage-Contacts permission check on the CRM calls.
const AUTH = { suppressAuth: true };

const LEAD_LABEL = '7 Days Free';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export async function post_lead(request) {
  try {
    const b = await request.body.json();

    // Core contact info — built from whatever this submission carries. The first
    // step sends name/email/phone; the follow-up step sends just email + answers.
    const info = {
      name: { first: b.first_name || '', last: b.last_name || '' },
      emails: b.email ? [{ email: b.email }] : [],
      phones: b.phone ? [{ phone: b.phone }] : []
    };

    // Follow-up answers -> a single freeform "note" on the contact. Wix has no API
    // to write the contact's built-in Notes panel, so we consolidate the answers
    // into one readable custom field ("7-Day Pass Notes") instead of cluttering the
    // CRM with several separate fields.
    const noteParts = [
      ['Goal', b.goal],
      ['Trains now', b.frequency],
      ['Held back by', b.challenge],
      ['Preferred contact', b.contact_method]
    ].filter(function (pair) { return pair[1]; })
     .map(function (pair) { return pair[0] + ': ' + pair[1]; });

    if (noteParts.length) {
      const note = noteParts.join('  ·  ');
      const field = await contacts.findOrCreateExtendedField(
        { displayName: '7-Day Pass Notes', dataType: 'TEXT' },
        AUTH
      );
      info.extendedFields = {};
      info.extendedFields[field.extendedField.key] = note;
    }

    // Create or append the contact (reconciles by email/phone).
    const created = await contacts.appendOrCreateContact(info);
    const contactId = created.contactId;

    // Tag every lead with the "7 Days Free" label. labelKeys are appended, so
    // re-labeling the same contact on the follow-up step is harmless.
    const labelRes = await contacts.findOrCreateLabel(LEAD_LABEL, AUTH);
    await contacts.labelContact(contactId, [labelRes.label.key], AUTH);

    return ok({ headers: JSON_HEADERS, body: { ok: true, contactId: contactId } });
  } catch (err) {
    return serverError({ headers: JSON_HEADERS, body: { ok: false, error: String(err) } });
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
