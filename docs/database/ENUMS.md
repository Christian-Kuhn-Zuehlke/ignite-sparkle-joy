# Database Enums and Types

This document describes all custom PostgreSQL enum types used in the Ignite database.

---

## User & Authentication

### app_role

User role types for role-based access control.

```sql
CREATE TYPE public.app_role AS ENUM (
  'viewer',       -- Read-only access to company data
  'admin',        -- Full access to company data + user management
  'msd_csm',      -- MSD Customer Success Manager (cross-company)
  'msd_ma',       -- MSD Account Manager (cross-company)
  'msd_ops',      -- MSD Warehouse Operations
  'msd_management', -- MSD Management
  'system_admin'  -- Full system access
);
```

**Used in:**
- `user_roles.role`
- `memberships.role`

---

### membership_status

Membership approval status.

```sql
CREATE TYPE public.membership_status AS ENUM (
  'pending',   -- Awaiting approval
  'approved',  -- Membership active
  'rejected'   -- Membership denied
);
```

**Used in:**
- `memberships.status`

---

## Company Management

### company_status

Company lifecycle status.

```sql
CREATE TYPE public.company_status AS ENUM (
  'pending',     -- Not yet started
  'onboarding',  -- In onboarding wizard
  'live',        -- Active in production
  'paused',      -- Temporarily inactive
  'churned'      -- Customer left
);
```

**Used in:**
- `companies.status`

---

## Order Management

### order_status

Order fulfillment status.

```sql
CREATE TYPE public.order_status AS ENUM (
  'received',       -- Order received in system
  'putaway',        -- Items put away in warehouse
  'picking',        -- Order being picked
  'packing',        -- Order being packed
  'ready_to_ship',  -- Ready for carrier pickup
  'shipped',        -- Handed to carrier
  'delivered'       -- Delivered to customer
);
```

**Used in:**
- `orders.status`

---

### return_status

Return order status.

```sql
CREATE TYPE public.return_status AS ENUM (
  'initiated',   -- Return initiated by customer
  'in_transit',  -- Return shipment in transit
  'received',    -- Return received at warehouse
  'processing',  -- Return being processed
  'completed'    -- Return completed
);
```

**Used in:**
- `returns.status`

---

## SLA Management

### sla_scope

SLA rule scope/applicability.

```sql
CREATE TYPE public.sla_scope AS ENUM (
  'outbound_orders',  -- Applies to outbound orders
  'returns',          -- Applies to returns
  'receiving'         -- Applies to inbound receiving
);
```

**Used in:**
- `sla_rules.scope`

---

### sla_measurement_method

How SLA time is measured.

```sql
CREATE TYPE public.sla_measurement_method AS ENUM (
  'business_hours',  -- Only count business hours
  '24_7'             -- Count all hours
);
```

**Used in:**
- `sla_rules.measurement_method`

---

### sla_severity

SLA alert severity level.

```sql
CREATE TYPE public.sla_severity AS ENUM (
  'info',   -- Informational
  'warn',   -- Warning
  'breach'  -- SLA breached
);
```

**Used in:**
- `sla_rules.severity`
- `sla_alerts.severity`

---

### sla_result_status

SLA compliance result status.

```sql
CREATE TYPE public.sla_result_status AS ENUM (
  'met',            -- SLA target met
  'at_risk',        -- Near breach threshold
  'breached',       -- SLA breached
  'not_applicable', -- SLA doesn't apply
  'excluded'        -- Excluded from SLA
);
```

**Used in:**
- `sla_results.status`

---

### order_event_type

Order lifecycle event types.

```sql
CREATE TYPE public.order_event_type AS ENUM (
  'ORDER_RECEIVED',    -- Order received
  'PICK_STARTED',      -- Picking started
  'PACK_COMPLETED',    -- Packing completed
  'READY_TO_SHIP',     -- Ready for carrier
  'CARRIER_HANDOVER',  -- Handed to carrier
  'SHIPPED',           -- Shipped
  'DELIVERED',         -- Delivered
  'RETURN_RECEIVED',   -- Return received
  'RETURN_COMPLETED'   -- Return completed
);
```

**Used in:**
- `sla_rules.start_event`
- `sla_rules.end_event`
- `order_events.event_type` (some tables use TEXT for flexibility)

---

## Integration

### integration_type

Third-party integration types.

```sql
CREATE TYPE public.integration_type AS ENUM (
  'business_central',  -- Microsoft Business Central
  'woocommerce',       -- WooCommerce
  'shopify',           -- Shopify
  'dhl',               -- DHL Shipping
  'post_ch',           -- Swiss Post
  'custom'             -- Custom integration
);
```

**Used in:**
- `integrations.type`

---

### webhook_event

Events that can trigger webhooks.

```sql
CREATE TYPE public.webhook_event AS ENUM (
  'order_created',     -- New order created
  'order_updated',     -- Order updated
  'order_shipped',     -- Order shipped
  'return_created',    -- New return created
  'return_updated',    -- Return updated
  'inventory_low',     -- Inventory below threshold
  'inventory_updated'  -- Inventory levels changed
);
```

