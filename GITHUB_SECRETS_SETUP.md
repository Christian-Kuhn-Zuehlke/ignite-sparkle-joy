# GitHub Actions Secrets Configuration

## ✅ Good News: You Have an Existing Service Principal!

I found that your CrossBorderX-Shipping project is already using a service principal with OIDC (Federated Identity):

**Existing Service Principal:**
- **Display Name:** MSD_CrossborderX_CustomsClearanceMod
- **Client ID:** `627f7214-9015-4eec-a9b6-77ca049dff3a`
- **Tenant ID:** `d544595f-a238-4e1b-90e7-fa046d4f8cbd` (same tenant ✓)
- **Currently has access to:** Different subscription (CrossBorderX)
- **Authentication:** OIDC/Federated Credentials (no client secrets needed!)

## 🎯 Two Options

### Option A: Reuse Existing Service Principal (Recommended)

**Pros:** Already configured with OIDC, no new secrets needed  
**Cons:** Need admin to grant access to IGNITE-DEV resource group

Ask your admin to run:
```bash
az role assignment create \
  --assignee 627f7214-9015-4eec-a9b6-77ca049dff3a \
  --role Contributor \
  --scope /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV
```

Then use: `AZURE_CLIENT_ID = 627f7214-9015-4eec-a9b6-77ca049dff3a`

### Option B: Create New Service Principal

If you prefer isolation between projects, ask your admin to create a new one.

## ❌ Why You Can't Do This Yourself

You don't have permission to create role assignments in Azure. You need an **Azure Administrator**.

## 📋 For Your Azure Administrator

Send this to your Azure admin:

---

**Request:** Please create a service principal for GitHub Actions deployment

**Command to run:**
```bash
az ad sp create-for-rbac \
  --name "github-actions-ignite" \
  --role Contributor \
  --scopes /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV \
  --json-auth
```

**Alternative: Use newer federated credentials (more secure):**
```bash
# Create the app registration and service principal
az ad sp create-for-rbac \
  --name "github-actions-ignite" \
  --role Contributor \
  --scopes /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV \
  --query "{clientId: appId, tenantId: tenant, subscriptionId: subscriptionId}"
```

Please provide the output which contains:
- `clientId` (also called appId)
- `tenantId` (also called tenant)
- `subscriptionId`

---

## 🔑 GitHub Secrets to Configure

Once you have the service principal credentials, add these secrets to GitHub:

**Location:** Settings → Environments → **dev** → Environment secrets

### Infrastructure Pipeline Secrets

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `AZURE_CLIENT_ID` | *(from admin)* | Service principal output: `clientId` or `appId` |
| `AZURE_TENANT_ID` | `d544595f-a238-4e1b-90e7-fa046d4f8cbd` | Service principal output: `tenantId` |
| `AZURE_SUBSCRIPTION_ID` | `c321b95e-e568-42f0-b5fc-3ef2867b7e74` | Service principal output: `subscriptionId` |
| `POSTGRES_CONNECTION_STRING` | `postgresql://supabase_app:6U5o35IzC3no0dkEvdhstU1C@pgsql-crossborderx-test-msd-chn.postgres.database.azure.com:5432/ignite_dev?sslmode=require` | From terraform.tfvars |
| `SUPABASE_JWT_SECRET` | `L1sfC2QxhsJfmSkl/pZRJxkg9DMQWULwKDSpWMMPT5U=` | From terraform.tfvars |
| `SUPABASE_ANON_KEY` | `5xQV/JZlbsGPpgTS2IrFPQ1ip3zbM+2hUDIuTv2YyHU=` | From terraform.tfvars |
| `SUPABASE_SERVICE_KEY` | `bpFgj7ce+w+8wlaBh0d3e8590p/VtWQmlgAqgNVXLyw=` | From terraform.tfvars |

### Application Pipeline Secrets

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `2ff26af065c3439f83d7e3c9a694aa4fe250652626299e041438597cc503aa0606-caffc2c0-5c24-4d3f-9130-3f8812320acd00308300e0e2d503` | From terraform output |
| `VITE_SUPABASE_URL` | `https://ca-supabase-kong.yellowfield-d5ff75dc.switzerlandnorth.azurecontainerapps.io` | From terraform output |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `5xQV/JZlbsGPpgTS2IrFPQ1ip3zbM+2hUDIuTv2YyHU=` | Same as SUPABASE_ANON_KEY |
| `VITE_SUPABASE_PROJECT_ID` | `ignite-dev` | Your environment name |
| `VITE_SENTRY_DSN` | *(optional)* | From sentry.io if you use error tracking |

## 📝 Step-by-Step: Adding Secrets to GitHub

1. Go to your GitHub repository: https://github.com/YOUR_ORG/YOUR_REPO
2. Click **Settings** (top menu)
3. Click **Environments** (left sidebar)
4. Click on **dev** environment (or create it if it doesn't exist)
5. Under **Environment secrets**, click **Add secret**
6. For each secret above:
   - Enter the **Name** (e.g., `AZURE_CLIENT_ID`)
   - Paste the **Value**
   - Click **Add secret**
7. Repeat for all 12 secrets

## ✅ Verification Checklist

After adding all secrets, verify:

- [ ] All 12 secrets are listed under the **dev** environment
- [ ] Secret names match exactly (case-sensitive)
- [ ] No extra spaces in secret values
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY matches SUPABASE_ANON_KEY exactly

## 🚀 Next Steps

Once secrets are configured:

1. **Test Infrastructure Pipeline:**
   - Go to Actions → Deploy Infrastructure (Terraform)
   - Run workflow → Select `dev` → Select `plan`
   - Review the plan output
   - Run again with `apply` to deploy

2. **Test Application Pipeline:**
   - Push to main branch OR
   - Go to Actions → Build, Test & Deploy to Azure
   - Run workflow manually

## 🔒 Security Notes

- **Never commit these values to Git**
- The service principal has Contributor access only to IGNITE-DEV resource group
- VITE_* variables are embedded in frontend (they're meant to be public)
- Real security comes from PostgreSQL Row Level Security (RLS) policies
- Consider using **Federated Credentials (OIDC)** instead of client secrets for better security

## 🆘 Need Help?

If secrets aren't working:
1. Check for typos in secret names (they're case-sensitive)
2. Ensure no extra whitespace in secret values
3. Verify the service principal has Contributor role on IGNITE-DEV resource group
4. Check GitHub Actions logs for specific error messages

---

Generated: 2026-02-13
Subscription: MSDG-MSD-AI-INITIATIVES (c321b95e-e568-42f0-b5fc-3ef2867b7e74)
Environment: dev
Resource Group: IGNITE-DEV
