---
name: discover-identity-access
description: Proposes rows for the Identity & Access tab of the use case tracker, as a reviewable `tracker-updates.csv`, from the source, configuration, `external_tools.md`, `logic.md`, tagged documents and supplied dependency observations of each use case, one row per use case and endpoint and environment. Use when a developer or lead asks which outside services, endpoints, identities and permissions use cases need, to start access requests early across all known use cases before any specification exists, to refresh the access rows after the source changed, or to see which requests could be shared. It only proposes; it never writes to the tracker, never records a secret and never marks access approved or verified.
user-invocable: true
---

# Discover identity and access

You turn evidence about what a use case talks to into proposed Identity & Access rows, so access requests can start on the first day and a lead can see which requests look alike. You write one file, `tracker-updates.csv`, in the long proposal format of `tracker-data-contract.md` in this folder. You never write to the tracker itself, never raise a request, never approve anything and never verify access. A lead reviews every row and the report.

You own one tab only: Identity & Access. You write nothing for the other tabs.

Read `tracker-data-contract.md` and `tracker-schema.csv` in this folder before you write a row. They are the only source for column names, owner classes, allowed values and the file format. If they and this file ever disagree, they win, and you say so in your reply.

## When you run

Run early, across all known use cases at once, as a lightweight sweep. You need no use case specification and you do not wait for one, for a source screening result, or for any acknowledgement. You can run in parallel with source screening and with the drafting of specifications. Access requests take time to approve, so the sweep is what lets them start.

Lightweight means you look only for what a use case reaches outside itself for: configuration and environment variable reads, URLs and hosts, web page visits and sign-in steps, API and SDK clients, database, queue, file transfer and mail connections, authorization headers, tokens, key or certificate references, and the names of environments. You do not need to understand the whole use case. A later run, once more is known, refreshes the same rows.

## Inputs

- The use case inventory (one row per use case: its name, vendor (the vendor and the name build the use case ID), and where its source and configuration are kept), or one use case named by the developer.
- For each use case: the source code and configuration (the part that fits), and the two files `external_tools.md` and `logic.md`, looked for in the use case's source folder or where the developer says they are. If one is missing, say so in the report. Never invent its content and never replace it with a guess.
- Tagged supporting documents for the use case (for example a vendor hand-over note or a design). They allow preliminary findings only.
- Dependency observations that a developer supplies (for example "it calls the vendor's reporting API with an API key from the vault"). They become rows, with the evidence reference naming who supplied them and where.
- The proposal ID: the merge request number or the branch name made safe as a slug. If it is not given, ask once. Never invent one.
- Optionally, the existing proposal file and a tracker export, so a repeat run refreshes the same rows and flags look-alike endpoints against rows you cannot otherwise see.

## The proposal file

The file is `tracker-updates/<proposal-id>/tracker-updates.csv`. Create the folder if it is missing. Rewrite only your own rows (tab Identity & Access) in that file, and leave any other rows in it as they are. Never write anywhere else.

Format: UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting (quote any value with a comma, a double quote or a line break, and double the quotes inside), LF line ends, one header row, exactly this header:

`update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`

One row per field. For every row:

- `update_id` is `<proposal_id>:<tab>:<record_key>:<field>`, composed from the other cells, never a hash and never a counter. The same content always gives the same `update_id`.
- `proposal_id` is the proposal ID.
- `tab` is `Identity & Access`, exactly as in `tracker-schema.csv`.
- `operation` is `add`, `set`, `suggest` or `link`:
  - `add` for every field of a new record (a human-owned field on an `add` is an initial suggestion that a lead copies by hand);
  - `set` for a spec field of an existing record, with `base_value`;
  - `suggest` for a human-owned field of an existing record;
  - `link` only to add a reference to `shared_with` of an existing record without replacing the list.
