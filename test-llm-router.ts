/**
 * LLM Router Test Script
 *
 * Tests the multi-provider LLM router functionality
 * Run: npm run build && node dist/test-llm-router.js
 */

import { llmRouter, costTracker } from "./src/llm/index.js";
import { LLM_PRESETS, ROUTER_CONFIGS } from "./src/llm/config.js";

async function testLLMRouter() {
  console.log("🧪 Testing LLM Router\n");
  console.log("=" .repeat(60));

  try {
    // Configure router for testing
    console.log("\n📋 Router Configuration:");
    console.log(`  Environment: ${process.env.LLM_ROUTER_ENVIRONMENT || 'default'}`);
    console.log(`  Default Provider: ${process.env.LLM_DEFAULT_PROVIDER || 'anthropic'}`);
    console.log(`  Default Model: ${process.env.LLM_DEFAULT_MODEL || 'claude-sonnet-4.5'}`);

    // Test 1: Document Categorization (Cost Optimized)
    console.log("\n" + "=".repeat(60));
    console.log("Test 1: Document Categorization (Cost Optimized)");
    console.log("=".repeat(60));

    const catResponse = await llmRouter.complete(
      {
        messages: [
          {
            role: "user",
            content: "Categorize this document: 'DRC Infrastructure Risk Register v2.3.pdf'"
          }
        ],
        metadata: {
          requestType: "document_categorization",
          workflowId: "test_workflow"
        }
      },
      LLM_PRESETS.DOCUMENT_CATEGORIZATION
    );

    console.log(`✅ Provider: ${catResponse.provider}/${catResponse.model}`);
    console.log(`💰 Cost: $${catResponse.metadata?.cost?.toFixed(6) || '0.000000'}`);
    console.log(`🔢 Tokens: ${catResponse.usage.totalTokens}`);
    console.log(`⏱️  Response Time: ${catResponse.metadata?.responseTime || 0}ms`);
    console.log(`📝 Response Preview: ${catResponse.content.substring(0, 100)}...`);

    // Test 2: Simple Task (Ultra Fast)
    console.log("\n" + "=".repeat(60));
    console.log("Test 2: Simple Task (Ultra Fast)");
    console.log("=".repeat(60));

    const simpleResponse = await llmRouter.complete(
      {
        messages: [
          {
            role: "user",
            content: "What color is the sky? Answer in one word."
          }
        ],
        metadata: {
          requestType: "simple_task"
        }
      },
      LLM_PRESETS.SIMPLE_TASK
    );

    console.log(`✅ Provider: ${simpleResponse.provider}/${simpleResponse.model}`);
    console.log(`💰 Cost: $${simpleResponse.metadata?.cost?.toFixed(6) || '0.000000'}`);
    console.log(`⏱️  Response Time: ${simpleResponse.metadata?.responseTime || 0}ms`);
    console.log(`📝 Response: ${simpleResponse.content}`);

    // Test 3: Cost Statistics
    console.log("\n" + "=".repeat(60));
    console.log("Cost Statistics");
    console.log("=".repeat(60));

    const stats = costTracker.getStatistics();
    console.log(`📊 Total Requests: ${stats.totalRequests}`);
    console.log(`💵 Total Cost: $${stats.totalCost.toFixed(6)}`);
    console.log(`💰 Avg Cost/Request: $${stats.avgCostPerRequest.toFixed(6)}`);
    console.log(`🔢 Total Tokens: ${stats.totalTokens}`);

    console.log("\n📈 By Provider:");
    for (const [provider, cost] of Object.entries(stats.byProvider)) {
      console.log(`  ${provider}: $${cost.toFixed(6)}`);
    }

    console.log("\n📊 By Workflow:");
    for (const [workflow, cost] of Object.entries(stats.byWorkflow)) {
      console.log(`  ${workflow}: $${cost.toFixed(6)}`);
    }

    // Test 4: Performance Metrics
    console.log("\n" + "=".repeat(60));
    console.log("Performance Metrics");
    console.log("=".repeat(60));

    const metrics = llmRouter.getPerformanceMetrics();
    for (const metric of metrics) {
      console.log(`\n${metric.provider}/${metric.model}:`);
      console.log(`  ⏱️  Avg Response: ${metric.avgResponseTime.toFixed(0)}ms`);
      console.log(`  ✅ Success Rate: ${((1 - metric.errorRate) * 100).toFixed(1)}%`);
      console.log(`  📊 Total Requests: ${metric.totalRequests}`);
    }

    // Test 5: Custom Selection
    console.log("\n" + "=".repeat(60));
    console.log("Test 5: Custom Selection Strategy");
    console.log("=".repeat(60));

    const balancedResponse = await llmRouter.complete(
      {
        messages: [
          {
            role: "user",
            content: "Explain the importance of risk management in a project in 2 sentences."
          }
        ]
      },
      {
        strategy: "balanced",
        taskType: "generation",
        budget: "medium",
        latencyRequirement: "medium"
      }
    );

    console.log(`✅ Provider: ${balancedResponse.provider}/${balancedResponse.model}`);
    console.log(`💰 Cost: $${balancedResponse.metadata?.cost?.toFixed(6) || '0.000000'}`);
    console.log(`📝 Response: ${balancedResponse.content}`);

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("Test Summary");
    console.log("=".repeat(60));

    const finalStats = costTracker.getStatistics();
    console.log(`✅ All tests passed!`);
    console.log(`📊 Total Tests Run: ${finalStats.totalRequests}`);
    console.log(`💵 Total Cost: $${finalStats.totalCost.toFixed(6)}`);
    console.log(`💰 Today's Total Cost: $${costTracker.getTodayCost().toFixed(6)}`);

    console.log("\n🎉 LLM Router is working perfectly!\n");

  } catch (error: any) {
    console.error("\n❌ Test failed:");
    console.error(error.message);

    if (error.message.includes("API key")) {
      console.log("\n💡 Tip: Make sure you have at least one API key configured in your .env file:");
      console.log("   ANTHROPIC_API_KEY=sk-ant-...");
      console.log("   OPENAI_API_KEY=sk-...");
      console.log("   GOOGLE_API_KEY=AI...");
    }

    process.exit(1);
  }
}

// Run tests
testLLMRouter();
