# Database Tables Reference

Complete reference for all database tables in the Ignite system.

---

## Authentication & User Management

### profiles

User profile information, linked to Supabase `auth.users`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Reference to `auth.users(id)`, UNIQUE |
| `email` | TEXT | NO | - | User email address |
| `full_name` | TEXT | YES | - | Display name |
| `company_id` | TEXT | YES | - | Legacy primary company reference |
| `company_name` | TEXT | YES | - | Legacy company name |
| `last_login_at` | TIMESTAMPTZ | YES | - | Last successful login timestamp |
| `requested_company_name` | TEXT | YES | - | For unknown company registration requests |
| `deleted_at` | TIMESTAMPTZ | YES | - | Soft delete timestamp |
| `deleted_by` | UUID | YES | - | User who performed soft delete |
| `deletion_reason` | TEXT | YES | - | Reason for account deletion |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Indexes:**
- `idx_profiles_last_login_at` on `last_login_at DESC`
- `idx_profiles_deleted_at` on `deleted_at`

**Triggers:**
- `update_profiles_updated_at` - Auto-update `updated_at` on changes

---

### user_roles

Global role assignments for users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Reference to `auth.users(id)` |
| `role` | `app_role` | NO | `'viewer'` | Assigned role |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Constraints:**
- UNIQUE(`user_id`, `role`) - One role per user-role combination

---

### memberships

Multi-tenant company memberships. Enables users to belong to multiple companies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Reference to `auth.users(id)` |
| `company_id` | TEXT | NO | - | Reference to `companies(id)` |
| `role` | `app_role` | NO | `'viewer'` | Role within this company |
| `is_primary` | BOOLEAN | NO | `false` | Whether this is the user's primary company |
| `status` | `membership_status` | NO | `'approved'` | Approval status |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`user_id`, `company_id`) - One membership per user-company

**Indexes:**
- `idx_memberships_status` on `status`

**Realtime:** Enabled

---

### csm_assignments

Customer Success Manager to company assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `csm_user_id` | UUID | NO | - | CSM user reference |
| `company_id` | TEXT | NO | - | Assigned company |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Constraints:**
- UNIQUE(`csm_user_id`, `company_id`)

**Realtime:** Enabled

---

## Company Management

### companies

Customer/tenant companies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NO | - | Primary key (e.g., 'AV', 'NK', 'GT') |
| `name` | TEXT | NO | - | Company display name |
| `status` | `company_status` | YES | `'pending'` | Lifecycle status |
| `go_live_date` | DATE | YES | - | Production go-live date |
| `contact_name` | TEXT | YES | - | Primary contact name |
| `contact_email` | TEXT | YES | - | Primary contact email |
| `contact_phone` | TEXT | YES | - | Primary contact phone |
| `contract_start_date` | DATE | YES | - | Contract start date |
| `contract_end_date` | DATE | YES | - | Contract end date |
| `contract_type` | TEXT | YES | - | Contract type |
| `hubspot_company_id` | TEXT | YES | - | HubSpot CRM integration ID |
| `onboarding_started_at` | TIMESTAMPTZ | YES | - | When onboarding began |
| `onboarding_completed_at` | TIMESTAMPTZ | YES | - | When onboarding completed |
| `onboarding_completed_steps` | JSONB | YES | `'[]'` | Array of completed wizard steps |
| `notes` | TEXT | YES | - | Internal notes |
| `ms_client_id` | TEXT | YES | - | MS Direct client ID |
| `ms_client_token` | TEXT | YES | - | MS Direct API token |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Indexes:**
- `idx_companies_status` on `status`

---

## Order Management

### orders

Sales orders and shipments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `source_no` | TEXT | NO | - | External order number |
| `external_document_no` | TEXT | YES | - | Customer's document number |
| `customer_no` | TEXT | YES | - | Customer account number |
| `company_id` | TEXT | NO | - | Owning company |
| `company_name` | TEXT | NO | - | Company name (denormalized) |
| `ship_to_name` | TEXT | NO | - | Recipient name |
| `ship_to_address` | TEXT | YES | - | Shipping address |
| `ship_to_postcode` | TEXT | YES | - | Postal code |
| `ship_to_city` | TEXT | YES | - | City |
| `ship_to_country` | TEXT | YES | `'CH'` | Country code |
| `order_date` | DATE | NO | `CURRENT_DATE` | Order date |
| `order_amount` | DECIMAL(10,2) | YES | `0` | Total order value |
| `status` | `order_status` | NO | `'received'` | Current fulfillment status |
| `shipping_agent_code` | TEXT | YES | - | Carrier code |
| `tracking_code` | TEXT | YES | - | Tracking number |
| `tracking_link` | TEXT | YES | - | Tracking URL |
| `track_and_trace_id_return` | TEXT | YES | - | Return tracking ID |
| `track_and_trace_url_return` | TEXT | YES | - | Return tracking URL |
| `invoice_no` | TEXT | YES | - | Invoice number |
| `invoice_amount` | DECIMAL(10,2) | YES | - | Invoice amount |
| `payment_state` | BOOLEAN | YES | `false` | Payment received flag |
| `ms_order_state` | INTEGER | YES | - | MS Direct numeric state |
| `posted_shipment_date` | DATE | YES | - | Shipment date |
| `posted_invoice_date` | DATE | YES | - | Invoice date |
| `status_date` | TIMESTAMPTZ | YES | `now()` | Last status change |
| `last_state_sync_at` | TIMESTAMPTZ | YES | - | Last API sync timestamp |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`source_no`, `company_id`)

