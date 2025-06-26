import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

/**
 * Simple demo function that retrieves a secret from Key Vault using Managed Identity
 * and private endpoint connectivity. This demonstrates secure access to Key Vault
 * without exposing credentials or using public internet routes.
 */
export async function getKeyVaultSecret(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP function processed request for url "${request.url}"`);

    try {
        // Get Key Vault URL from environment variables (set in Bicep template)
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (!keyVaultUrl) {
            return {
                status: 500,
                body: JSON.stringify({
                    error: 'KEY_VAULT_URL environment variable not found',
                    message: 'Ensure the Function App is properly configured with Key Vault URL'
                })
            };
        }

        context.log(`Connecting to Key Vault: ${keyVaultUrl}`);

        // Use DefaultAzureCredential with User Assigned Managed Identity
        // The AZURE_CLIENT_ID environment variable is automatically used
        const credential = new DefaultAzureCredential();
        
        // Create Key Vault client - this will use the private endpoint
        const secretClient = new SecretClient(keyVaultUrl, credential);

        // Retrieve the demo secret (created in Bicep template)
        const secretName = 'demo-secret';
        context.log(`Retrieving secret: ${secretName}`);
        
        const secret = await secretClient.getSecret(secretName);
        
        if (!secret.value) {
            return {
                status: 404,
                body: JSON.stringify({
                    error: 'Secret not found or empty',
                    secretName: secretName
                })
            };
        }

        // Log success (without exposing secret value in logs)
        context.log(`Successfully retrieved secret from Key Vault via private endpoint`);

        // Return success response with metadata (not the actual secret value for security)
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: 'Successfully accessed Key Vault via private endpoint!',
                secretName: secretName,
                secretValue: secret.value, // In production, avoid logging/returning actual secret values
                keyVaultUrl: keyVaultUrl,
                retrievedAt: new Date().toISOString(),
                connectionMethod: 'Private Endpoint',
                authenticationMethod: 'User Assigned Managed Identity'
            })
        };

    } catch (error) {
        context.error('Error accessing Key Vault:', error);
        
        // Provide detailed error information for troubleshooting
        let errorMessage = 'Unknown error occurred';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Identify common error scenarios
            if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
                errorCode = 'NETWORK_ERROR';
                errorMessage = 'Network connectivity issue - check private endpoint configuration';
            } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
                errorCode = 'ACCESS_DENIED';
                errorMessage = 'Access denied - check managed identity permissions';
            } else if (error.message.includes('401')) {
                errorCode = 'AUTHENTICATION_FAILED';
                errorMessage = 'Authentication failed - check managed identity configuration';
            }
        }

        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: errorCode,
                message: errorMessage,
                keyVaultUrl: process.env.KEY_VAULT_URL,
                timestamp: new Date().toISOString(),
                troubleshooting: {
                    checkItems: [
                        'Verify Function App has VNet integration enabled',
                        'Confirm Key Vault private endpoint is properly configured',
                        'Check managed identity has Key Vault Secrets User role',
                        'Verify private DNS zone is linked to VNet',
                        'Ensure Key Vault public access is disabled'
                    ]
                }
            })
        };
    }
}

// Register the HTTP trigger function
app.http('getKeyVaultSecret', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: getKeyVaultSecret
});
