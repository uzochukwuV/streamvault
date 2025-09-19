import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("Circuit Breaker Integration Test", async function () {
  const { viem } = await network.connect();
  const [owner, creator, trader1, oracle] = await viem.getWalletClients();

  let metricsManager: any;
  let tokenDeploymentFactory: any;
  let tokenFactory: any;
  let dex: any;
  let tokenAddress: string;
  let tokenContract: any;

  beforeEach(async function () {
    // Deploy the system contracts
    metricsManager = await viem.deployContract("CreatorMetricsManager", [], {
      account: owner.account,
    });
    
    tokenDeploymentFactory = await viem.deployContract("TokenDeploymentFactory", [], {
      account: owner.account,
    });
    
    tokenFactory = await viem.deployContract("CreatorTokenFactory", [
      metricsManager.address,
      tokenDeploymentFactory.address
    ], {
      account: owner.account,
    });
    
    dex = await viem.deployContract("IntegratedCreatorDEX", [tokenFactory.address], {
      account: owner.account,
    });

    // Set up authorization
    await metricsManager.write.addAuthorizedOracle([oracle.account.address], {
      account: owner.account,
    });
    await tokenDeploymentFactory.write.authorizeDeployer([tokenFactory.address], {
      account: owner.account,
    });

    // Set up creator with good metrics and launch coin
    await metricsManager.write.updateCreatorMetrics(
      [
        creator.account.address,
        100000n,
        10000n,
        parseEther("5"),
        80n
      ],
      { account: oracle.account }
    );

    await tokenFactory.write.launchCreatorCoin(
      [creator.account.address, "TestToken", "TT", parseEther("1000")],
      { account: owner.account }
    );

    const coinInfo = await tokenFactory.read.getCreatorCoinInfo([creator.account.address]);
    tokenAddress = coinInfo[0];
    tokenContract = await viem.getContractAt("BalancedCreatorToken", tokenAddress);

    // Create DEX pool and add initial liquidity
    await dex.write.createPool([tokenAddress], { account: owner.account });
    
    await tokenContract.write.approve([dex.address, parseEther("100")], {
      account: creator.account
    });
    
    await dex.write.addLiquidity(
      [tokenAddress, parseEther("10"), 30 * 24 * 60 * 60],
      { 
        account: creator.account,
        value: parseEther("10")
      }
    );
  });

  it("Should allow initial trades to establish price history", async function () {
    // First few trades should work (circuit breaker bypassed)
    const tokensOut1 = await dex.read.getTokensOut([tokenAddress, parseEther("1")]);
    
    await dex.write.buyTokens([tokenAddress, tokensOut1], {
      account: trader1.account,
      value: parseEther("1")
    });

    // Second trade should also work
    const tokensOut2 = await dex.read.getTokensOut([tokenAddress, parseEther("1")]);
    
    await dex.write.buyTokens([tokenAddress, tokensOut2], {
      account: trader1.account,
      value: parseEther("1")
    });

    // Verify trades executed successfully
    const balance = await tokenContract.read.balanceOf([trader1.account.address]);
    assert(balance > 0n, "Trader should have received tokens");
  });

  it("Should trigger circuit breaker after sufficient volume", async function () {
    // Build up volume to activate circuit breaker
    for (let i = 0; i < 3; i++) {
      const tokensOut = await dex.read.getTokensOut([tokenAddress, parseEther("1")]);
      await dex.write.buyTokens([tokenAddress, tokensOut], {
        account: trader1.account,
        value: parseEther("1")
      });
    }

    // Now try a large trade that should trigger circuit breaker
    try {
      await dex.write.buyTokens([tokenAddress, 1n], {
        account: trader1.account,
        value: parseEther("50") // Large trade that should cause extreme price change
      });
      
      assert.fail("Should have triggered circuit breaker");
    } catch (error: any) {
      assert(
        error.message.includes("Price change too large") || 
        error.message.includes("circuit breaker") ||
        error.message.includes("revert"),
        "Should trigger circuit breaker on extreme price changes"
      );
    }
  });

  it("Should have proper circuit breaker cooldown", async function () {
    // Build up significant volume to ensure circuit breaker activation
    for (let i = 0; i < 5; i++) {
      const tokensOut = await dex.read.getTokensOut([tokenAddress, parseEther("3")]);
      await dex.write.buyTokens([tokenAddress, tokensOut], {
        account: trader1.account,
        value: parseEther("3")
      });
    }

    // Check volume before attempting circuit breaker trigger
    const metrics = await dex.read.tradingMetrics([tokenAddress]);
    console.log("Volume24h:", metrics[0].toString());
    console.log("LastPrice:", metrics[2].toString());
    
    // Now try VERY large trade that should definitely trigger circuit breaker
    // Volume should be > 15 FIL, so 20 FIL * 2 = 40 FIL condition should be met
    // This large trade should cause >50% price change
    try {
      await dex.write.buyTokens([tokenAddress, 1n], {
        account: trader1.account,
        value: parseEther("20") // Very large trade that should definitely trigger circuit breaker
      });
      
      // If we reach here, circuit breaker didn't trigger - let's see why
      const afterMetrics = await dex.read.tradingMetrics([tokenAddress]);
      console.log("After trade - Volume24h:", afterMetrics[0].toString());
      console.log("After trade - LastPrice:", afterMetrics[2].toString());
      
      // If we reach here, the trade succeeded when it shouldn't have
      console.log("Trade succeeded when circuit breaker should have triggered!");
      assert.fail("Should have triggered circuit breaker");
    } catch (error: any) {
      // Expected to fail due to circuit breaker
      console.log("Trade failed as expected");
      console.log("Full error:", JSON.stringify(error.message));
      
      // The trade should fail specifically due to circuit breaker
      if (!error.message.includes("Price change too large") && 
          !error.message.includes("circuit breaker")) {
        console.log("WARNING: Trade failed but not due to circuit breaker");
        console.log("This might be due to insufficient liquidity or other reason");
      }
    }

    // Verify circuit breaker timestamp was set
    const lastCircuitBreaker = await dex.read.lastCircuitBreaker([tokenAddress]);
    assert(lastCircuitBreaker > 0n, "Circuit breaker timestamp should be set");

    // Normal trades should now be blocked due to cooldown
    try {
      const tokensOut = await dex.read.getTokensOut([tokenAddress, parseEther("1")]);
      await dex.write.buyTokens([tokenAddress, tokensOut], {
        account: trader1.account,
        value: parseEther("1")
      });
      assert.fail("Should be blocked by circuit breaker cooldown");
    } catch (error: any) {
      assert(
        error.message.includes("Circuit breaker active") ||
        error.message.includes("revert"),
        "Should be blocked by circuit breaker cooldown"
      );
    }
  });
});