**Indexes:**
- `idx_orders_company_id` on `company_id`
- `idx_orders_status` on `status`
- `idx_orders_order_date` on `order_date`
- `idx_orders_company_status_date` on `(company_id, status, order_date DESC)`
- `idx_orders_company_date` on `(company_id, order_date DESC)`
- `idx_orders_company_created` on `(company_id, created_at DESC)`
- `idx_orders_last_state_sync_at` on `last_state_sync_at`
- `idx_orders_ms_order_state` on `ms_order_state`

**Realtime:** Enabled

---

### order_lines

Order line items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | NO | - | Parent order reference |
| `sku` | TEXT | NO | - | Product SKU |
| `name` | TEXT | NO | - | Product name |
| `quantity` | INTEGER | NO | `1` | Quantity ordered |
| `price` | DECIMAL(10,2) | YES | `0` | Unit price |
| `cost_price` | DECIMAL(10,2) | YES | - | Cost price for margin calculation |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Indexes:**
- `idx_order_lines_order_id` on `order_id`
- `idx_order_lines_sku` on `sku`

---

### order_notes

Collaborative notes attached to orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | NO | - | Parent order reference |
| `user_id` | UUID | NO | - | Note author |
| `user_name` | TEXT | NO | - | Author display name |
| `content` | TEXT | NO | - | Note content |
| `is_pinned` | BOOLEAN | YES | `false` | Pinned to top |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Indexes:**
- `idx_order_notes_order_id` on `order_id`
- `idx_order_notes_created_at` on `created_at DESC`

**Realtime:** Enabled

---

### order_events

Order status change event log with automatic tracking via triggers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | NO | - | Order reference |
| `company_id` | TEXT | NO | - | Company reference |
| `event_type` | TEXT | NO | - | Event type (status_change, created, note_added, sla_warning, sla_breach) |
| `old_status` | TEXT | YES | - | Previous status |
| `new_status` | TEXT | YES | - | New status |
| `occurred_at` | TIMESTAMPTZ | NO | `now()` | Event timestamp |
| `duration_seconds` | INTEGER | YES | - | Time in previous status |
| `metadata` | JSONB | YES | `'{}'` | Additional event data |
| `created_by` | UUID | YES | - | User who triggered event |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Indexes:**
- `idx_order_events_order_id` on `order_id`
- `idx_order_events_company_id` on `company_id`
- `idx_order_events_occurred_at` on `occurred_at DESC`
- `idx_order_events_event_type` on `event_type`

**Triggers:**
- `on_order_status_change`: Automatically logs status changes

**Realtime:** Enabled

---

## Inventory Management

### inventory

Stock levels per company and SKU.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Owning company |
| `sku` | TEXT | NO | - | Product SKU |
| `name` | TEXT | NO | - | Product name |
| `on_hand` | INTEGER | NO | `0` | Total physical stock |
| `reserved` | INTEGER | NO | `0` | Reserved/allocated stock |
| `available` | INTEGER | - | GENERATED | Computed: on_hand - reserved |
| `low_stock_threshold` | INTEGER | YES | - | Alert threshold |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `sku`)

**Indexes:**
- `idx_inventory_company_id` on `company_id`
- `idx_inventory_company_sku` on `(company_id, sku)`
- `idx_inventory_company_available` on `(company_id, available)`

**Realtime:** Enabled

---

## Returns Management

### returns

Return orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | YES | - | Original order reference |
| `company_id` | TEXT | NO | - | Owning company |
| `return_date` | DATE | NO | `CURRENT_DATE` | Return initiation date |
| `status` | `return_status` | NO | `'initiated'` | Current return status |
| `amount` | DECIMAL(10,2) | YES | `0` | Return value |
| `reason` | TEXT | YES | - | Return reason |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Indexes:**
- `idx_returns_company_id` on `company_id`
- `idx_returns_order_id` on `order_id`
- `idx_returns_company_date` on `(company_id, return_date DESC)`
- `idx_returns_company_status` on `(company_id, status)`

**Realtime:** Enabled

---

### return_lines

Return line items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `return_id` | UUID | NO | - | Parent return reference |
| `sku` | TEXT | NO | - | Product SKU |
| `name` | TEXT | NO | - | Product name |
| `quantity` | INTEGER | NO | `1` | Quantity returned |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Indexes:**
- `idx_return_lines_return_id` on `return_id`
- `idx_return_lines_sku` on `sku`

---

## SLA Management

### sla_profiles

Service level calendar configuration per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference (UNIQUE) |
| `timezone` | TEXT | NO | `'Europe/Zurich'` | Company timezone |
| `work_days` | INTEGER[] | NO | `ARRAY[1,2,3,4,5]` | Working days (1=Monday) |
| `work_hours_start` | TIME | NO | `'08:00:00'` | Business hours start |
| `work_hours_end` | TIME | NO | `'18:00:00'` | Business hours end |
| `cut_off_time` | TIME | YES | `'14:00:00'` | Same-day shipping cutoff |
| `blackout_days` | DATE[] | YES | - | Holidays/blackout dates |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### sla_rules

