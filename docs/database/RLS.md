# Row Level Security (RLS) Policies

This document describes the Row Level Security policies that enforce data access control in the Ignite database.

---

## Overview

All tables in the `public` schema have RLS enabled. Access is controlled through policies that check:

1. **User identity** - `auth.uid()` from Supabase Auth
2. **User roles** - via `has_role()` function
3. **Company membership** - via `get_user_company_id()` or `has_company_access()` functions
4. **Membership status** - `status = 'approved'` check

---

## Access Patterns

### Customer Access Hierarchy

| Role | Company Data | Other Companies |
|------|--------------|-----------------|
| `viewer` | Read own company | No access |
| `admin` | Full own company + user management | No access |

### MSD Staff Access

| Role | Access Level |
|------|--------------|
| `msd_csm` | Read all companies |
| `msd_ma` | Read all companies |
| `msd_ops` | Read all + manage POs/receiving |
| `msd_management` | Read all + analytics |
| `system_admin` | Full access everywhere |

---

## Policy Patterns

### Pattern 1: Company Isolation

Most tables use this pattern for customer data isolation:

```sql
-- Users can view their own company data
CREATE POLICY "Users can view own company {table}"
ON public.{table} FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- MSD staff can view all data
CREATE POLICY "MSD staff can view all {table}"
ON public.{table} FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') OR 
  has_role(auth.uid(), 'msd_ma') OR 
  has_role(auth.uid(), 'system_admin')
);

-- System admins can manage all
CREATE POLICY "System admins can manage {table}"
ON public.{table} FOR ALL
USING (has_role(auth.uid(), 'system_admin'));
```

### Pattern 2: Membership-Based Access

Newer tables use approved memberships:

```sql
CREATE POLICY "Users can view {table} for their company"
ON public.{table} FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = {table}.company_id
    AND m.status = 'approved'
  )
);
```

### Pattern 3: Child Table Access

For tables with parent relationships:

```sql
-- Access via parent's company
CREATE POLICY "Users can view {child_table} for their orders"
ON public.{child_table} FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = {child_table}.order_id 
    AND o.company_id = get_user_company_id(auth.uid())
  )
);
```

---

## Table-Specific Policies

### profiles

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view their own profile | SELECT | `auth.uid() = user_id` |
| Users can update their own profile | UPDATE | `auth.uid() = user_id` |
| System admins can view all profiles | SELECT | `has_role(..., 'system_admin')` |
| System admins can update all profiles | UPDATE | `has_role(..., 'system_admin')` |
| Customer admins can view company profiles | SELECT | `has_role(..., 'admin') AND company_id = get_user_company_id(...)` |
| Customer admins can update company profiles | UPDATE | Same as above |

---

### user_roles

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view their own roles | SELECT | `auth.uid() = user_id` |
| System admins can view all user roles | SELECT | `has_role(..., 'system_admin')` |
| System admins can update all user roles | UPDATE | `has_role(..., 'system_admin')` |
| System admins can insert user roles | INSERT | `has_role(..., 'system_admin')` |
| System admins can delete user roles | DELETE | `has_role(..., 'system_admin')` |
| Customer admins can view company user roles | SELECT | Role check + company membership |
| Customer admins can update company user roles | UPDATE | Limited to `viewer`/`admin` roles |

---

### memberships

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view own memberships | SELECT | `auth.uid() = user_id` |
| Customer admins can view company memberships | SELECT | `has_role(..., 'admin') AND has_company_access(...)` |
| Customer admins can insert company memberships | INSERT | Limited to `viewer`/`admin` roles |
| Customer admins can update company memberships | UPDATE | Limited to `viewer`/`admin` roles |
| Customer admins can delete company memberships | DELETE | Limited to `viewer`/`admin` roles |
| MSD staff can view all memberships | SELECT | `has_role(..., 'msd_csm')` OR `has_role(..., 'msd_ma')` |
| System admins can view/insert/update/delete all | ALL | `has_role(..., 'system_admin')` |

---

### companies

| Policy | Operation | Condition |
|--------|-----------|-----------|
| System admins can manage all companies | ALL | `has_role(..., 'system_admin')` |
| MSD staff can view all companies | SELECT | CSM or MA role |
| Customer admins can view their own company | SELECT | `id = get_user_company_id(...)` |

---

### orders

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view own company orders | SELECT | `company_id = get_user_company_id(...)` |
| MSD staff can view all orders | SELECT | CSM, MA, or system_admin role |
| System admins can insert orders | INSERT | `has_role(..., 'system_admin')` |
| System admins can update orders | UPDATE | `has_role(..., 'system_admin')` |

