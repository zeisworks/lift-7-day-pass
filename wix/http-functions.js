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
//   3. Posts the lead into the Wix Inbox as a form-style message on the contact's
//      conversation (name/phone + any follow-up answers), so it shows in Inbox and
//      pings the Wix Owner app.
//
// No manual dashboard setup is required — the label is created by the code via
// findOrCreateLabel.
//
// Docs:
//   http-functions:  https://dev.wix.com/docs/velo/api-reference/wix-http-functions/introduction
//   contacts:        https://dev.wix.com/docs/velo/api-reference/wix-crm-backend/contacts/introduction
//   inbox:           https://dev.wix.com/docs/velo/apis/wix-inbox-v2/introduction

import { ok, serverError } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';
import { conversations, messages } from 'wix-inbox.v2';
import { elevate } from 'wix-auth';

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

    // Any follow-up answers travel in the Inbox card below — not as a contact
    // custom field (that path hit Wix INVALID_FIELD_NAME and isn't needed now).
    const hasAnswers = !!(b.goal || b.frequency || b.challenge || b.contact_method);

    // Create or append the contact (reconciles by email/phone).
    const created = await contacts.appendOrCreateContact(info);
    const contactId = created.contactId;

    // Tag every lead with the "7 Days Free" label. labelKeys are appended, so
    // re-labeling the same contact on the follow-up step is harmless.
    const labelRes = await contacts.findOrCreateLabel(LEAD_LABEL, AUTH);
    await contacts.labelContact(contactId, [labelRes.label.key], AUTH);

    // Post the lead into the Wix Inbox as ONE consolidated form-style message on
    // this contact's conversation (shows in Inbox + pings the Wix Owner app). The
    // frontend creates the contact on the claim form, then fires `send_inbox` once
    // at the end of the funnel (finish OR skip/close) carrying name/phone + any
    // answers — so there's a single complete card per lead. Best-effort: must never
    // break lead capture.
    let inboxStatus = 'not-attempted';
    try {
      const fields = [];
      const addField = function (label, value) { if (value) fields.push({ name: label, value: String(value) }); };
      addField('First Name', b.first_name);
      addField('Last Name', b.last_name);
      addField('Email', b.email);
      addField('Phone', b.phone);
      addField('Goal', b.goal);
      addField('Trains now', b.frequency);
      addField('Held back by', b.challenge);
      addField('Preferred contact', b.contact_method);

      if (!b.send_inbox) {
        inboxStatus = 'skipped: no send_inbox flag';
      } else if (!fields.length) {
        inboxStatus = 'skipped: no fields';
      } else {
        const convo = await elevate(conversations.getOrCreateConversation)({ contactId: contactId });
        await elevate(messages.sendMessage)(convo.conversation._id, {
          direction: 'PARTICIPANT_TO_BUSINESS',
          visibility: 'BUSINESS',
          content: {
            previewText: 'New 7-Day Pass lead',
            form: {
              title: '7-Day Pass — Free Week',
              description: hasAnswers ? 'Lead + follow-up details' : 'New lead',
              fields: fields
            }
          }
        });
        inboxStatus = 'sent';
      }
    } catch (e) { inboxStatus = 'error: ' + String(e); }

    return ok({ headers: JSON_HEADERS, body: { ok: true, contactId: contactId, inbox: inboxStatus } });
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