SLA rule definitions per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `name` | TEXT | NO | - | Rule name |
| `description` | TEXT | YES | - | Rule description |
| `scope` | `sla_scope` | NO | - | Applies to (orders/returns/receiving) |
| `filters` | JSONB | YES | `'{}'` | Filter criteria (country, carrier, etc.) |
| `start_event` | `order_event_type` | NO | - | Starting event |
| `end_event` | `order_event_type` | NO | - | Ending event |
| `target_minutes` | INTEGER | NO | - | Target time in minutes |
| `measurement_method` | `sla_measurement_method` | NO | `'business_hours'` | How time is measured |
| `severity` | `sla_severity` | NO | `'warn'` | Breach severity |
| `grace_minutes` | INTEGER | YES | `0` | Grace period |
| `at_risk_threshold_percent` | INTEGER | YES | `10` | At-risk warning threshold |
| `exclude_statuses` | TEXT[] | YES | - | Excluded order statuses |
| `exclude_flags` | JSONB | YES | `'{}'` | Exclusion flags |
| `is_active` | BOOLEAN | NO | `true` | Rule enabled |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Indexes:**
- `idx_sla_rules_company_id` on `company_id`
- `idx_sla_rules_active` on `(company_id, is_active)` WHERE `is_active = true`

---

### sla_results

Computed SLA compliance results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | YES | - | Order reference |
| `return_id` | UUID | YES | - | Return reference |
| `sla_rule_id` | UUID | NO | - | Applied rule |
| `status` | `sla_result_status` | NO | - | Compliance status |
| `elapsed_minutes` | INTEGER | YES | - | Actual elapsed time |
| `target_minutes` | INTEGER | NO | - | Target from rule |
| `started_at` | TIMESTAMPTZ | YES | - | Start event time |
| `ended_at` | TIMESTAMPTZ | YES | - | End event time |
| `computed_at` | TIMESTAMPTZ | NO | `now()` | Computation time |
| `exclusion_reason` | TEXT | YES | - | Why excluded |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`order_id`, `sla_rule_id`)
- UNIQUE(`return_id`, `sla_rule_id`)

---

### sla_alerts

SLA breach and at-risk notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `sla_result_id` | UUID | NO | - | Related SLA result |
| `order_id` | UUID | YES | - | Order reference |
| `return_id` | UUID | YES | - | Return reference |
| `company_id` | TEXT | NO | - | Company reference |
| `severity` | `sla_severity` | NO | - | Alert severity |
| `message` | TEXT | NO | - | Alert message |
| `is_resolved` | BOOLEAN | NO | `false` | Resolution status |
| `resolved_at` | TIMESTAMPTZ | YES | - | Resolution timestamp |
| `resolved_by` | UUID | YES | - | User who resolved |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Indexes:**
- `idx_sla_alerts_company_id` on `(company_id, is_resolved)`
- `idx_sla_alerts_severity` on `(severity, is_resolved)` WHERE `is_resolved = false`

---

## Integration & Configuration

### api_keys

Customer API key management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `name` | TEXT | NO | - | Key name/description |
| `key_hash` | TEXT | NO | - | Hashed API key (HIDDEN from users) |
| `key_prefix` | TEXT | NO | - | Key prefix for identification |
| `last_used_at` | TIMESTAMPTZ | YES | - | Last usage timestamp |
| `expires_at` | TIMESTAMPTZ | YES | - | Expiration timestamp |
| `is_active` | BOOLEAN | NO | `true` | Key enabled |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `created_by` | UUID | YES | - | User who created |

**Security:** `key_hash` column is hidden from authenticated users via column-level grants.

---

### webhooks

Webhook configuration per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `name` | TEXT | NO | - | Webhook name |
| `url` | TEXT | NO | - | Target URL |
| `secret` | TEXT | YES | - | Signing secret |
| `events` | `webhook_event[]` | NO | `'{}'` | Subscribed events |
| `is_active` | BOOLEAN | NO | `true` | Webhook enabled |
| `last_triggered_at` | TIMESTAMPTZ | YES | - | Last trigger time |
| `last_status_code` | INTEGER | YES | - | Last HTTP response code |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### integrations

Third-party integration configurations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `type` | `integration_type` | NO | - | Integration type |
| `name` | TEXT | NO | - | Integration name |
| `config` | JSONB | NO | `'{}'` | Configuration data |
| `is_active` | BOOLEAN | NO | `false` | Integration enabled |
| `last_sync_at` | TIMESTAMPTZ | YES | - | Last sync timestamp |
| `last_sync_status` | TEXT | YES | - | Last sync result |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `type`)

---

### feature_toggles

Feature flags per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `feature_key` | TEXT | NO | - | Feature identifier |
| `feature_name` | TEXT | NO | - | Display name |
| `description` | TEXT | YES | - | Feature description |
| `is_enabled` | BOOLEAN | NO | `false` | Feature enabled |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `feature_key`)

---

### notification_settings

User notification preferences.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company context |
| `user_id` | UUID | NO | - | User reference |
| `push_enabled` | BOOLEAN | YES | `false` | Push notifications enabled |
| `push_subscription` | JSONB | YES | - | Web push subscription data |
| `notify_order_created` | BOOLEAN | YES | `true` | New order alerts |
| `notify_order_shipped` | BOOLEAN | YES | `true` | Shipment alerts |
| `notify_order_delivered` | BOOLEAN | YES | `true` | Delivery alerts |
| `notify_low_stock` | BOOLEAN | YES | `true` | Low stock alerts |
| `notify_sla_warning` | BOOLEAN | YES | `true` | SLA warning alerts |
| `notify_returns` | BOOLEAN | YES | `true` | Return alerts |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `user_id`)

