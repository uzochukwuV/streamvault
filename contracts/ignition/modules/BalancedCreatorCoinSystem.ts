import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BalancedCreatorCoinSystemModule = buildModule("BalancedCreatorCoinSystemModule", (m) => {
  // Deploy the metrics manager first
  const creatorMetricsManager = m.contract("CreatorMetricsManager");

  // Deploy the token deployment factory
  const tokenDeploymentFactory = m.contract("TokenDeploymentFactory");

  // Deploy the token factory with reference to metrics manager and deployment factory
  const creatorTokenFactory = m.contract("CreatorTokenFactory", [
    creatorMetricsManager,
    tokenDeploymentFactory
  ]);

  // Deploy the IntegratedCreatorDEX contract with reference to the token factory
  const integratedCreatorDEX = m.contract("IntegratedCreatorDEX", [creatorTokenFactory]);

  // Critical setup: Authorize token factory to deploy tokens
  m.call(tokenDeploymentFactory, "authorizeDeployer", [creatorTokenFactory]);

  return {
    creatorMetricsManager,
    tokenDeploymentFactory,
    creatorTokenFactory,
    integratedCreatorDEX,
  };
});

export default BalancedCreatorCoinSystemModule;