- `record_key` is the local reference `<use-case-id>/<endpoint>/<environment>`, never a central reference such as `AX-###` or `UC-###`. The use case ID is `uc-<vendor-slug>-<use-case-slug>`: the vendor and the use case name exactly as the inventory writes them, each reduced to a slug (lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed), as `tracker-data-contract.md` defines it. It is derived, never written as a column. The use case name alone is not part of the key, and a key that starts with the use case name is not valid. The endpoint and the environment are written as in the `endpoint` and `environment` fields of the record. The tab has no use case name column, so the use case is identified by this key. The ID needs the vendor: if it is not in the inventory or from the developer, ask the lead once, never invent one, write no keyed row for that use case until it is known, and name the use case in the report.
- `field` is a column name from `tracker-schema.csv` for the Identity & Access tab.
- `value` is the proposed value. `base_value` is the value you saw before the change, filled for every `set` and blank for an `add`. An empty `base_value` stays blank (no dot, no placeholder); on a `set`, a blank `base_value` means the field was blank when you saw it.
- `source` is where the value comes from (see "Sources").
- `reason` is a short plain sentence saying why.
- `created_on` is the date (`YYYY-MM-DD`) on which the row was first proposed. When you rerun on a proposal file that already has the row with the same content, keep its `created_on` so the rerun gives identical rows.
- `author` is `discover-identity-access`.

Order the rows by record (use case ID, then endpoint, then environment), then by the field order in `tracker-schema.csv`, so the same input always gives the same file.

### Appending to a shared file

When the file already exists and you add rows to it, first make sure it ends with a line feed. If its last character is not a line feed, write one before your first row, so that row starts on a new line and is not fused to the last row already there. Never leave a blank line between rows.

### Self-check before you report

After you write the file and before you write the report, read the file back and check it. Fix every problem you find, then check again, until none is left:

1. Every row, including the header, has exactly 12 fields. Count fields the way CSV does: a comma, a double quote or a line break inside a quoted value is part of that value. A short, fused or blank row is a problem.
2. Every value that holds a comma, a double quote or a line break is quoted, and every quote inside a quoted value is doubled.
3. The header is exactly `update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`.
4. `created_on` and any date value are `YYYY-MM-DD`.
5. Every `record_key` has the form `<use-case-id>/<endpoint>/<environment>`, starting with a use case ID of the form `uc-<vendor-slug>-<use-case-slug>`.
6. The file ends with exactly one line feed: not none, and not a blank line after the last row.

If the toolkit is available, also run `validate <file>` of the Tracker Reconciler on the file and fix every error it names before you report. This is optional: if the toolkit is not available, the checklist above is enough, and you say in the report that `validate` was not run.

State the self-check result in the report: clean, or the problems you found and fixed.

### Fields you write

Look every field up in `tracker-schema.csv`, column `owner`.

- Spec fields you write: `vendor`, `service`, `endpoint`, `environment`, `auth_type`, `observed_operations`, `identity_reference`, `observed_access`, `proposed_access`, `permissions_to_confirm`, `unknowns`, `evidence_refs`, and only when a row is flagged, `shared_request_flag` and `shared_with`.
- Human fields you may give as an initial suggestion on an `add`, or `suggest` on an existing record: `unknown_owner` and `request_status`, and nothing else. Never overwrite a value that is not empty. If you were shown a request status that a lead already set, write no `request_status` row.
- Never write `our_coordinator` or `vendor_action_owner`: leave them blank for a lead. Never write `additional_requirements`, `next_action`, `next_action_owner`, `affected_workflow`, `consolidated_request_ref`, `notes_internal`, `proposal_refs`, `use_case_ref` or `access_ref`.
- Forbidden fields are never written: `ticket_ref`, `raised_on`, `expected_availability`, `verification`, `verified_by`, `verified_on`. A blank `expected_availability` is shown as `unknown` by the workbook, so you write nothing for it. Computed fields (`last_updated`) are never written. If an input contains such a fact, do not copy it: list it in the report.
- A value that the evidence does not show is left blank (write the row with an empty `value` and say why in `reason`) or written as `unknown` where the field is a runtime value. Never guess a vendor, a host, an identity name, a permission or a scope.

### Sources

Every row has a `source`, and a row you cannot give a source is not written.

- Source or configuration file: `<path>@<revision>:<place>`, where `<path>` is the path of the file from the root of the repository that holds the source (or from the folder the developer names), `<revision>` is the commit or tag the developer gave or that version control shows for the file (write `unrevised` when none is known), and `<place>` is the line range or the name of the setting, for example `website-availability-check/src/config.ts@unrevised:L6-L7`.
- Supporting document: `document:<name or path>#<place>`.
- Supplied dependency observation: `dependency:<who supplied it and where>`.

## Reading the evidence

### One row per use case and endpoint and environment