---

### celebration_settings

Gamification settings per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference (UNIQUE) |
| `confetti_enabled` | BOOLEAN | NO | `true` | Enable confetti animations |
| `shipments_threshold` | INTEGER | NO | `100` | Milestone for shipment celebration |
| `sla_streak_threshold` | INTEGER | NO | `30` | Days for SLA streak celebration |
| `orders_today_threshold` | INTEGER | NO | `50` | Daily orders milestone |
| `perfect_day_enabled` | BOOLEAN | NO | `true` | Perfect day celebration |
| `show_achievement_toast` | BOOLEAN | NO | `true` | Show achievement toasts |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

## KPIs & Analytics

### company_kpis

KPI definitions per company.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `kpi_type` | `kpi_type` | NO | - | KPI type |
| `name` | TEXT | NO | - | KPI name |
| `description` | TEXT | YES | - | KPI description |
| `target_value` | NUMERIC | NO | - | Target value |
| `unit` | `kpi_unit` | NO | `'percent'` | Unit of measurement |
| `warning_threshold` | NUMERIC | YES | - | Warning threshold |
| `is_active` | BOOLEAN | NO | `true` | KPI active |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `kpi_type`)

---

### kpi_measurements

Actual KPI measurement values.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `kpi_id` | UUID | NO | - | KPI definition reference |
| `company_id` | TEXT | NO | - | Company reference |
| `measured_value` | NUMERIC | NO | - | Actual value |
| `period_start` | DATE | NO | - | Measurement period start |
| `period_end` | DATE | NO | - | Measurement period end |
| `total_count` | INTEGER | YES | - | Total count (for percentages) |
| `success_count` | INTEGER | YES | - | Success count |
| `details` | JSONB | YES | `'{}'` | Additional details |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### budgets

Planned budget data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `period_type` | TEXT | NO | - | Period type (daily/weekly/monthly/yearly) |
| `period_start` | DATE | NO | - | Period start date |
| `period_end` | DATE | NO | - | Period end date |
| `planned_orders` | INTEGER | NO | `0` | Planned order count |
| `planned_shipments` | INTEGER | NO | `0` | Planned shipment count |
| `planned_items` | INTEGER | NO | `0` | Planned item count |
| `planned_revenue` | NUMERIC | YES | `0` | Planned revenue |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |
| `created_by` | UUID | YES | - | Created by user |

**Constraints:**
- UNIQUE(`company_id`, `period_type`, `period_start`)

---

### forecasts

Forecast data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `period_type` | TEXT | NO | - | Period type |
| `period_start` | DATE | NO | - | Period start date |
| `period_end` | DATE | NO | - | Period end date |
| `forecasted_orders` | INTEGER | NO | `0` | Forecasted order count |
| `forecasted_shipments` | INTEGER | NO | `0` | Forecasted shipment count |
| `forecasted_items` | INTEGER | NO | `0` | Forecasted item count |
| `forecasted_revenue` | NUMERIC | YES | `0` | Forecasted revenue |
| `confidence_level` | NUMERIC | YES | - | Confidence level (0-100) |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |
| `created_by` | UUID | YES | - | Created by user |

---

### historical_snapshots

Historical data for year-over-year comparisons.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `snapshot_date` | DATE | NO | - | Snapshot date |
| `period_type` | TEXT | NO | - | Period type |
| `total_orders` | INTEGER | NO | `0` | Total orders |
| `total_shipments` | INTEGER | NO | `0` | Total shipments |
| `total_items` | INTEGER | NO | `0` | Total items |
| `total_revenue` | NUMERIC | YES | `0` | Total revenue |
| `sla_fulfillment_percent` | NUMERIC | YES | - | SLA fulfillment rate |
| `quality_index` | NUMERIC | YES | - | Quality score |
| `avg_uph` | NUMERIC | YES | - | Average units per hour |
| `avg_oph` | NUMERIC | YES | - | Average orders per hour |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Constraints:**
- UNIQUE(`company_id`, `snapshot_date`, `period_type`)

---

### productivity_metrics

Productivity tracking (UPH/OPH).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `recorded_at` | TIMESTAMPTZ | NO | `now()` | Recording timestamp |
| `units_per_hour` | NUMERIC | YES | - | UPH metric |
| `orders_per_hour` | NUMERIC | YES | - | OPH metric |
| `orders_per_fte` | NUMERIC | YES | - | Orders per FTE |
| `pack_throughput` | NUMERIC | YES | - | Packing throughput |
| `backlog_orders` | INTEGER | YES | `0` | Current backlog |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### quality_metrics

Daily quality scores.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `recorded_date` | DATE | NO | `CURRENT_DATE` | Recording date |
| `error_rate` | NUMERIC | YES | - | Error rate |
| `rework_rate` | NUMERIC | YES | - | Rework rate |
| `return_rate` | NUMERIC | YES | - | Return rate |
| `short_picks` | INTEGER | YES | `0` | Short pick count |
| `scanner_discipline_score` | NUMERIC | YES | - | Scanner compliance score |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Constraints:**
- UNIQUE(`company_id`, `recorded_date`)

---

## Purchase Orders & Receiving

### purchase_orders

