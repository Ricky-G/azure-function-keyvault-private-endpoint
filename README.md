# This has been archived and this same scenario can be found in the below repo
 [Ricky-G/azure-function-keyvault-private-endpoints-access-keyvault-scenario](https://github.com/Ricky-G/azure-scenario-hub/tree/main/src/function-app-private-endpoints-access-keyvault-scenario)

## Azure Function App with Key Vault Private Endpoint Demo

This project demonstrates how to deploy an Azure Function App that securely accesses Azure Key Vault through a private endpoint using VNet integration and Managed Identity. This is an example of secure Azure serverless architecture.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Function App  │────│   Private EP    │────│   Key Vault     │
│  (VNet Integrated)    │  (VNet Subnet)  │    │ (No Public Access) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Private DNS Zone│
                    │ (vault.azure.net)│
                    └─────────────────┘
```

### Components

- **Function App**: Node.js Azure Function with VNet integration and Elastic Premium plan
- **Key Vault**: Configured with private endpoint and public access disabled
- **Private Endpoint**: Secure connection between Function App and Key Vault
- **User-Assigned Managed Identity**: Secure authentication without credentials
- **Virtual Network**: Custom VNet with dedicated subnets for compute and private endpoints
- **Private DNS Zone**: Resolves Key Vault FQDN to private IP addresses
- **Storage Account**: Required for Function App operation

## ✨ Features

- ✅ **Zero Public Internet Traffic**: All communication via private endpoints
- ✅ **Managed Identity Authentication**: No stored credentials or connection strings
- ✅ **VNet Integration**: Function App integrated with virtual network
- ✅ **Infrastructure as Code**: Complete Bicep templates
- ✅ **Production Ready**: Follows Azure security best practices
- ✅ **Comprehensive Monitoring**: Application Insights integration
- ✅ **Scalable Architecture**: Elastic Premium hosting plan

## 🔧 Prerequisites

Before deploying this solution, ensure you have:

- **Azure CLI** (version 2.37.0 or later)
- **Azure subscription** with the following permissions:
  - Resource Group Contributor or higher
  - Network Contributor (for VNet and private endpoints)
  - Key Vault Contributor
  - Function App Contributor
- **PowerShell** (for Windows) or **Bash** (for Linux/macOS)
- **Node.js** (version 18 or later) for local development

### Required Azure Resource Providers

Ensure these resource providers are registered in your subscription:
```bash
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.ManagedIdentity
```

## 🚀 Step-by-Step Deployment Guide

### Step 1: Prepare Your Environment

1. **Clone or download this repository**
2. **Open terminal/PowerShell** in the project root directory
3. **Login to Azure**:
   ```bash
   az login
   ```
4. **Set your subscription** (if you have multiple):
   ```bash
   az account set --subscription "your-subscription-id"
   ```

### Step 2: Create Resource Group

Choose a region that supports all required services. We recommend `Australia East`, `East US 2`, or `West Europe`:

```bash
# Set variables
$resourceGroup = "rg-func-keyvault-demo"
$location = "australiaeast"  # Change as needed

# Create resource group
az group create --name $resourceGroup --location $location
```

### Step 3: Deploy Infrastructure

Deploy the Bicep template that creates all Azure resources:

```bash
# Deploy infrastructure (this takes 5-10 minutes)
az deployment group create `
  --resource-group $resourceGroup `
  --template-file "infra/main.bicep" `
  --parameters location=$location
```

**What this creates:**
- Virtual Network with subnets
- User-Assigned Managed Identity
- Storage Account for Function App
- App Service Plan (Elastic Premium EP1)
- Function App with VNet integration
- Key Vault with private endpoint
- Private DNS Zone and records
- Sample secret in Key Vault
- Required role assignments

### Step 4: Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

### Step 5: Deploy Function Code

#### Option A: ZIP Deployment (Recommended)

1. **Create deployment package**:
   ```powershell
   # Remove old package if exists
   Remove-Item "functionapp.zip" -Force -ErrorAction SilentlyContinue
   
   # Create new deployment package
   Compress-Archive -Path "host.json", "package.json", "package-lock.json", "node_modules", "keyVaultDemo" -DestinationPath "functionapp.zip" -Force
   ```

2. **Deploy to Function App**:
   ```bash
   # Get the Function App name from deployment output
   $functionAppName = $(az deployment group show --resource-group $resourceGroup --name main --query 'properties.outputs.functionAppName.value' -o tsv)
   
   # Deploy the ZIP package
   az functionapp deployment source config-zip --name $functionAppName --resource-group $resourceGroup --src "functionapp.zip"
   ```

#### Option B: Using Azure Functions Core Tools

```bash
# Install Azure Functions Core Tools if not already installed
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Deploy function
func azure functionapp publish $functionAppName --node
```

### Step 6: Verify Deployment

1. **Check if function is recognized**:
   ```bash
   az functionapp function list --name $functionAppName --resource-group $resourceGroup
   ```

2. **Test the function endpoint**:
   ```bash
   # Get the function URL
   $functionUrl = "https://$functionAppName.azurewebsites.net/api/keyvaultdemo"
   
   # Test the endpoint
   curl $functionUrl
   ```

**Expected successful response:**
```json
{
  "message": "Successfully retrieved secret from Key Vault via private endpoint!",
  "secretName": "demo-secret",
  "keyVaultUrl": "https://kv-xxxxxx.vault.azure.net/",
  "secretMetadata": {
    "id": "https://kv-xxxxxx.vault.azure.net/secrets/demo-secret/xxxxx",
    "enabled": true,
    "createdOn": "2025-06-26T00:02:22.000Z",
    "updatedOn": "2025-06-26T00:02:22.000Z"
  },
  "secretPreview": "Hel...nt!",
  "privateEndpointAccess": true,
  "managedIdentityUsed": true,
  "timestamp": "2025-06-26T11:12:49.746Z"
}
```

## 🧪 Testing and Validation

### Test Private Endpoint Connectivity

1. **Verify private endpoint DNS resolution**:
   ```bash
   # This should resolve to a private IP (10.x.x.x)
   nslookup $(az keyvault show --name $(az deployment group show --resource-group $resourceGroup --name main --query 'properties.outputs.keyVaultName.value' -o tsv) --query 'properties.vaultUri' -o tsv | sed 's|https://||' | sed 's|/||')
   ```

2. **Check VNet integration status**:
   ```bash
   az functionapp vnet-integration list --name $functionAppName --resource-group $resourceGroup
   ```

3. **Verify Key Vault access policies**:
   ```bash
   az keyvault show --name $(az deployment group show --resource-group $resourceGroup --name main --query 'properties.outputs.keyVaultName.value' -o tsv) --query 'properties.networkAcls'
   ```

### Monitor Application Logs

Access logs through Azure Portal:
1. Navigate to your Function App
2. Go to **Monitoring** > **Log stream**
3. Execute the function and watch real-time logs

## 🛠️ Customization

### Modify Function Behavior

Edit `keyVaultDemo/index.js` to:
- Change secret names
- Add additional Key Vault operations
- Implement different response formats
- Add custom logging

### Infrastructure Changes

Edit `infra/main.bicep` to:
- Change SKU sizes
- Add additional subnets
- Configure custom DNS
- Add monitoring alerts

### Security Enhancements

- Enable Application Insights for monitoring
- Configure custom domains with SSL
- Add API Management for additional security
- Implement Azure Front Door for global distribution

## 🔒 Security Best Practices Implemented

1. **Network Security**:
   - No public internet access to Key Vault
   - VNet integration for Function App
   - Private endpoints with private DNS

2. **Identity and Access**:
   - User-Assigned Managed Identity
   - Least-privilege RBAC assignments
   - No stored credentials or connection strings

3. **Data Protection**:
   - Secrets never logged in plain text
   - Secure in-transit communication
   - Azure Key Vault encryption at rest

4. **Monitoring and Compliance**:
   - Application Insights integration
   - Structured logging
   - Error handling with security context

## 🏗️ Architecture Decision Records

### Why Elastic Premium Plan?
- **VNet Integration**: Required for private endpoint access
- **Scaling**: Better performance than Consumption plan
- **Enterprise Features**: Enhanced security and monitoring

### Why User-Assigned Managed Identity?
- **Lifecycle Management**: Independent of Function App lifecycle
- **Reusability**: Can be shared across multiple resources
- **Security**: Better than system-assigned for complex scenarios

### Why Private Endpoints?
- **Zero Trust**: No public internet exposure
- **Compliance**: Meets strict security requirements
- **Performance**: Lower latency within Azure backbone

## 📊 Cost Considerations

Estimated monthly costs (Australia East):
- **Function App (EP1)**: ~$73 USD/month
- **Storage Account**: ~$2 USD/month
- **Key Vault**: ~$3 USD/month
- **Private Endpoint**: ~$7 USD/month
- **VNet**: Free
- **DNS Zone**: ~$0.50 USD/month

**Total**: ~$85 USD/month

*Note: Costs may vary by region and usage patterns*

## 🧹 Cleanup

To remove all resources and avoid charges:

```bash
# Delete the entire resource group
az group delete --name $resourceGroup --yes --no-wait
```

## 🆘 Troubleshooting

### Common Issues

**Function not found error**:
- Ensure ZIP deployment completed successfully
- Check function structure matches Azure Functions v4 requirements
- Verify `host.json` and `package.json` are included

**Key Vault access denied**:
- Verify managed identity has correct role assignments
- Check if Key Vault public access is properly disabled
- Ensure private endpoint is correctly configured

**Network connectivity issues**:
- Verify VNet integration is enabled on Function App
- Check private DNS zone configuration
- Ensure subnet delegation is configured correctly

**Deployment failures**:
- Check quota limits in your subscription
- Try alternative regions if quota is exceeded
- Verify all required resource providers are registered

### Get Support

1. **Check Azure status**: [Azure Status Page](https://status.azure.com/)
2. **Review logs**: Use Application Insights and Function App logs
3. **Azure Support**: Create support ticket through Azure Portal

## 📁 Project Structure

```
functionapp-privateendpoints/
├── infra/
│   └── main.bicep                   # Infrastructure as Code (Bicep)
├── keyVaultDemo/
│   ├── function.json                # Function binding configuration
│   └── index.js                     # Function implementation
├── src/functions/                   # Original function location (reference)
│   └── keyVaultDemo.js             # TypeScript/modern Azure Functions version
├── azure.yaml                      # Azure Developer CLI configuration
├── host.json                       # Azure Functions host configuration
├── package.json                    # Node.js dependencies
├── package-lock.json              # Dependency lock file
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## 📝 Additional Resources

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Key Vault Private Endpoints](https://docs.microsoft.com/azure/key-vault/general/private-link-service)
- [Azure Functions VNet Integration](https://docs.microsoft.com/azure/azure-functions/functions-networking-options)
- [Managed Identity Best Practices](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Bicep Documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🎯 Next Steps

After successfully deploying this demo, consider:

1. **Production Hardening**: Add monitoring, alerting, and backup strategies
2. **CI/CD Pipeline**: Implement GitHub Actions or Azure DevOps pipelines
3. **Multi-Environment**: Create separate environments (dev, staging, prod)
4. **Advanced Networking**: Add Azure Front Door or Application Gateway
5. **Compliance**: Implement Azure Policy and compliance frameworks

## ✅ Success Validation Checklist

- [ ] Infrastructure deployed successfully
- [ ] Function App created and running
- [ ] Key Vault private endpoint configured
- [ ] Function code deployed and recognized
- [ ] Endpoint responds with success message
- [ ] Private endpoint connectivity confirmed
- [ ] Managed identity authentication working
- [ ] Logs show successful Key Vault access

---

*This demo was successfully tested and validated on June 26, 2025, using Azure CLI and PowerShell on Windows.*
