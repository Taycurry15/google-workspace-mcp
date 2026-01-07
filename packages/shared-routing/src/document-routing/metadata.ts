/**
 * Document Metadata Extraction
 *
 * Utilities for extracting metadata from documents
 */

import type { DocumentMetadata, ExtractedEntity } from "./types.js";

/**
 * Extract metadata from document content
 */
export function extractMetadata(content: string, filename: string): DocumentMetadata {
  const metadata: DocumentMetadata = {
    title: filename,
    keywords: [],
    entities: [],
  };

  // Extract IDs using regex patterns
  const patterns = {
    programId: /PROG-\d{3}/g,
    deliverableId: /D-\d{3}/g,
    contractId: /CONT-\d{3}/g,
    vendorId: /VEND-\d{3}/g,
    milestoneId: /M-\d{3}/g,
    riskId: /R-\d{3}/g,
    changeId: /CR-\d{3}/g,
  };

  // Extract program ID
  const programMatches = content.match(patterns.programId);
  if (programMatches && programMatches.length > 0) {
    metadata.programId = programMatches[0];
    metadata.entities?.push({
      type: "program",
      value: programMatches[0],
      confidence: 0.95,
    });
  }

  // Extract deliverable ID
  const deliverableMatches = content.match(patterns.deliverableId);
  if (deliverableMatches && deliverableMatches.length > 0) {
    metadata.deliverableId = deliverableMatches[0];
    metadata.entities?.push({
      type: "deliverable",
      value: deliverableMatches[0],
      confidence: 0.95,
    });
  }

  // Extract contract ID
  const contractMatches = content.match(patterns.contractId);
  if (contractMatches && contractMatches.length > 0) {
    metadata.contractId = contractMatches[0];
    metadata.entities?.push({
      type: "contract",
      value: contractMatches[0],
      confidence: 0.95,
    });
  }

  // Extract vendor ID
  const vendorMatches = content.match(patterns.vendorId);
  if (vendorMatches && vendorMatches.length > 0) {
    metadata.vendorId = vendorMatches[0];
    metadata.entities?.push({
      type: "vendor",
      value: vendorMatches[0],
      confidence: 0.95,
    });
  }

  // Extract milestone ID
  const milestoneMatches = content.match(patterns.milestoneId);
  if (milestoneMatches && milestoneMatches.length > 0) {
    metadata.milestoneId = milestoneMatches[0];
    metadata.entities?.push({
      type: "milestone",
      value: milestoneMatches[0],
      confidence: 0.95,
    });
  }

  // Extract dates (basic ISO format)
  const datePattern = /\d{4}-\d{2}-\d{2}/g;
  const dateMatches = content.match(datePattern);
  if (dateMatches && dateMatches.length > 0) {
    metadata.documentDate = new Date(dateMatches[0]);
    metadata.entities?.push({
      type: "date",
      value: dateMatches[0],
      confidence: 0.9,
    });
  }

  // Extract email addresses as potential authors
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
  const emailMatches = content.match(emailPattern);
  if (emailMatches && emailMatches.length > 0) {
    metadata.author = emailMatches[0];
  }

  // Extract dollar amounts
  const amountPattern = /\$[\d,]+(?:\.\d{2})?/g;
  const amountMatches = content.match(amountPattern);
  if (amountMatches) {
    for (const amount of amountMatches.slice(0, 5)) {
      // Limit to first 5
      metadata.entities?.push({
        type: "amount",
        value: amount,
        confidence: 0.8,
      });
    }
  }

  // Extract common keywords (simple frequency-based)
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4); // Words longer than 4 characters

  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Get top 10 keywords
  metadata.keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return metadata;
}

/**
 * Merge metadata from multiple sources
 */
export function mergeMetadata(
  ...metadatas: Partial<DocumentMetadata>[]
): DocumentMetadata {
  const merged: DocumentMetadata = {
    keywords: [],
    entities: [],
  };

  for (const metadata of metadatas) {
    if (metadata.programId) merged.programId = metadata.programId;
    if (metadata.projectId) merged.projectId = metadata.projectId;
    if (metadata.deliverableId) merged.deliverableId = metadata.deliverableId;
    if (metadata.contractId) merged.contractId = metadata.contractId;
    if (metadata.vendorId) merged.vendorId = metadata.vendorId;
    if (metadata.milestoneId) merged.milestoneId = metadata.milestoneId;
    if (metadata.riskId) merged.riskId = metadata.riskId;
    if (metadata.changeId) merged.changeId = metadata.changeId;
    if (metadata.documentDate) merged.documentDate = metadata.documentDate;
    if (metadata.author) merged.author = metadata.author;
    if (metadata.title) merged.title = metadata.title;

    if (metadata.keywords) {
      merged.keywords = [...(merged.keywords || []), ...metadata.keywords];
    }

    if (metadata.entities) {
      merged.entities = [...(merged.entities || []), ...metadata.entities];
    }
  }

  // Deduplicate keywords
  merged.keywords = [...new Set(merged.keywords)];

  // Deduplicate entities by value
  const uniqueEntities = new Map<string, ExtractedEntity>();
  for (const entity of merged.entities || []) {
    if (!uniqueEntities.has(entity.value)) {
      uniqueEntities.set(entity.value, entity);
    }
  }
  merged.entities = Array.from(uniqueEntities.values());

  return merged;
}

/**
 * Validate metadata completeness
 */
export function validateMetadata(metadata: DocumentMetadata): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // Check for critical fields
  if (!metadata.programId) {
    missingFields.push("programId");
  }

  if (!metadata.title) {
    missingFields.push("title");
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