Inbound purchase order headers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `po_number` | TEXT | NO | - | PO number |
| `supplier_name` | TEXT | NO | - | Supplier name |
| `supplier_code` | TEXT | YES | - | Supplier code |
| `eta` | DATE | YES | - | Expected arrival date |
| `arrival_date` | DATE | YES | - | Actual arrival date |
| `location` | TEXT | YES | `'main_warehouse'` | Receiving location |
| `status` | `po_status` | NO | `'draft'` | PO status |
| `source` | TEXT | YES | `'manual'` | PO source |
| `notes` | TEXT | YES | - | Notes |
| `created_by` | UUID | YES | - | Created by user |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `po_number`)

---

### purchase_order_lines

PO line items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `po_id` | UUID | NO | - | Parent PO reference |
| `sku` | TEXT | NO | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `qty_expected` | INTEGER | NO | `0` | Expected quantity |
| `qty_received` | INTEGER | NO | `0` | Received quantity |
| `uom` | TEXT | YES | `'EA'` | Unit of measure |
| `gtin` | TEXT | YES | - | GTIN/barcode |
| `line_number` | INTEGER | YES | - | Line number |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### receiving_sessions

Receiving workflow sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `po_id` | UUID | NO | - | PO reference |
| `company_id` | TEXT | NO | - | Company reference |
| `started_by` | UUID | YES | - | Started by user |
| `started_at` | TIMESTAMPTZ | NO | `now()` | Session start time |
| `completed_at` | TIMESTAMPTZ | YES | - | Session end time |
| `method` | TEXT | YES | `'scan'` | Receiving method |
| `status` | TEXT | NO | `'in_progress'` | Session status |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### receiving_counts

Scanned/received counts during receiving.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `session_id` | UUID | NO | - | Receiving session reference |
| `po_line_id` | UUID | YES | - | PO line reference |
| `sku` | TEXT | NO | - | Product SKU |
| `qty_received` | INTEGER | NO | `0` | Quantity received |
| `scanned_at` | TIMESTAMPTZ | NO | `now()` | Scan timestamp |
| `scanned_by` | UUID | YES | - | Scanned by user |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### discrepancies

Receiving discrepancies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `session_id` | UUID | NO | - | Receiving session reference |
| `po_line_id` | UUID | YES | - | PO line reference |
| `company_id` | TEXT | NO | - | Company reference |
| `type` | `discrepancy_type` | NO | - | Discrepancy type |
| `severity` | `discrepancy_severity` | NO | `'medium'` | Severity level |
| `resolution` | `discrepancy_resolution` | NO | `'pending'` | Resolution status |
| `sku` | TEXT | YES | - | Product SKU |
| `expected_qty` | INTEGER | YES | - | Expected quantity |
| `actual_qty` | INTEGER | YES | - | Actual quantity |
| `notes` | TEXT | YES | - | Notes |
| `resolved_by` | UUID | YES | - | Resolved by user |
| `resolved_at` | TIMESTAMPTZ | YES | - | Resolution timestamp |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### po_attachments

PO document attachments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `po_id` | UUID | NO | - | PO reference |
| `file_name` | TEXT | NO | - | File name |
| `file_url` | TEXT | NO | - | File URL |
| `file_type` | TEXT | YES | - | MIME type |
| `file_size` | INTEGER | YES | - | File size in bytes |
| `uploaded_by` | UUID | YES | - | Uploaded by user |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

## Quality Intelligence

### quality_errors

Error tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `order_id` | UUID | YES | - | Related order |
| `return_id` | UUID | YES | - | Related return |
| `error_type` | `quality_error_type` | NO | - | Error type |
| `sku` | TEXT | YES | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `zone` | TEXT | YES | - | Warehouse zone |
| `shift` | TEXT | YES | - | Work shift |
| `worker_id` | TEXT | YES | - | Worker identifier |
| `severity` | TEXT | YES | `'medium'` | Error severity |
| `description` | TEXT | YES | - | Error description |
| `root_cause` | TEXT | YES | - | Root cause analysis |
| `root_cause_category` | TEXT | YES | - | Root cause category |
| `corrective_action` | TEXT | YES | - | Corrective action taken |
| `cost_impact` | NUMERIC(10,2) | YES | - | Cost impact |
| `detected_at` | TIMESTAMPTZ | NO | `now()` | Detection timestamp |
| `detected_by` | TEXT | YES | - | Detected by |
| `resolved_at` | TIMESTAMPTZ | YES | - | Resolution timestamp |
| `resolved_by` | UUID | YES | - | Resolved by user |
| `metadata` | JSONB | YES | `'{}'` | Additional data |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### quality_scores

Aggregated daily quality scores.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `score_date` | DATE | NO | - | Score date |
| `overall_score` | NUMERIC(5,2) | YES | - | Overall quality score |
| `accuracy_score` | NUMERIC(5,2) | YES | - | Accuracy score |
| `damage_score` | NUMERIC(5,2) | YES | - | Damage score |
| `timeliness_score` | NUMERIC(5,2) | YES | - | Timeliness score |
| `packaging_score` | NUMERIC(5,2) | YES | - | Packaging score |
| `total_orders` | INTEGER | YES | `0` | Total orders |
| `total_errors` | INTEGER | YES | `0` | Total errors |
| `error_rate` | NUMERIC(5,4) | YES | - | Error rate |
| `by_error_type` | JSONB | YES | `'{}'` | Breakdown by error type |
| `by_zone` | JSONB | YES | `'{}'` | Breakdown by zone |
| `by_shift` | JSONB | YES | `'{}'` | Breakdown by shift |
| `top_error_skus` | JSONB | YES | `'[]'` | Top error SKUs |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### root_cause_categories

