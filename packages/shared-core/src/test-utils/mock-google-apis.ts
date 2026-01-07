/**
 * Mock Google APIs for Unit Testing
 *
 * Provides mock implementations of Google Sheets and Drive APIs
 * for unit testing without making actual API calls.
 */

import type { sheets_v4, drive_v3 } from 'googleapis';

/**
 * Mock Google Sheets API client
 */
export function createMockSheetsClient(): sheets_v4.Sheets {
  const mockData = new Map<string, any[][]>();

  return {
    spreadsheets: {
      values: {
        get: jest.fn(async (params: any) => {
          const key = `${params.spreadsheetId}:${params.range}`;
          return {
            data: {
              values: mockData.get(key) || [],
              range: params.range,
            },
          };
        }),

        update: jest.fn(async (params: any) => {
          const key = `${params.spreadsheetId}:${params.range}`;
          mockData.set(key, params.requestBody.values);
          return {
            data: {
              updatedCells: params.requestBody.values.flat().length,
              updatedRange: params.range,
            },
          };
        }),

        append: jest.fn(async (params: any) => {
          const key = `${params.spreadsheetId}:${params.range}`;
          const existing = mockData.get(key) || [];
          mockData.set(key, [...existing, ...params.requestBody.values]);
          return {
            data: {
              updates: {
                updatedCells: params.requestBody.values.flat().length,
              },
            },
          };
        }),

        batchGet: jest.fn(async (params: any) => {
          return {
            data: {
              valueRanges: params.ranges.map((range: string) => ({
                range,
                values: mockData.get(`${params.spreadsheetId}:${range}`) || [],
              })),
            },
          };
        }),

        batchUpdate: jest.fn(async (params: any) => {
          params.requestBody.data.forEach((item: any) => {
            const key = `${params.spreadsheetId}:${item.range}`;
            mockData.set(key, item.values);
          });
          return {
            data: {
              totalUpdatedCells: params.requestBody.data
                .flatMap((item: any) => item.values)
                .flat().length,
            },
          };
        }),
      },

      get: jest.fn(async (params: any) => {
        return {
          data: {
            spreadsheetId: params.spreadsheetId,
            properties: {
              title: 'Mock Spreadsheet',
            },
            sheets: [
              {
                properties: {
                  sheetId: 0,
                  title: 'Sheet1',
                },
              },
            ],
          },
        };
      }),
    },
  } as any;
}

/**
 * Mock Google Drive API client
 */
export function createMockDriveClient(): drive_v3.Drive {
  const mockFiles = new Map<string, any>();

  return {
    files: {
      get: jest.fn(async (params: any) => {
        const file = mockFiles.get(params.fileId) || {
          id: params.fileId,
          name: 'Mock File',
          mimeType: 'application/vnd.google-apps.document',
        };
        return { data: file };
      }),

      list: jest.fn(async (params: any) => {
        return {
          data: {
            files: Array.from(mockFiles.values()).filter((file: any) => {
              if (params.q) {
                // Simple mock query matching
                return params.q.includes(file.name) || params.q.includes(file.mimeType);
              }
              return true;
            }),
          },
        };
      }),

      create: jest.fn(async (params: any) => {
        const fileId = `file_${Date.now()}`;
        const file = {
          id: fileId,
          name: params.requestBody.name,
          mimeType: params.requestBody.mimeType || 'application/octet-stream',
          parents: params.requestBody.parents || [],
        };
        mockFiles.set(fileId, file);
        return { data: file };
      }),

      update: jest.fn(async (params: any) => {
        const file = mockFiles.get(params.fileId);
        if (file) {
          Object.assign(file, params.requestBody);
          mockFiles.set(params.fileId, file);
        }
        return { data: file };
      }),

      delete: jest.fn(async (params: any) => {
        mockFiles.delete(params.fileId);
        return { data: {} };
      }),
    },

    permissions: {
      create: jest.fn(async (params: any) => {
        return {
          data: {
            id: `permission_${Date.now()}`,
            type: params.requestBody.type,
            role: params.requestBody.role,
          },
        };
      }),
    },
  } as any;
}

/**
 * Set mock data for Sheets client
 */
export function setMockSheetData(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  data: any[][]
): void {
  // This is a helper that would work with the mock implementation above
  // In real usage, you'd interact with the client normally
}

/**
 * Get mock data from Sheets client
 */
export function getMockSheetData(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): any[][] {
  // This is a helper that would work with the mock implementation above
  return [];
}

/**
 * Clear all mock data
 */
export function clearMockData(): void {
  jest.clearAllMocks();
}