Make one record for each distinct combination of use case, endpoint and environment. Two endpoints of one use case are two records. The same endpoint in two environments is two records. The same endpoint in two use cases is two records (see "Possible shared requests").

- `service` is the outside system in plain words, taken from the evidence. `endpoint` is the host, URL, queue, bucket or path the evidence shows. When the evidence gives only the name of the setting that holds it (for example an environment variable), write that name as the endpoint; its runtime value is unknown.
- `environment` is the environment the evidence names (for example one named in configuration). If the evidence names none, write `unknown`.
- `observed_operations` is what the source does with the endpoint: the method and the request or call, with the setting names it uses. Describe only what you read.

### Evidence pointers

`evidence_refs` is a `;`-list of pointers, each beginning with where it rests:

- `source:<path>#L<a>-L<b>` for a source or configuration file;
- `document:<name or path>#<place>` for a tagged supporting document;
- `dependency:<who supplied it and where>` for a developer's observation.

A row whose pointers are all `document:` or `dependency:` rests on a document or a statement, not on source. Begin its `observed_access` with `From a supporting document, not confirmed in source:` (or `From a supplied observation, not confirmed in source:`). A document never makes a row source-verified, and you never write that a row is source-verified or confirmed from a document. When source later shows the same thing, add the `source:` pointer and drop the prefix.

### Identities and secrets

- `identity_reference` holds the exact names the evidence shows: environment variable names, vault or secret-store reference names, service account names, identity or role names as written. Their runtime values are `unknown`: write `unknown` as the value of the name, for example `API_TOKEN (runtime value unknown)`. Never guess a name, and never take a value from a runtime, a log or a CI setting you were not given.
- A literal credential in source (a password, token, key, secret or connection string with credentials written in the code or in configuration) is reported as its location and `value withheld`, for example `literal credential at example-use-case/src/client.ts#L21: value withheld`. Do not copy it, any part of it, its length or a masked form, into any row, the reason, the report or your reply. Say that the credential should be replaced by a reference or by provisioning, and that the approval is by secure reference or provisioning only. The same holds for a credential found in a document or a supplied observation.
- Existing CI identity reuse is always `unconfirmed`: when a pipeline or build identity could serve, say so in `unknowns` as `reuse of an existing CI identity: unconfirmed`, and never state that it will be reused.

### Authentication type

`auth_type` is one of `website-sign-in`, `api-credential`, `other` or `unknown`, from what the evidence shows:

- `website-sign-in`: the use case signs in to a web site or a web application as a user (a sign-in page or form, a session cookie, a browser automation sign-in step, an SSO redirect).
- `api-credential`: the use case calls an API with a credential (an authorization header, an API key, a token, a client identifier and secret, an SDK client created with credentials).
- `other`: something else the evidence shows (a certificate, a key file, a network allow-list); describe it in `observed_access`.
- `unknown`: the evidence shows no authentication or does not show which kind. A call with no credential in the source is `unknown`, not `other`, because the source cannot show whether the site would ask for one.

### Observed and proposed access

`observed_access` and `proposed_access` are separate columns and are never mixed. `observed_access` is only what the evidence shows the use case does and with what (the identity names, the call, whether any credential is sent). `proposed_access` is the request you suggest a lead may raise. Both are proposals; neither is a fact about what exists.

Match the proposed request to the observed authentication:

- `website-sign-in`: ask for an approved identity or account for the use case, the application permissions it needs, and a supported automated authentication or SSO where it applies.
- `api-credential`: ask for approved API identity or credential provisioning and the permissions or scopes the source supports (the ones the source names or the API calls it makes show). Do not ask a blanket SSO question for an API source.
- `other`: ask for what the evidence shows, in the same terms, and nothing more.
- `unknown`: propose no fixed request. Say what the owner must confirm first, and give the conditional request for each case in the wording above, so the lead sees what follows from the answer. The row stays `proposed`.

Never guess a permission or a scope. `permissions_to_confirm` lists the permissions the lead or the vendor must confirm, including every one the source does not show.

### Unknowns and who resolves them

`unknowns` is a `;`-list of what the evidence does not show (runtime values, environment, authentication, identity, permission, whether an existing CI identity could be reused). `unknown_owner` is, as an initial suggestion, the matching `;`-list saying who resolves each, in the same order: the owner the inventory names, otherwise a role such as `developer`, `vendor` or `platform team`. Never take an owner from a file name, a commit author or a guess.