Error categorization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `name` | TEXT | NO | - | Category name |
| `description` | TEXT | YES | - | Category description |
| `parent_category_id` | UUID | YES | - | Parent category (hierarchical) |
| `is_active` | BOOLEAN | YES | `true` | Category active |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

## Packaging Intelligence

### packaging_types

Available packaging options.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `name` | TEXT | NO | - | Packaging name |
| `code` | TEXT | NO | - | Packaging code |
| `length_cm` | NUMERIC(10,2) | YES | - | Length in cm |
| `width_cm` | NUMERIC(10,2) | YES | - | Width in cm |
| `height_cm` | NUMERIC(10,2) | YES | - | Height in cm |
| `volume_cm3` | NUMERIC(10,2) | - | GENERATED | Volume (calculated) |
| `weight_g` | NUMERIC(10,2) | YES | - | Weight in grams |
| `cost_cents` | INTEGER | YES | `0` | Cost in cents |
| `is_eco_friendly` | BOOLEAN | YES | `false` | Eco-friendly flag |
| `co2_grams` | NUMERIC(10,2) | YES | - | CO2 footprint |
| `is_active` | BOOLEAN | YES | `true` | Type active |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `code`)

---

### packaging_records

Per-order packaging data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | NO | - | Order reference |
| `company_id` | TEXT | NO | - | Company reference |
| `packaging_type_id` | UUID | YES | - | Packaging type reference |
| `packaging_code` | TEXT | YES | - | Packaging code used |
| `actual_weight_g` | NUMERIC(10,2) | YES | - | Actual weight |
| `declared_weight_g` | NUMERIC(10,2) | YES | - | Declared weight |
| `fill_rate_percent` | NUMERIC(5,2) | YES | - | Box fill rate |
| `is_overpackaged` | BOOLEAN | YES | `false` | Overpackaged flag |
| `is_underpackaged` | BOOLEAN | YES | `false` | Underpackaged flag |
| `carrier_code` | TEXT | YES | - | Carrier code |
| `carrier_service` | TEXT | YES | - | Carrier service |
| `shipping_cost_cents` | INTEGER | YES | - | Shipping cost |
| `shipping_zone` | TEXT | YES | - | Shipping zone |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### shipping_anomalies

Shipping cost/routing anomalies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `order_id` | UUID | NO | - | Order reference |
| `company_id` | TEXT | NO | - | Company reference |
| `anomaly_type` | TEXT | NO | - | Anomaly type |
| `severity` | TEXT | NO | `'medium'` | Severity level |
| `description` | TEXT | YES | - | Anomaly description |
| `expected_value` | TEXT | YES | - | Expected value |
| `actual_value` | TEXT | YES | - | Actual value |
| `potential_savings_cents` | INTEGER | YES | - | Potential savings |
| `is_resolved` | BOOLEAN | YES | `false` | Resolution status |
| `resolved_at` | TIMESTAMPTZ | YES | - | Resolution timestamp |
| `resolved_by` | UUID | YES | - | Resolved by user |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### packaging_recommendations

AI-generated packaging recommendations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sku` | TEXT | YES | - | Product SKU |
| `current_packaging_code` | TEXT | YES | - | Current packaging |
| `recommended_packaging_code` | TEXT | YES | - | Recommended packaging |
| `recommendation_type` | TEXT | NO | - | Recommendation type |
| `reason` | TEXT | YES | - | Recommendation reason |
| `estimated_savings_cents` | INTEGER | YES | - | Estimated savings |
| `estimated_co2_savings_g` | NUMERIC(10,2) | YES | - | CO2 savings |
| `confidence_score` | NUMERIC(3,2) | YES | - | AI confidence |
| `sample_size` | INTEGER | YES | - | Data sample size |
| `is_implemented` | BOOLEAN | YES | `false` | Implementation status |
| `implemented_at` | TIMESTAMPTZ | YES | - | Implementation timestamp |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### packaging_metrics

Daily packaging metrics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `metric_date` | DATE | NO | `CURRENT_DATE` | Metric date |
| `total_shipments` | INTEGER | YES | `0` | Total shipments |
| `avg_fill_rate_percent` | NUMERIC(5,2) | YES | - | Average fill rate |
| `overpackaged_count` | INTEGER | YES | `0` | Overpackaged count |
| `underpackaged_count` | INTEGER | YES | `0` | Underpackaged count |
| `total_packaging_cost_cents` | INTEGER | YES | `0` | Total packaging cost |
| `total_shipping_cost_cents` | INTEGER | YES | `0` | Total shipping cost |
| `total_co2_grams` | NUMERIC(10,2) | YES | `0` | Total CO2 footprint |
| `anomaly_count` | INTEGER | YES | `0` | Anomaly count |
| `potential_savings_cents` | INTEGER | YES | `0` | Potential savings |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Constraints:**
- UNIQUE(`company_id`, `metric_date`)

---

## ABC Analysis & Forecasting

### abc_classifications

SKU ABC classification.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sku` | TEXT | NO | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `abc_class` | TEXT | NO | - | ABC class (A/B/C) |
| `previous_abc_class` | TEXT | YES | - | Previous class |
| `class_changed_at` | TIMESTAMPTZ | YES | - | Class change timestamp |
| `total_revenue` | NUMERIC(12,2) | YES | `0` | Total revenue |
| `revenue_share_percent` | NUMERIC(5,2) | YES | `0` | Revenue share |
| `order_count` | INTEGER | YES | `0` | Order count |
| `units_sold` | INTEGER | YES | `0` | Units sold |
| `avg_days_in_warehouse` | INTEGER | YES | `0` | Average storage days |
| `current_stock` | INTEGER | YES | `0` | Current stock |
| `days_of_stock` | INTEGER | YES | - | Days of stock |
| `storage_cost_monthly` | NUMERIC(10,2) | YES | `0` | Monthly storage cost |
| `pick_pack_cost_per_unit` | NUMERIC(8,2) | YES | `0` | Pick/pack cost |
| `return_rate_percent` | NUMERIC(5,2) | YES | `0` | Return rate |
| `return_cost_total` | NUMERIC(10,2) | YES | `0` | Total return cost |
| `stockout_risk_score` | NUMERIC(3,2) | YES | `0` | Stockout risk (0-1) |
| `overstock_risk_score` | NUMERIC(3,2) | YES | `0` | Overstock risk (0-1) |
| `trending_direction` | TEXT | YES | - | Trend (up/stable/down) |
| `analysis_date` | DATE | NO | `CURRENT_DATE` | Analysis date |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

