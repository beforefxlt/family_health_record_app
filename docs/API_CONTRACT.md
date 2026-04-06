# API Contract: Members (Stage 3)

Scope
- Introduce unified age grouping for members via new age_group field.
- Age group is derived on the backend from date_of_birth for new records. For existing data, migration is planned but not required for Stage 3.

Endpoints
- GET /api/v1/members
  - Response: JSON array of MemberResponse.
  - Fields per item: id, name, gender, date_of_birth, member_type, age_group, last_check_date, pending_review_count
- POST /api/v1/members
  - Request body: { name, gender, date_of_birth, member_type? }
  - Server derives age_group and stores it.
  - Response: MemberDetailResponse including age_group.
- GET /api/v1/members/{member_id}
  - Response: MemberDetailResponse including age_group.
- PUT /api/v1/members/{member_id}
  - Request body: updatable fields: name, gender, date_of_birth, member_type
  - Server re-derives age_group as needed.
  - Response: MemberDetailResponse including age_group.
- DELETE /api/v1/members/{member_id}
  - Behavior unchanged; logical delete via is_deleted flag.

Data Model Changes
- New field: age_group (string, enum: elder/elderly?, adult). In codebase we currently use elderly and adult.
- age_group is non-nullable on new records, default to 'adult' if not derivable.
- For compatibility, member_type remains supported for a transition period; age_group is the canonical source of truth for UI and reports.

Backward Compatibility & Migration Plan (Stage 3)
- Phase 1: API+UI updates to read age_group; keep age_group optional for a short period if needed by clients.
- Phase 2: Backward-compatible alias fields can be introduced (is_adult, is_elderly) if clients rely on them; eventually deprecate.
- Phase 3: Remove legacy fields after all clients migrated and QA confirms stability.

Validation & Testing
- Add contract tests to verify:
  - age_group is present in responses
  - age_group is correctly derived for new records
  - PUT/POST still succeeds for valid payloads

Versioning
- This contracts document corresponds to Stage 3 in the Unified Age Model initiative.
- Future changes to age_group or its semantics should be versioned and accompanied by migration notes.

Notes
- Strings here are examples; exact enum values may evolve (readable and stable string values preferred).
