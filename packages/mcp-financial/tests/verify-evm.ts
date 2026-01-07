/**
 * EVM Calculations Verification Script
 *
 * Simple script to verify EVM calculations are working correctly
 * Run with: node dist/tests/verify-evm.js
 */

import {
  calculateEVMMetrics,
  calculateHealthIndex,
} from "../src/evm/calculations.js";

console.log("EVM Calculations Verification\n");
console.log("=" .repeat(60));

// Test Case 1: Healthy Project
console.log("\n📊 Test Case 1: Healthy Project (Under budget, ahead of schedule)");
console.log("-".repeat(60));
const healthyMetrics = calculateEVMMetrics(
  100000,  // PV: Planned Value
  110000,  // EV: Earned Value
  95000,   // AC: Actual Cost
  200000   // BAC: Budget at Completion
);

console.log("Base Values:");
console.log(`  PV:  $100,000`);
console.log(`  EV:  $110,000`);
console.log(`  AC:   $95,000`);
console.log(`  BAC: $200,000`);
console.log("\nCalculated Metrics:");
console.log(`  CV:  $${healthyMetrics.cv.toLocaleString()} (Cost Variance)`);
console.log(`  SV:  $${healthyMetrics.sv.toLocaleString()} (Schedule Variance)`);
console.log(`  CPI: ${healthyMetrics.cpi.toFixed(4)} (Cost Performance Index)`);
console.log(`  SPI: ${healthyMetrics.spi.toFixed(4)} (Schedule Performance Index)`);
console.log(`  EAC: $${healthyMetrics.eac.toLocaleString()} (Estimate at Completion)`);
console.log(`  ETC: $${healthyMetrics.etc.toLocaleString()} (Estimate to Complete)`);
console.log(`  VAC: $${healthyMetrics.vac.toLocaleString()} (Variance at Completion)`);
console.log(`  TCPI: ${healthyMetrics.tcpi.toFixed(4)} (To-Complete Performance Index)`);

const healthyHealth = calculateHealthIndex(healthyMetrics);
console.log("\nHealth Assessment:");
console.log(`  Score: ${healthyHealth.score}/100`);
console.log(`  Status: ${healthyHealth.status.toUpperCase()}`);
console.log(`  Indicators:`);
healthyHealth.indicators.forEach(ind => console.log(`    - ${ind}`));

// Test Case 2: Troubled Project
console.log("\n\n📊 Test Case 2: Troubled Project (Over budget, behind schedule)");
console.log("-".repeat(60));
const troubledMetrics = calculateEVMMetrics(
  100000,  // PV: Planned Value
  80000,   // EV: Earned Value
  110000,  // AC: Actual Cost
  200000   // BAC: Budget at Completion
);

console.log("Base Values:");
console.log(`  PV:  $100,000`);
console.log(`  EV:   $80,000`);
console.log(`  AC:  $110,000`);
console.log(`  BAC: $200,000`);
console.log("\nCalculated Metrics:");
console.log(`  CV:  $${troubledMetrics.cv.toLocaleString()} (Cost Variance)`);
console.log(`  SV:  $${troubledMetrics.sv.toLocaleString()} (Schedule Variance)`);
console.log(`  CPI: ${troubledMetrics.cpi.toFixed(4)} (Cost Performance Index)`);
console.log(`  SPI: ${troubledMetrics.spi.toFixed(4)} (Schedule Performance Index)`);
console.log(`  EAC: $${troubledMetrics.eac.toLocaleString()} (Estimate at Completion)`);
console.log(`  ETC: $${troubledMetrics.etc.toLocaleString()} (Estimate to Complete)`);
console.log(`  VAC: $${troubledMetrics.vac.toLocaleString()} (Variance at Completion)`);
console.log(`  TCPI: ${troubledMetrics.tcpi.toFixed(4)} (To-Complete Performance Index)`);

const troubledHealth = calculateHealthIndex(troubledMetrics);
console.log("\nHealth Assessment:");
console.log(`  Score: ${troubledHealth.score}/100`);
console.log(`  Status: ${troubledHealth.status.toUpperCase()}`);
console.log(`  Indicators:`);
troubledHealth.indicators.forEach(ind => console.log(`    - ${ind}`));

// Test Case 3: On-Track Project
console.log("\n\n📊 Test Case 3: On-Track Project (Exactly on budget and schedule)");
console.log("-".repeat(60));
const onTrackMetrics = calculateEVMMetrics(
  100000,  // PV: Planned Value
  100000,  // EV: Earned Value
  100000,  // AC: Actual Cost
  200000   // BAC: Budget at Completion
);

console.log("Base Values:");
console.log(`  PV:  $100,000`);
console.log(`  EV:  $100,000`);
console.log(`  AC:  $100,000`);
console.log(`  BAC: $200,000`);
console.log("\nCalculated Metrics:");
console.log(`  CV:  $${onTrackMetrics.cv.toLocaleString()} (Cost Variance)`);
console.log(`  SV:  $${onTrackMetrics.sv.toLocaleString()} (Schedule Variance)`);
console.log(`  CPI: ${onTrackMetrics.cpi.toFixed(4)} (Cost Performance Index)`);
console.log(`  SPI: ${onTrackMetrics.spi.toFixed(4)} (Schedule Performance Index)`);
console.log(`  EAC: $${onTrackMetrics.eac.toLocaleString()} (Estimate at Completion)`);
console.log(`  ETC: $${onTrackMetrics.etc.toLocaleString()} (Estimate to Complete)`);
console.log(`  VAC: $${onTrackMetrics.vac.toLocaleString()} (Variance at Completion)`);
console.log(`  TCPI: ${onTrackMetrics.tcpi.toFixed(4)} (To-Complete Performance Index)`);

const onTrackHealth = calculateHealthIndex(onTrackMetrics);
console.log("\nHealth Assessment:");
console.log(`  Score: ${onTrackHealth.score}/100`);
console.log(`  Status: ${onTrackHealth.status.toUpperCase()}`);
console.log(`  Indicators:`);
onTrackHealth.indicators.forEach(ind => console.log(`    - ${ind}`));

console.log("\n" + "=".repeat(60));
console.log("✅ All EVM calculations completed successfully!");
console.log("=".repeat(60));