**Constraints:**
- UNIQUE(`company_id`, `sku`, `analysis_date`)

---

### abc_recommendations

AI recommendations for ABC items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `classification_id` | UUID | YES | - | ABC classification reference |
| `sku` | TEXT | NO | - | Product SKU |
| `recommendation_type` | TEXT | NO | - | Recommendation type |
| `priority` | TEXT | NO | - | Priority level |
| `title` | TEXT | NO | - | Recommendation title |
| `description` | TEXT | NO | - | Detailed description |
| `reasoning` | TEXT | YES | - | AI reasoning |
| `confidence_score` | NUMERIC(3,2) | YES | `0` | Confidence score |
| `estimated_impact_value` | NUMERIC(12,2) | YES | - | Estimated value impact |
| `estimated_impact_type` | TEXT | YES | - | Impact type |
| `key_metrics` | JSONB | YES | - | Key supporting metrics |
| `status` | TEXT | NO | `'open'` | Action status |
| `actioned_at` | TIMESTAMPTZ | YES | - | Action timestamp |
| `actioned_by` | UUID | YES | - | Actioned by user |
| `action_notes` | TEXT | YES | - | Action notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### abc_analysis_runs

ABC analysis run history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `analysis_period_days` | INTEGER | NO | `90` | Analysis period |
| `analysis_type` | TEXT | NO | `'revenue'` | Analysis type |
| `total_skus_analyzed` | INTEGER | YES | `0` | Total SKUs |
| `a_class_count` | INTEGER | YES | `0` | A-class count |
| `b_class_count` | INTEGER | YES | `0` | B-class count |
| `c_class_count` | INTEGER | YES | `0` | C-class count |
| `a_threshold_percent` | NUMERIC(5,2) | YES | `80` | A threshold |
| `b_threshold_percent` | NUMERIC(5,2) | YES | `95` | B threshold |
| `total_revenue_analyzed` | NUMERIC(14,2) | YES | - | Total revenue |
| `a_class_revenue_share` | NUMERIC(5,2) | YES | - | A-class revenue share |
| `b_class_revenue_share` | NUMERIC(5,2) | YES | - | B-class revenue share |
| `c_class_revenue_share` | NUMERIC(5,2) | YES | - | C-class revenue share |
| `ai_summary` | TEXT | YES | - | AI-generated summary |
| `key_insights` | JSONB | YES | - | Key insights |
| `status` | TEXT | NO | `'running'` | Run status |
| `error_message` | TEXT | YES | - | Error message if failed |
| `started_at` | TIMESTAMPTZ | NO | `now()` | Start timestamp |
| `completed_at` | TIMESTAMPTZ | YES | - | Completion timestamp |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### clarification_cases

Exception/problem cases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `case_type` | TEXT | NO | - | Case type |
| `severity` | TEXT | NO | `'medium'` | Severity level |
| `status` | TEXT | NO | `'open'` | Case status |
| `title` | TEXT | NO | - | Case title |
| `description` | TEXT | YES | - | Case description |
| `ai_explanation` | TEXT | YES | - | AI explanation |
| `ai_confidence_score` | NUMERIC(3,2) | YES | - | AI confidence |
| `recommended_action` | TEXT | YES | - | Recommended action |
| `related_sku` | TEXT | YES | - | Related SKU |
| `related_order_id` | UUID | YES | - | Related order |
| `related_po_id` | UUID | YES | - | Related PO |
| `related_return_id` | UUID | YES | - | Related return |
| `expected_value` | NUMERIC | YES | - | Expected value |
| `actual_value` | NUMERIC | YES | - | Actual value |
| `discrepancy_value` | NUMERIC | YES | - | Discrepancy value |
| `detected_at` | TIMESTAMPTZ | NO | `now()` | Detection timestamp |
| `resolved_at` | TIMESTAMPTZ | YES | - | Resolution timestamp |
| `resolved_by` | UUID | YES | - | Resolved by user |
| `resolution_notes` | TEXT | YES | - | Resolution notes |
| `metadata` | JSONB | YES | `'{}'` | Additional data |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### demand_forecasts

