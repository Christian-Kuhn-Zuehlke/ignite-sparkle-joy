# Database Documentation

This documentation describes the complete database structure for the Ignite application, a multi-tenant fulfillment management system built on Supabase (PostgreSQL).

## Overview

The database is designed for a B2B SaaS platform managing:
- Order and fulfillment tracking
- Inventory management
- Returns processing
- SLA monitoring and compliance
- Multi-tenant user management with role-based access
- Purchase order and receiving workflows
- Quality and packaging intelligence
- Analytics and forecasting

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](./TABLES.md)
3. [Enums and Types](./ENUMS.md)
4. [Functions and Triggers](./FUNCTIONS.md)
5. [Row Level Security (RLS)](./RLS.md)
6. [Entity Relationships](./RELATIONSHIPS.md)

## Schema Overview

All tables are in the `public` schema. The database uses PostgreSQL with Supabase extensions.

### Table Categories

#### Authentication & Authorization
- `profiles` - User profile information
- `user_roles` - User role assignments
- `memberships` - Multi-tenant company memberships
- `csm_assignments` - Customer Success Manager assignments

#### Core Business Entities
- `companies` - Customer/tenant companies
- `orders` - Sales orders/shipments
- `order_lines` - Order line items
- `inventory` - Stock levels per company/SKU
- `returns` - Return orders
- `return_lines` - Return line items

#### SLA & Events
- `sla_profiles` - Company SLA configurations
- `sla_rules` - SLA rule definitions
- `sla_results` - Computed SLA compliance
- `sla_alerts` - SLA breach notifications
- `order_events` - Order status change events
- `order_notes` - Collaborative notes on orders

#### Integration & Configuration
- `api_keys` - Customer API keys
- `webhooks` - Webhook configurations
- `integrations` - Third-party integrations
- `feature_toggles` - Feature flags per company
- `notification_settings` - User notification preferences
- `celebration_settings` - Gamification settings

#### KPIs & Analytics
- `company_kpis` - KPI definitions
- `kpi_measurements` - KPI actual values
- `budgets` - Planned budget data
- `forecasts` - Forecast data
- `historical_snapshots` - YoY comparison data
- `productivity_metrics` - UPH/OPH tracking
- `quality_metrics` - Quality scores

#### Purchase Orders & Receiving
- `purchase_orders` - Inbound PO headers
- `purchase_order_lines` - PO line items
- `receiving_sessions` - Receiving workflow sessions
- `receiving_counts` - Scanned/received counts
- `discrepancies` - Receiving discrepancies
- `po_attachments` - PO document attachments

#### Quality Intelligence
- `quality_errors` - Error tracking
- `quality_scores` - Aggregated quality scores
- `root_cause_categories` - Error categorization

#### Packaging Intelligence
- `packaging_types` - Available packaging options
- `packaging_records` - Per-order packaging data
- `shipping_anomalies` - Shipping cost/routing issues
- `packaging_recommendations` - AI recommendations
- `packaging_metrics` - Daily packaging metrics

#### ABC Analysis & Forecasting
- `abc_classifications` - SKU ABC classes
- `abc_recommendations` - AI recommendations
- `abc_analysis_runs` - Analysis run history
- `clarification_cases` - Exception cases
- `demand_forecasts` - Demand predictions
- `replenishment_suggestions` - Reorder suggestions
- `stockout_alerts` - Low stock warnings

#### Audit & Logging
- `audit_logs` - User activity audit trail
- `sync_logs` - Data sync history

### Materialized Views

- `order_sla_status` - Pre-computed SLA status for orders

## Key Concepts

### Multi-Tenancy

The system supports multi-tenant isolation via:
- `company_id` foreign keys on most tables
- Row Level Security (RLS) policies
- `memberships` table for user-company relationships
- Separate role hierarchies for customer vs MSD staff

### Role Hierarchy

1. **Customer Roles** (per company):
   - `viewer` - Read-only access to company data
   - `admin` - Full access to company data + user management

2. **MSD Staff Roles** (cross-company):
   - `msd_csm` - Customer Success Manager
   - `msd_ma` - MSD Account Manager
   - `msd_ops` - Warehouse Operations
   - `msd_management` - Management

3. **System Role**:
   - `system_admin` - Full system access

### Realtime Subscriptions

The following tables are enabled for Supabase Realtime:
- `orders`
- `inventory`
- `returns`
- `order_notes`
- `order_events`
- `memberships`
- `csm_assignments`

## Database Conventions

- **Primary Keys**: UUID with `gen_random_uuid()` default
- **Timestamps**: `created_at` and `updated_at` with automatic trigger updates
- **Soft Deletes**: `deleted_at`, `deleted_by`, `deletion_reason` on profiles
- **RLS**: Enabled on all tables with security policies
- **Naming**: snake_case for all identifiers
