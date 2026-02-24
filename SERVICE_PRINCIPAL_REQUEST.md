# Service Principal Request for Azure Administrator

## ✅ Option A: Reuse Existing Service Principal (Recommended)

An existing service principal is already configured with OIDC for the CrossBorderX project:

**Service Principal:** MSD_CrossborderX_CustomsClearanceMod  
**Client ID:** `627f7214-9015-4eec-a9b6-77ca049dff3a`  
**Already uses:** OIDC/Federated Credentials (more secure than client secrets)

### Grant Access to IGNITE-DEV

Simply add Contributor role on the IGNITE-DEV resource group:

```bash
az role assignment create \
  --assignee 627f7214-9015-4eec-a9b6-77ca049dff3a \
  --role Contributor \
  --scope /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV
```

**Return this information:**
- Client ID: `627f7214-9015-4eec-a9b6-77ca049dff3a` (already known)
- Confirmation that role was assigned

**Pros:**
- ✅ Already configured with OIDC  
- ✅ No new secrets to manage  
- ✅ Faster setup  
- ✅ Used successfully in other projects

**Cons:**
- ⚠️ Shared between projects (less isolation)

---

## Option B: Create New Service Principal

If project isolation is preferred, create a new service principal specifically for Ignite.

## Request Summary

Please create an Azure service principal for GitHub Actions to deploy the Ignite application.

**Requested by:** adminvezr@ms-direct.ch  
**Purpose:** GitHub Actions CI/CD for Ignite application  
**Scope:** IGNITE-DEV resource group only  
**Date:** February 13, 2026

## Command to Execute

Please run ONE of these commands:

### Option 1: Standard Method (with client secret)

```bash
az ad sp create-for-rbac \
  --name "github-actions-ignite" \
  --role Contributor \
  --scopes /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV \
  --json-auth
```

### Option 2: Federated Credentials (Recommended - More Secure)

```bash
# Step 1: Create service principal
az ad sp create-for-rbac \
  --name "github-actions-ignite" \
  --role Contributor \
  --scopes /subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV \
  --skip-assignment

# Step 2: Get the app ID from output
APP_ID="<paste-app-id-from-output>"

# Step 3: Add federated credential for GitHub
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-ignite-dev",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/YOUR_GITHUB_REPO:environment:dev",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Required Information to Return

Please provide the command output which contains:

| Field | Description |
|-------|-------------|
| `clientId` or `appId` | Application (client) ID |
| `tenantId` or `tenant` | Directory (tenant) ID |
| `subscriptionId` | Azure subscription ID |

**Note:** If using Option 2 (federated credentials), no client secret is needed.

## Permissions Being Granted

- **Role:** Contributor
- **Scope:** `/subscriptions/c321b95e-e568-42f0-b5fc-3ef2867b7e74/resourceGroups/IGNITE-DEV`
- **Access:** Limited to IGNITE-DEV resource group only
- **Actions allowed:** Create, read, update, delete resources within IGNITE-DEV

## Resources in IGNITE-DEV

The service principal will manage these resources:
- Azure Static Web App (ignite-dev)
- Azure Container Apps (Supabase services)
- Azure Container Registry (ignitedevacr)
- Virtual Network and subnets
- Application Insights

## Security Considerations

✅ **Scope limited** to single resource group  
✅ **No subscription-wide access**  
✅ **Federated credentials** recommended (no long-lived secrets)  
✅ **Used only by GitHub Actions** (not for local development)  
✅ **Can be revoked** at any time if needed

## Questions?

Contact: adminvezr@ms-direct.ch

---

**Subscription Details:**
- Subscription: MSDG-MSD-AI-INITIATIVES
- Subscription ID: c321b95e-e568-42f0-b5fc-3ef2867b7e74
- Tenant ID: d544595f-a238-4e1b-90e7-fa046d4f8cbd
- Resource Group: IGNITE-DEV
- Region: Switzerland North