### Request status

Suggest `request_status` as `proposed` or `ready-to-raise`, nothing else, as an initial suggestion on an `add` or a `suggest` on an existing record.

`ready-to-raise` only when all five are known from the evidence: the endpoint (an actual host, URL or path, not only the name of a setting whose value is unknown), the environment, an `auth_type` other than `unknown`, the identity reference (a name) and the permission or scope (one the source or the evidence states). It is independent of whether a specification exists, of any acknowledgement, and of every other unknown, which stay listed in `unknowns` with their `unknown_owner`. If any one of the five is not known, suggest `proposed`.

Never write `raised`, `in-progress`, `approved`, `provisioned`, `blocked`, `declined` or `not-needed`, and never write that anything is approved, provisioned or verified. Do not write a ticket, a raised date, an expected availability, a verification, a coordinator or a vendor action owner.

### Possible shared requests

Each use case keeps its own row. When two or more rows, in this run or in a proposal file or tracker export you were given, have the same endpoint and the same environment, set on each of them `shared_request_flag` to `possible-shared-request: same endpoint and environment` and `shared_with` to the `;`-list of the local references (`<use-case-id>/<endpoint>/<environment>`) of the other rows. On an existing row add the reference with a `link` row, never replacing the list. Do not merge rows, do not drop a row, and never write `consolidated_request_ref`: a lead may consolidate after confirming the endpoint, environment, identity and permissions, and sets it. Say in the report which rows you compared, so a lead knows what the flag could not see.

## Repeat runs

Rerunning must give the same rows and no duplicate record. Before writing, read the existing proposal file (if any) and any tracker export you were given. Rows are matched by their local reference `<use-case-id>/<endpoint>/<environment>`.

- Same reference and same content: write nothing new, and keep `created_on`.
- Same reference, a spec field changed (for example source now shows the endpoint, so the row rests on source, or a new variable name): `set` the field with the old value as `base_value`, and give the new `source`.
- A human field already holds a value: never overwrite it; `suggest` only when the field is empty or you were shown that it is empty.
- A field a lead edited in the file (a coordinator, an owner, a status): leave it as it is.
- A new endpoint or environment: `add` a new record.
- An endpoint that a previous row or an input names and for which this run found nothing in source or documents: keep the row as it is, do not delete or change it, and list it in the report.

## Report

End your reply with a report, in plain words, with these parts. Write `none` for an empty part; never leave one out.

1. Unread files: files you were given or looked for and could not read, and the missing `external_tools.md` or `logic.md` of each use case (a missing one is reported, never invented).
2. Use cases with no source to sweep: those whose source was not available, with what, if anything, they have instead (documents or supplied observations only).
3. Endpoints with no evidence: endpoints named by an input or an earlier row for which nothing was found in source or documents.
4. Rows with no pointer: rows you could not write because no evidence pointer or source was available, and the use cases that got no keyed row because their vendor is not known.
5. Literal credentials found: location and `value withheld` for each; no value, no part of one.
6. Rows that rest on a document or a supplied observation only, so a lead does not read them as confirmed in source.
7. Possible shared requests: the flagged rows and the rows you compared.
8. Rows suggested `ready-to-raise`, and rows left `proposed` with the first thing missing.
9. Facts in an input that belong to a lead or to a later step and were not copied (a ticket, a raised date, an approval, an availability, a verification).
10. Where the file is, how many rows it has per operation, and that a lead reviews every row and this report before anything is applied.
11. The self-check result: clean, or the problems found and fixed, and whether `validate` was run.

State in the report that approval or provisioning of access is separate from verified working access and from the acknowledgement of a use case's behavior. The developer or the platform team verifies working access, and none of the three stands in for another.

## Always

- No secret value (password, token, key, certificate or credential) in any row or in the report. If an input contains one, do not copy it and say that you skipped it.
- Nothing is raised, approved or applied. Say that the file is a proposal.
- Do not describe changes anyone might want or any design for the new platform: you only carry what the evidence shows.
- Do not cover network connectivity, environment setup or router availability: they are not part of these rows.
- `tracker-updates.csv` in this folder is an example for the website availability check use case, from its real source. Use it as a model of the format only; never copy its values into another use case's proposal.
