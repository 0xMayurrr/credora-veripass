const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("🚀 Deploying contracts with account:", deployer.address);

    // 1. Deploy RoleManager
    const RoleManager = await hre.ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.deploy();
    await roleManager.waitForDeployment();
    const roleManagerAddress = await roleManager.getAddress();
    console.log("✅ RoleManager deployed to:", roleManagerAddress);

    // 2. Deploy RevocationRegistry
    const RevocationRegistry = await hre.ethers.getContractFactory("RevocationRegistry");
    const revocationRegistry = await RevocationRegistry.deploy(roleManagerAddress);
    await revocationRegistry.waitForDeployment();
    const revocationRegistryAddress = await revocationRegistry.getAddress();
    console.log("✅ RevocationRegistry deployed to:", revocationRegistryAddress);

    // 3. Deploy CredentialRegistry
    const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy(roleManagerAddress);
    await credentialRegistry.waitForDeployment();
    const credentialRegistryAddress = await credentialRegistry.getAddress();
    console.log("✅ CredentialRegistry deployed to:", credentialRegistryAddress);

    // 4. Deploy CertificateLifecycle
    const CertificateLifecycle = await hre.ethers.getContractFactory("CertificateLifecycle");
    const certificateLifecycle = await CertificateLifecycle.deploy(roleManagerAddress, revocationRegistryAddress);
    await certificateLifecycle.waitForDeployment();
    const lifecycleAddress = await certificateLifecycle.getAddress();
    console.log("✅ CertificateLifecycle deployed to:", lifecycleAddress);

    const addresses = {
        roleManager: roleManagerAddress,
        revocationRegistry: revocationRegistryAddress,
        credentialRegistry: credentialRegistryAddress,
        certificateLifecycle: lifecycleAddress
    };

    fs.writeFileSync("deployed_addresses.json", JSON.stringify(addresses, null, 2));

    console.log("\n--- DEPLOYMENT SUMMARY ---");
    console.log("Addresses saved to deployed_addresses.json");
    console.log("--------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