**Used in:**
- `webhooks.events` (as array)

---

## KPI & Metrics

### kpi_type

KPI definition types.

```sql
CREATE TYPE public.kpi_type AS ENUM (
  'delivery_time_sla',  -- Delivery time SLA
  'processing_time',    -- Order processing time
  'dock_to_stock'       -- Dock-to-stock time
);
```

**Used in:**
- `company_kpis.kpi_type`

---

### kpi_unit

KPI measurement units.

```sql
CREATE TYPE public.kpi_unit AS ENUM (
  'percent',  -- Percentage
  'hours',    -- Hours
  'days'      -- Days
);
```

**Used in:**
- `company_kpis.unit`

---

## Purchase Orders & Receiving

### po_status

Purchase order status.

```sql
CREATE TYPE public.po_status AS ENUM (
  'draft',       -- PO being drafted
  'submitted',   -- PO submitted to supplier
  'confirmed',   -- Supplier confirmed
  'in_transit',  -- Shipment in transit
  'arrived',     -- Arrived at warehouse
  'receiving',   -- Being received
  'received',    -- Fully received
  'completed',   -- PO completed
  'cancelled'    -- PO cancelled
);
```

**Used in:**
- `purchase_orders.status`

---

### discrepancy_type

Types of receiving discrepancies.

```sql
CREATE TYPE public.discrepancy_type AS ENUM (
  'over_quantity',   -- Received more than expected
  'under_quantity',  -- Received less than expected
  'unknown_sku',     -- Unknown/unexpected SKU
  'damaged',         -- Damaged items
  'missing_docs',    -- Missing documentation
  'wrong_item',      -- Wrong item received
  'quality_issue'    -- Quality issue
);
```

**Used in:**
- `discrepancies.type`

---

### discrepancy_severity

Discrepancy severity levels.

```sql
CREATE TYPE public.discrepancy_severity AS ENUM (
  'low',      -- Minor issue
  'medium',   -- Moderate issue
  'high',     -- Serious issue
  'critical'  -- Critical issue
);
```

**Used in:**
- `discrepancies.severity`

---

### discrepancy_resolution

Discrepancy resolution outcomes.

```sql
CREATE TYPE public.discrepancy_resolution AS ENUM (
  'pending',              -- Awaiting resolution
  'accepted',             -- Accepted as-is
  'rejected',             -- Rejected/returned
  'returned_to_supplier', -- Returned to supplier
  'adjusted',             -- Stock adjusted
  'escalated'             -- Escalated to management
);
```

**Used in:**
- `discrepancies.resolution`

---

## Quality Intelligence

### quality_error_type

Types of quality errors.

```sql
CREATE TYPE public.quality_error_type AS ENUM (
  'wrong_item',       -- Wrong item picked/packed
  'missing_item',     -- Item missing from order
  'damaged',          -- Item damaged
  'wrong_quantity',   -- Wrong quantity
  'packaging_error',  -- Packaging mistake
  'labeling_error',   -- Labeling mistake
  'shipping_error',   -- Shipping mistake
  'other'             -- Other error
);
```

**Used in:**
- `quality_errors.error_type`

---

## Audit & Logging

### audit_action

Types of auditable actions.

```sql
CREATE TYPE public.audit_action AS ENUM (
  'login',          -- User login
  'logout',         -- User logout
  'view',           -- View resource
  'create',         -- Create resource
  'update',         -- Update resource
  'delete',         -- Delete resource
  'export',         -- Export data
  'import',         -- Import data
  'approve',        -- Approve something
  'reject',         -- Reject something
  'status_change'   -- Status change
);
```

**Used in:**
- `audit_logs.action`

---

### audit_resource

Types of auditable resources.

```sql
CREATE TYPE public.audit_resource AS ENUM (
  'order',        -- Order resource
  'inventory',    -- Inventory resource
  'return',       -- Return resource
  'user',         -- User resource
  'membership',   -- Membership resource
  'company',      -- Company resource
  'settings',     -- Settings resource
  'api_key',      -- API key resource
  'webhook',      -- Webhook resource
  'integration',  -- Integration resource
  'kpi'           -- KPI resource
);
```

**Used in:**
- `audit_logs.resource_type`

---

## Usage Examples

### Checking User Role

```sql
-- Check if user has a specific role
SELECT has_role(auth.uid(), 'system_admin'::app_role);

-- Get user's role
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

### Filtering by Status

```sql
-- Get all pending memberships
SELECT * FROM memberships WHERE status = 'pending'::membership_status;

-- Get all shipped orders
SELECT * FROM orders WHERE status = 'shipped'::order_status;
```

### Working with Webhook Events

```sql
-- Create webhook with multiple events
INSERT INTO webhooks (company_id, name, url, events)
VALUES (
  'AV',
  'Order Notifications',
  'https://example.com/webhook',
  ARRAY['order_created', 'order_shipped']::webhook_event[]
);
```