---

### order_lines

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view order lines for their orders | SELECT | Via parent order's company |
| MSD staff can view all order lines | SELECT | CSM, MA, or system_admin role |
| System admins can insert order lines | INSERT | `has_role(..., 'system_admin')` |

---

### order_notes

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view order notes for their company | SELECT | Via parent order's company OR MSD staff |
| Users can create notes for their company orders | INSERT | Via parent order's company OR MSD staff |
| Users can update their own notes | UPDATE | `auth.uid() = user_id` |
| Users can delete their own notes | DELETE | `auth.uid() = user_id` |

---

### inventory

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view own company inventory | SELECT | `company_id = get_user_company_id(...)` |
| MSD staff can view all inventory | SELECT | CSM, MA, or system_admin role |
| System admins can manage inventory | ALL | `has_role(..., 'system_admin')` |

---

### returns / return_lines

Same pattern as orders/order_lines.

---

### api_keys

| Policy | Operation | Condition |
|--------|-----------|-----------|
| System admins can manage all api_keys | ALL | `has_role(..., 'system_admin')` |
| MSD staff can view all api_keys | SELECT | CSM or MA role |
| Customer admins can view own company api_keys | SELECT | `has_role(..., 'admin') AND company_id = get_user_company_id(...)` |

**Note:** `key_hash` column is hidden via column-level REVOKE/GRANT.

---

### webhooks

| Policy | Operation | Condition |
|--------|-----------|-----------|
| System admins can manage all webhooks | ALL | `has_role(..., 'system_admin')` |
| MSD staff can view all webhooks | SELECT | CSM or MA role |
| Customer admins can manage own company webhooks | ALL | Admin role + company match |

---

### sla_* tables

| Table | Customer Access | MSD Access | System Admin |
|-------|-----------------|------------|--------------|
| sla_profiles | View own company | View all | Full |
| sla_rules | View own company | View all | Full |
| sla_results | Via order/return company | View all | View all |
| sla_alerts | Via company_id | View all | View all |

---

### audit_logs

| Policy | Operation | Condition |
|--------|-----------|-----------|
| System admins can view all audit_logs | SELECT | `has_role(..., 'system_admin')` |
| MSD staff can view all audit_logs | SELECT | CSM or MA role |
| Customer admins can view company audit_logs | SELECT | Admin role + company match |
| Users can view own audit_logs | SELECT | `auth.uid() = user_id` |
| Authenticated users can insert audit_logs | INSERT | `auth.uid() IS NOT NULL` |

---

### purchase_orders & related

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can view own company POs | SELECT | `company_id = get_user_company_id(...)` |
| MSD staff can view all POs | SELECT | CSM, MA, ops, management, or system_admin |
| Admins can insert POs for own company | INSERT | Admin role + company match |
| MSD staff can insert POs | INSERT | ops or system_admin role |
| MSD staff can update POs | UPDATE | ops or system_admin role |
| Admins can update own company POs | UPDATE | Admin role + company match |

---

### Quality & Packaging tables

Uses array-based membership check with `get_user_company_ids()`:

```sql
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);
```

---

## Security Best Practices

### 1. Always Use RLS

Never bypass RLS with service role in client code. Use Edge Functions for privileged operations.

### 2. Check Membership Status

For sensitive operations, verify membership is approved:

```sql
AND m.status = 'approved'
```

### 3. Limit Role Assignment

Customer admins can only assign `viewer` and `admin` roles:

```sql
WITH CHECK (role IN ('viewer', 'admin'))
```

### 4. Hide Sensitive Columns

Use column-level grants for sensitive data:

```sql
REVOKE SELECT ON public.api_keys FROM authenticated;
GRANT SELECT (id, company_id, name, key_prefix, ...) ON public.api_keys TO authenticated;
```

### 5. Use Security Definer Functions

Helper functions use `SECURITY DEFINER` to bypass RLS for role checks:

```sql
CREATE FUNCTION has_role(...)
SECURITY DEFINER
SET search_path = public
```

---

## Debugging RLS

### Check Current User

```sql
SELECT auth.uid();
SELECT auth.role();
```

### Check User's Roles

```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

### Check User's Memberships

```sql
SELECT * FROM memberships WHERE user_id = auth.uid();
```

### Check Which Policies Apply

```sql
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

### Test Policy as User

Use Supabase SQL Editor with a specific user's JWT to test their access.
