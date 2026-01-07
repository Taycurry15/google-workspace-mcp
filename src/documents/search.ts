/**
 * Advanced Document Search
 *
 * Provides powerful search capabilities across document metadata.
 */

import type { sheets_v4 } from "googleapis";
import type {
  Document,
  DocumentSearchCriteria,
  DocumentSearchResult,
} from "../types/document.js";
import { searchDocuments } from "./metadata.js";

/**
 * Search documents with pagination and scoring
 */
export async function advancedSearch(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  criteria: DocumentSearchCriteria
): Promise<{
  results: DocumentSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchTimeMs: number;
}> {
  try {
    const startTime = Date.now();

    // Perform search
    const documents = await searchDocuments(sheets, spreadsheetId, criteria);

    // Calculate relevance scores
    const results: DocumentSearchResult[] = documents.map((doc) => ({
      document: doc,
      score: calculateRelevanceScore(doc, criteria),
      highlights: extractHighlights(doc, criteria.query),
    }));

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Pagination
    const page = criteria.offset
      ? Math.floor(criteria.offset / (criteria.limit || 10))
      : 0;
    const pageSize = criteria.limit || 10;
    const totalCount = results.length;
    const hasMore = criteria.offset
      ? criteria.offset + pageSize < totalCount
      : pageSize < totalCount;

    const searchTimeMs = Date.now() - startTime;

    return {
      results,
      totalCount,
      page,
      pageSize,
      hasMore,
      searchTimeMs,
    };
  } catch (error) {
    throw new Error(
      `Advanced search failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Calculate relevance score for a document
 */
function calculateRelevanceScore(
  doc: Document,
  criteria: DocumentSearchCriteria
): number {
  let score = 0;

  // Query match (highest weight)
  if (criteria.query) {
    const query = criteria.query.toLowerCase();
    const title = doc.title.toLowerCase();
    const category = doc.category?.toLowerCase() || "";

    if (title.includes(query)) score += 100;
    if (category && category.includes(query)) score += 50;

    // Tag matches
    for (const tag of doc.tags) {
      if (tag.toLowerCase().includes(query)) {
        score += 25;
      }
    }
  }

  // Exact type match
  if (
    criteria.documentType &&
    criteria.documentType.includes(doc.type)
  ) {
    score += 50;
  }

  // Exact status match
  if (criteria.status && criteria.status.includes(doc.status)) {
    score += 30;
  }

  // Recent documents score higher
  const daysSinceModified =
    (Date.now() - doc.modifiedDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceModified < 7) score += 20;
  else if (daysSinceModified < 30) score += 10;

  // High confidence categorization
  if (doc.categorization && doc.categorization.confidence > 0.8) {
    score += 15;
  }

  return score;
}

/**
 * Extract highlighted snippets from document
 */
function extractHighlights(doc: Document, query?: string): string[] {
  if (!query) return [];

  const highlights: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Check title
  if (doc.title.toLowerCase().includes(lowerQuery)) {
    highlights.push(`Title: ${doc.title}`);
  }

  // Check category
  if (doc.category && doc.category.toLowerCase().includes(lowerQuery)) {
    highlights.push(`Category: ${doc.category}`);
  }

  // Check tags
  for (const tag of doc.tags) {
    if (tag.toLowerCase().includes(lowerQuery)) {
      highlights.push(`Tag: ${tag}`);
    }
  }

  return highlights;
}

/**
 * Get search suggestions based on partial query
 */
export async function getSearchSuggestions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  partialQuery: string,
  limit: number = 5
): Promise<string[]> {
  try {
    // Search for documents matching partial query
    const criteria: DocumentSearchCriteria = {
      query: partialQuery,
      limit,
    };

    const documents = await searchDocuments(sheets, spreadsheetId, criteria);

    // Extract unique suggestions from titles and tags
    const suggestions = new Set<string>();

    for (const doc of documents) {
      // Add title if it matches
      if (
        doc.title.toLowerCase().includes(partialQuery.toLowerCase())
      ) {
        suggestions.add(doc.title);
      }

      // Add matching tags
      for (const tag of doc.tags) {
        if (
          tag.toLowerCase().includes(partialQuery.toLowerCase())
        ) {
          suggestions.add(tag);
        }
      }

      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    throw new Error(
      `Failed to get suggestions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Find similar documents based on tags and category
 */
export async function findSimilarDocuments(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string,
  limit: number = 5
): Promise<Document[]> {
  try {
    // First, get the reference document
    const allDocs = await searchDocuments(sheets, spreadsheetId, {});
    const refDoc = allDocs.find((d) => d.docId === docId);

    if (!refDoc) {
      return [];
    }

    // Calculate similarity scores
    const scored = allDocs
      .filter((d) => d.docId !== docId)
      .map((doc) => ({
        doc,
        score: calculateSimilarity(refDoc, doc),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.doc);
  } catch (error) {
    throw new Error(
      `Failed to find similar documents: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Calculate similarity between two documents
 */
function calculateSimilarity(doc1: Document, doc2: Document): number {
  let score = 0;

  // Same type
  if (doc1.type === doc2.type) score += 40;

  // Same category
  if (doc1.category === doc2.category) score += 30;

  // Same phase
  if (doc1.phase && doc2.phase && doc1.phase === doc2.phase) score += 20;

  // Shared tags
  const sharedTags = doc1.tags.filter((tag) => doc2.tags.includes(tag));
  score += sharedTags.length * 10;

  return score;
}
