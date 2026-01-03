import type {Request} from 'express';
import {describe, expect, test} from 'vitest';
import {validateRenderRequest} from './validation';

// Helper to create a mock request
function mockRequest(body: unknown): Request {
  return {body} as Request;
}

describe('validateRenderRequest', () => {
  describe('body validation', () => {
    test('accepts empty body', () => {
      const result = validateRenderRequest(mockRequest({}));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects null body', () => {
      const result = validateRenderRequest(mockRequest(null));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('body');
    });

    test('rejects non-object body', () => {
      const result = validateRenderRequest(mockRequest('not an object'));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('body');
    });
  });

  describe('callbackUrl validation', () => {
    test('accepts valid http URL', () => {
      const result = validateRenderRequest(
        mockRequest({callbackUrl: 'http://example.com/callback'}),
      );
      expect(result.valid).toBe(true);
    });

    test('accepts valid https URL', () => {
      const result = validateRenderRequest(
        mockRequest({callbackUrl: 'https://example.com/callback'}),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects non-string callbackUrl', () => {
      const result = validateRenderRequest(mockRequest({callbackUrl: 123}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('callbackUrl');
      expect(result.errors[0].message).toContain('must be a string');
    });

    test('rejects invalid URL', () => {
      const result = validateRenderRequest(
        mockRequest({callbackUrl: 'not-a-valid-url'}),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('callbackUrl');
      expect(result.errors[0].message).toContain('must be a valid URL');
    });

    test('rejects non-http URLs', () => {
      const result = validateRenderRequest(
        mockRequest({callbackUrl: 'ftp://example.com'}),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('callbackUrl');
    });
  });

  describe('variables validation', () => {
    test('accepts object variables', () => {
      const result = validateRenderRequest(
        mockRequest({variables: {key: 'value', num: 42}}),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects non-object variables', () => {
      const result = validateRenderRequest(mockRequest({variables: 'string'}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('variables');
    });

    test('rejects null variables', () => {
      const result = validateRenderRequest(mockRequest({variables: null}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('variables');
    });
  });

  describe('streamProgress validation', () => {
    test('accepts boolean streamProgress', () => {
      const result = validateRenderRequest(mockRequest({streamProgress: true}));
      expect(result.valid).toBe(true);
    });

    test('rejects non-boolean streamProgress', () => {
      const result = validateRenderRequest(
        mockRequest({streamProgress: 'yes'}),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('streamProgress');
    });
  });

  describe('settings validation', () => {
    test('accepts valid settings object', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            outFile: 'output.mp4',
            outDir: './output',
            workers: 4,
          },
        }),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects non-object settings', () => {
      const result = validateRenderRequest(mockRequest({settings: 'invalid'}));
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('settings');
    });

    describe('outFile validation', () => {
      test('accepts .mp4 extension', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {outFile: 'video.mp4'}}),
        );
        expect(result.valid).toBe(true);
      });

      test('accepts .webm extension', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {outFile: 'video.webm'}}),
        );
        expect(result.valid).toBe(true);
      });

      test('accepts .mov extension', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {outFile: 'video.mov'}}),
        );
        expect(result.valid).toBe(true);
      });

      test('rejects invalid extension', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {outFile: 'video.avi'}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.outFile');
      });
    });

    describe('workers validation', () => {
      test('accepts valid worker count', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {workers: 8}}),
        );
        expect(result.valid).toBe(true);
      });

      test('rejects non-integer workers', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {workers: 2.5}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.workers');
      });

      test('rejects workers less than 1', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {workers: 0}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.workers');
      });

      test('rejects workers greater than 32', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {workers: 100}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.workers');
      });
    });

    describe('viteBasePort validation', () => {
      test('accepts valid port', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {viteBasePort: 9000}}),
        );
        expect(result.valid).toBe(true);
      });

      test('rejects port below 1', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {viteBasePort: 0}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.viteBasePort');
      });

      test('rejects port above 65535', () => {
        const result = validateRenderRequest(
          mockRequest({settings: {viteBasePort: 70000}}),
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('settings.viteBasePort');
      });
    });
  });

  describe('projectSettings validation', () => {
    test('accepts valid exporter settings', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              exporter: {
                name: '@revideo/core/wasm',
              },
            },
          },
        }),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects invalid exporter name', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              exporter: {
                name: 'invalid-exporter',
              },
            },
          },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe(
        'settings.projectSettings.exporter.name',
      );
    });

    test('accepts valid size', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              size: {x: 1920, y: 1080},
            },
          },
        }),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects invalid size', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              size: {x: -100, y: 1080},
            },
          },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('settings.projectSettings.size.x');
    });

    test('accepts valid range', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              range: [0, 10],
            },
          },
        }),
      );
      expect(result.valid).toBe(true);
    });

    test('accepts Infinity as range end', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              range: [0, Infinity],
            },
          },
        }),
      );
      expect(result.valid).toBe(true);
    });

    test('rejects range with end < start', () => {
      const result = validateRenderRequest(
        mockRequest({
          settings: {
            projectSettings: {
              range: [10, 5],
            },
          },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('settings.projectSettings.range');
    });
  });

  describe('multiple errors', () => {
    test('collects multiple validation errors', () => {
      const result = validateRenderRequest(
        mockRequest({
          callbackUrl: 123,
          variables: null,
          streamProgress: 'yes',
          settings: {
            outFile: 'video.avi',
            workers: 100,
          },
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});