Demand predictions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sku` | TEXT | NO | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `forecast_type` | TEXT | NO | - | Forecast type |
| `forecast_date` | DATE | NO | - | Forecast date |
| `forecasted_quantity` | INTEGER | YES | - | Forecasted quantity |
| `forecasted_value` | NUMERIC | YES | - | Forecasted value |
| `confidence_score` | NUMERIC(3,2) | YES | - | Confidence score |
| `lower_bound` | INTEGER | YES | - | Lower bound |
| `upper_bound` | INTEGER | YES | - | Upper bound |
| `factors` | JSONB | YES | `'{}'` | Influencing factors |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

### replenishment_suggestions

Reorder suggestions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sku` | TEXT | NO | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `current_stock` | INTEGER | NO | - | Current stock level |
| `avg_daily_demand` | NUMERIC(10,2) | YES | - | Average daily demand |
| `days_of_stock_remaining` | INTEGER | YES | - | Days of stock left |
| `stockout_date` | DATE | YES | - | Projected stockout date |
| `stockout_probability` | NUMERIC(3,2) | YES | - | Stockout probability |
| `suggested_order_quantity` | INTEGER | NO | - | Suggested order qty |
| `order_by_date` | DATE | NO | - | Order by date |
| `reasoning` | TEXT | YES | - | AI reasoning |
| `priority` | TEXT | NO | `'medium'` | Priority level |
| `status` | TEXT | NO | `'pending'` | Suggestion status |
| `is_launch_product` | BOOLEAN | YES | `false` | New product flag |
| `launch_date` | DATE | YES | - | Product launch date |
| `factors` | JSONB | YES | `'{}'` | Influencing factors |
| `actioned_at` | TIMESTAMPTZ | YES | - | Action timestamp |
| `actioned_by` | UUID | YES | - | Actioned by user |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update timestamp |

---

### stockout_alerts

Low stock warnings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sku` | TEXT | NO | - | Product SKU |
| `product_name` | TEXT | YES | - | Product name |
| `abc_class` | TEXT | YES | - | ABC classification |
| `current_stock` | INTEGER | NO | - | Current stock level |
| `avg_daily_demand` | NUMERIC(10,2) | YES | - | Average daily demand |
| `days_until_stockout` | INTEGER | YES | - | Days until stockout |
| `stockout_probability` | NUMERIC(3,2) | YES | - | Stockout probability |
| `estimated_revenue_at_risk` | NUMERIC(12,2) | YES | - | Revenue at risk |
| `alert_severity` | TEXT | NO | `'warning'` | Alert severity |
| `status` | TEXT | NO | `'active'` | Alert status |
| `acknowledged_at` | TIMESTAMPTZ | YES | - | Acknowledgement timestamp |
| `acknowledged_by` | UUID | YES | - | Acknowledged by user |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

---

## Audit & Logging

### audit_logs

User activity audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | YES | - | User reference |
| `user_email` | TEXT | YES | - | User email (denormalized) |
| `user_name` | TEXT | YES | - | User name (denormalized) |
| `action` | `audit_action` | NO | - | Action type |
| `resource_type` | `audit_resource` | NO | - | Resource type |
| `resource_id` | TEXT | YES | - | Resource identifier |
| `company_id` | TEXT | YES | - | Company context |
| `details` | JSONB | YES | `'{}'` | Additional details |
| `ip_address` | TEXT | YES | - | Client IP address |
| `user_agent` | TEXT | YES | - | Client user agent |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |

**Indexes:**
- `idx_audit_logs_user_id` on `user_id`
- `idx_audit_logs_company_id` on `company_id`
- `idx_audit_logs_action` on `action`
- `idx_audit_logs_resource_type` on `resource_type`
- `idx_audit_logs_created_at` on `created_at DESC`
- `idx_audit_logs_compound` on `(company_id, created_at DESC)`

---

### sync_logs

Data synchronization history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `company_id` | TEXT | NO | - | Company reference |
| `sync_type` | TEXT | NO | `'daily_auto'` | Sync type |
| `status` | TEXT | NO | `'pending'` | Sync status |
| `orders_imported` | INTEGER | YES | `0` | Orders imported |
| `orders_updated` | INTEGER | YES | `0` | Orders updated |
| `orders_errors` | INTEGER | YES | `0` | Order errors |
| `inventory_imported` | INTEGER | YES | `0` | Inventory imported |
| `inventory_updated` | INTEGER | YES | `0` | Inventory updated |
| `inventory_errors` | INTEGER | YES | `0` | Inventory errors |
| `error_messages` | TEXT[] | YES | `'{}'` | Error messages |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Record creation timestamp |
| `completed_at` | TIMESTAMPTZ | YES | - | Completion timestamp |

**Indexes:**
- `idx_sync_logs_company_id` on `company_id`
- `idx_sync_logs_created_at` on `created_at DESC`

---

## Materialized Views

### order_sla_status

Pre-computed SLA status for orders (last 30 days).

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | UUID | Order reference |
| `company_id` | TEXT | Company reference |
| `created_at` | TIMESTAMPTZ | Order creation time |
| `status` | order_status | Current status |
| `processing_hours` | NUMERIC | Hours in processing |
| `sla_status` | TEXT | SLA status (met/at-risk/breached) |

**Indexes:**
- `idx_order_sla_status_company_sla` on `(company_id, sla_status)`
- `idx_order_sla_status_order_id` on `order_id`

**Refresh:** Use `public.refresh_order_sla_status()` function
