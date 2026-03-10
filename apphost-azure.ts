// Azure Infrastructure AppHost
// Defines cloud infrastructure using the @azure/provisioning library and
// registers it with Aspire as Azure Bicep resources.

import { createBuilder } from './.modules/aspire.js';
import { Infrastructure, ProvisioningOutput } from '@azure/provisioning';
import { StorageAccount, BlobService, BlobContainer } from '@azure/provisioning-storage';
import { KeyVaultService } from '@azure/provisioning-key-vault';

// ─── Storage Infrastructure ──────────────────────────────────────────────────
// Mirrors: builder.AddAzureStorage("storage") in C# Aspire

const storageInfra = Infrastructure.withDefaultLocation();
const locationRef = storageInfra.locationRef!;

const storage = new StorageAccount('storage', {
    skuName: 'Standard_LRS',
    location: locationRef,
    aspireResourceName: 'storage',
});

const blobService = new BlobService('blobService', storage);
const uploadsContainer = new BlobContainer('uploads', blobService, 'uploads');

storageInfra
    .add(storage)
    .add(blobService)
    .add(uploadsContainer)
    .add(new ProvisioningOutput('blobEndpoint', 'string', storage.blobEndpoint))
    .add(new ProvisioningOutput('queueEndpoint', 'string', storage.queueEndpoint))
    .add(new ProvisioningOutput('storageName', 'string', storage.name));

// ─── Key Vault Infrastructure ─────────────────────────────────────────────────
// Mirrors: builder.AddAzureKeyVault("keyVault") in C# Aspire

const kvInfra = Infrastructure.withDefaultLocation();
const kvLocationRef = kvInfra.locationRef!;

const keyVault = new KeyVaultService('keyVault', {
    skuName: 'standard',
    enableRbacAuthorization: true,
    location: kvLocationRef,
    aspireResourceName: 'keyVault',
});

kvInfra
    .add(keyVault)
    .add(new ProvisioningOutput('vaultUri', 'string', keyVault.vaultUri))
    .add(new ProvisioningOutput('keyVaultName', 'string', keyVault.name));

// ─── Compile to Bicep ────────────────────────────────────────────────────────

const storageBicep = storageInfra.build().compile();
const kvBicep = kvInfra.build().compile();

// ─── Register with Aspire and Run ────────────────────────────────────────────

const builder = await createBuilder();

await builder.addBicepTemplateString('storage', storageBicep);
await builder.addBicepTemplateString('keyVault', kvBicep);

await builder.build().run();
