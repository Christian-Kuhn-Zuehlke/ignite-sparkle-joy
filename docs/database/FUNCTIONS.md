# Database Functions and Triggers

This document describes the PostgreSQL functions and triggers used in the Ignite database.

---

## Helper Functions

### User & Authentication

#### has_role

Checks if a user has a specific role. Uses `SECURITY DEFINER` to bypass RLS.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
```

**Parameters:**
- `_user_id` - User's UUID
- `_role` - Role to check

**Returns:** `BOOLEAN` - True if user has the role

**Example:**
```sql
SELECT has_role(auth.uid(), 'system_admin');
```

---

#### has_any_role

Checks if a user has any of the specified roles.

```sql
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
```

**Parameters:**
- `_user_id` - User's UUID
- `_roles` - Array of roles to check

**Returns:** `BOOLEAN` - True if user has any of the roles

**Example:**
```sql
SELECT has_any_role(auth.uid(), ARRAY['msd_csm', 'msd_ma', 'system_admin']::app_role[]);
```

---

#### get_user_role

Gets the primary role for a user.

```sql
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
```

**Parameters:**
- `_user_id` - User's UUID

**Returns:** `app_role` - User's role (first found)

---

#### get_user_company_id

Gets the primary company ID for a user (from profiles table - legacy).

```sql
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS TEXT
```

**Parameters:**
- `_user_id` - User's UUID

**Returns:** `TEXT` - Company ID

---

#### get_user_company_ids

Gets all company IDs a user has access to via memberships.

```sql
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id UUID)
RETURNS TEXT[]
```

**Parameters:**
- `_user_id` - User's UUID

**Returns:** `TEXT[]` - Array of company IDs

---

#### has_company_access

Checks if user has membership in a specific company.

```sql
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id UUID, _company_id TEXT)
RETURNS BOOLEAN
```

**Parameters:**
- `_user_id` - User's UUID
- `_company_id` - Company ID to check

**Returns:** `BOOLEAN` - True if user has access

---

#### get_user_company_role

Gets user's role for a specific company.

```sql
CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id UUID, _company_id TEXT)
RETURNS app_role
```

**Parameters:**
- `_user_id` - User's UUID
- `_company_id` - Company ID

**Returns:** `app_role` - Role in that company

---

#### get_user_primary_company

Gets user's primary company (from memberships with `is_primary = true`).

```sql
CREATE OR REPLACE FUNCTION public.get_user_primary_company(_user_id UUID)
RETURNS TEXT
```

**Parameters:**
- `_user_id` - User's UUID

**Returns:** `TEXT` - Primary company ID

---

#### is_membership_approved

Checks if user has any approved membership.

```sql
CREATE OR REPLACE FUNCTION public.is_membership_approved(_user_id UUID)
RETURNS BOOLEAN
```

**Parameters:**
- `_user_id` - User's UUID

**Returns:** `BOOLEAN` - True if has approved membership

---

#### is_csm_assigned

Checks if a CSM is assigned to a company.

```sql
CREATE OR REPLACE FUNCTION public.is_csm_assigned(_user_id UUID, _company_id TEXT)
RETURNS BOOLEAN
```

**Parameters:**
- `_user_id` - CSM user's UUID
- `_company_id` - Company ID

**Returns:** `BOOLEAN` - True if assigned

---

### User Account Management

#### soft_delete_user_account

Soft deletes a user account.

```sql
CREATE OR REPLACE FUNCTION public.soft_delete_user_account(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
```

**Parameters:**
- `p_user_id` - User to delete
- `p_reason` - Optional deletion reason

**Actions:**
- Marks profile as deleted
- Deactivates all memberships
- Creates audit log entry

---

#### restore_user_account

Restores a soft-deleted user account (admin only).

```sql
CREATE OR REPLACE FUNCTION public.restore_user_account(p_user_id UUID)
RETURNS BOOLEAN
```

**Parameters:**
- `p_user_id` - User to restore

**Actions:**
- Clears deletion markers
- Sets memberships to pending
- Creates audit log entry

---

### Utility Functions

#### update_updated_at_column

Generic trigger function to update `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
```

**Usage:** Attached to tables with `updated_at` column

---

#### refresh_order_sla_status

Refreshes the `order_sla_status` materialized view.

```sql
CREATE OR REPLACE FUNCTION public.refresh_order_sla_status()
RETURNS VOID
```

**Usage:** Call periodically or after significant order changes

---

### Audit Functions

#### create_audit_log

Creates an audit log entry.

```sql
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action audit_action,
  p_resource_type audit_resource,
  p_resource_id TEXT DEFAULT NULL,
  p_company_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
```

**Parameters:**
- `p_action` - Action type
- `p_resource_type` - Resource type
- `p_resource_id` - Resource identifier
- `p_company_id` - Company context
- `p_details` - Additional details

**Returns:** `UUID` - Created audit log ID

---

## Trigger Functions

### User Management

#### handle_new_user

Automatically creates profile and role on user signup.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
```

**Trigger:** `on_auth_user_created` on `auth.users`
**Event:** AFTER INSERT

**Actions:**
1. Creates profile from user metadata
2. Assigns default 'viewer' role

---

### Order Events

#### log_order_status_change

Logs order status changes to `order_events` table.

```sql
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
```

**Trigger:** `on_order_status_change` on `orders`
**Event:** AFTER UPDATE

**Actions:**
1. Detects status changes
2. Calculates duration in previous status
3. Creates event record

---

#### generate_order_event

Generates order events for SLA tracking (from SLA management).

```sql
CREATE OR REPLACE FUNCTION public.generate_order_event()
RETURNS TRIGGER
```

**Trigger:** `order_status_change_event` on `orders`
**Event:** AFTER UPDATE OF status

**Actions:**
- Maps order status to event type
- Creates event for SLA calculation

---

#### generate_initial_order_event

Creates initial `ORDER_RECEIVED` event on order creation.

```sql
CREATE OR REPLACE FUNCTION public.generate_initial_order_event()
RETURNS TRIGGER
```

**Trigger:** `order_created_event` on `orders`
**Event:** AFTER INSERT

---

### Notifications

#### notify_order_event

Sends push notifications for order events via Edge Function.

```sql
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS TRIGGER
```

**Trigger:** `order_push_notification_trigger` on `orders`
**Event:** AFTER INSERT OR UPDATE

**Notifications:**
- New order created
- Order shipped
- Order delivered

---

#### notify_low_stock

Sends push notification when inventory drops below threshold.

```sql
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
```

**Trigger:** `inventory_low_stock_trigger` on `inventory`
**Event:** AFTER UPDATE

---

#### notify_return_event

Sends push notification for new returns.

```sql
CREATE OR REPLACE FUNCTION public.notify_return_event()
RETURNS TRIGGER
```

**Trigger:** `return_push_notification_trigger` on `returns`
**Event:** AFTER INSERT

---

### Audit Logging

#### log_order_audit

Logs order changes to audit log.

```sql
CREATE OR REPLACE FUNCTION public.log_order_audit()
RETURNS TRIGGER
```

---

#### log_membership_status_change

Logs membership status changes to audit log.

```sql
CREATE OR REPLACE FUNCTION public.log_membership_status_change()
RETURNS TRIGGER
```

**Trigger:** `on_membership_status_change` on `memberships`
**Event:** AFTER UPDATE

---

## Complete Trigger List

| Trigger Name | Table | Event | Function |
|--------------|-------|-------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_orders_updated_at` | `orders` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_inventory_updated_at` | `inventory` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_returns_updated_at` | `returns` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_companies_updated_at` | `companies` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_memberships_updated_at` | `memberships` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_feature_toggles_updated_at` | `feature_toggles` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_webhooks_updated_at` | `webhooks` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_integrations_updated_at` | `integrations` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_notification_settings_updated_at` | `notification_settings` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_celebration_settings_updated_at` | `celebration_settings` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_company_kpis_updated_at` | `company_kpis` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sla_profiles_updated_at` | `sla_profiles` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sla_rules_updated_at` | `sla_rules` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sla_results_updated_at` | `sla_results` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_order_notes_updated_at` | `order_notes` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_budgets_updated_at` | `budgets` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_forecasts_updated_at` | `forecasts` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_abc_classifications_updated_at` | `abc_classifications` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_quality_errors_updated_at` | `quality_errors` | BEFORE UPDATE | `update_updated_at_column()` |
| `on_order_status_change` | `orders` | AFTER UPDATE | `log_order_status_change()` |
| `order_status_change_event` | `orders` | AFTER UPDATE OF status | `generate_order_event()` |
| `order_created_event` | `orders` | AFTER INSERT | `generate_initial_order_event()` |
| `order_push_notification_trigger` | `orders` | AFTER INSERT OR UPDATE | `notify_order_event()` |
| `inventory_low_stock_trigger` | `inventory` | AFTER UPDATE | `notify_low_stock()` |
| `return_push_notification_trigger` | `returns` | AFTER INSERT | `notify_return_event()` |
| `on_membership_status_change` | `memberships` | AFTER UPDATE | `log_membership_status_change()` |

---

## Database Extensions

### Required Extensions

```sql
-- For HTTP calls from database (push notifications)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

The `pg_net` extension enables asynchronous HTTP calls from trigger functions to Edge Functions.

---

## Scheduled Jobs

### Order State Sync (via pg_cron)

Configured to sync order states from MS Direct API:

```sql
-- Setup cron job for MS Order State sync
-- Runs every 15 minutes
```

See migration `20251229183000_setup_ms_order_state_cron.sql` for details.

---

## Data Backfill Functions

### backfill_order_events

Backfills order events from existing orders.

```sql
CREATE OR REPLACE FUNCTION public.backfill_order_events()
RETURNS INTEGER
```

**Returns:** Number of orders processed

**Usage:** Run once after initial setup to populate `order_events` table
