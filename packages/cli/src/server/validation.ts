import type {Request} from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates the render request body for both callback and non-callback modes.
 */
export function validateRenderRequest(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const body = req.body;

  // Body must be an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: [{field: 'body', message: 'Request body must be a JSON object'}],
    };
  }

  const {callbackUrl, variables, settings, streamProgress} = body;

  // Validate callbackUrl if provided
  if (callbackUrl !== undefined) {
    if (typeof callbackUrl !== 'string') {
      errors.push({
        field: 'callbackUrl',
        message: 'callbackUrl must be a string',
      });
    } else if (!isValidUrl(callbackUrl)) {
      errors.push({
        field: 'callbackUrl',
        message: 'callbackUrl must be a valid URL',
      });
    }
  }

  // Validate variables if provided
  if (variables !== undefined) {
    if (typeof variables !== 'object' || variables === null) {
      errors.push({
        field: 'variables',
        message: 'variables must be an object',
      });
    }
  }

  // Validate streamProgress if provided
  if (streamProgress !== undefined && typeof streamProgress !== 'boolean') {
    errors.push({
      field: 'streamProgress',
      message: 'streamProgress must be a boolean',
    });
  }

  // Validate settings if provided
  if (settings !== undefined) {
    const settingsErrors = validateSettings(settings);
    errors.push(...settingsErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the settings object for render requests.
 */
function validateSettings(settings: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof settings !== 'object' || settings === null) {
    errors.push({
      field: 'settings',
      message: 'settings must be an object',
    });
    return errors;
  }

  const s = settings as Record<string, unknown>;

  // Validate outFile if provided
  if (s.outFile !== undefined) {
    if (typeof s.outFile !== 'string') {
      errors.push({
        field: 'settings.outFile',
        message: 'outFile must be a string',
      });
    } else if (!isValidOutFile(s.outFile)) {
      errors.push({
        field: 'settings.outFile',
        message: 'outFile must end with .mp4, .webm, or .mov',
      });
    }
  }

  // Validate outDir if provided
  if (s.outDir !== undefined && typeof s.outDir !== 'string') {
    errors.push({
      field: 'settings.outDir',
      message: 'outDir must be a string',
    });
  }

  // Validate workers if provided
  if (s.workers !== undefined) {
    if (typeof s.workers !== 'number' || !Number.isInteger(s.workers)) {
      errors.push({
        field: 'settings.workers',
        message: 'workers must be an integer',
      });
    } else if (s.workers < 1 || s.workers > 32) {
      errors.push({
        field: 'settings.workers',
        message: 'workers must be between 1 and 32',
      });
    }
  }

  // Validate logProgress if provided
  if (s.logProgress !== undefined && typeof s.logProgress !== 'boolean') {
    errors.push({
      field: 'settings.logProgress',
      message: 'logProgress must be a boolean',
    });
  }

  // Validate viteBasePort if provided
  if (s.viteBasePort !== undefined) {
    if (
      typeof s.viteBasePort !== 'number' ||
      !Number.isInteger(s.viteBasePort)
    ) {
      errors.push({
        field: 'settings.viteBasePort',
        message: 'viteBasePort must be an integer',
      });
    } else if (s.viteBasePort < 1 || s.viteBasePort > 65535) {
      errors.push({
        field: 'settings.viteBasePort',
        message: 'viteBasePort must be a valid port number (1-65535)',
      });
    }
  }

  // Validate projectSettings if provided
  if (s.projectSettings !== undefined) {
    const projectSettingsErrors = validateProjectSettings(s.projectSettings);
    errors.push(...projectSettingsErrors);
  }

  return errors;
}

/**
 * Validates the projectSettings object.
 */
function validateProjectSettings(projectSettings: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof projectSettings !== 'object' || projectSettings === null) {
    errors.push({
      field: 'settings.projectSettings',
      message: 'projectSettings must be an object',
    });
    return errors;
  }

  const ps = projectSettings as Record<string, unknown>;

  // Validate exporter if provided
  if (ps.exporter !== undefined) {
    if (typeof ps.exporter !== 'object' || ps.exporter === null) {
      errors.push({
        field: 'settings.projectSettings.exporter',
        message: 'exporter must be an object',
      });
    } else {
      const exporter = ps.exporter as Record<string, unknown>;

      // Validate exporter name
      if (exporter.name !== undefined) {
        const validExporters = [
          '@revideo/core/wasm',
          '@revideo/core/ffmpeg',
          '@revideo/core/image-sequence',
        ];
        if (
          typeof exporter.name !== 'string' ||
          !validExporters.includes(exporter.name)
        ) {
          errors.push({
            field: 'settings.projectSettings.exporter.name',
            message: `exporter.name must be one of: ${validExporters.join(', ')}`,
          });
        }
      }

      // Validate exporter options if provided
      if (exporter.options !== undefined) {
        if (typeof exporter.options !== 'object' || exporter.options === null) {
          errors.push({
            field: 'settings.projectSettings.exporter.options',
            message: 'exporter.options must be an object',
          });
        } else {
          const options = exporter.options as Record<string, unknown>;

          // Validate format if provided
          if (options.format !== undefined) {
            const validFormats = ['mp4', 'webm', 'proRes'];
            if (
              typeof options.format !== 'string' ||
              !validFormats.includes(options.format)
            ) {
              errors.push({
                field: 'settings.projectSettings.exporter.options.format',
                message: `format must be one of: ${validFormats.join(', ')}`,
              });
            }
          }
        }
      }
    }
  }

  // Validate background if provided
  if (ps.background !== undefined && typeof ps.background !== 'string') {
    errors.push({
      field: 'settings.projectSettings.background',
      message: 'background must be a string (color value)',
    });
  }

  // Validate size if provided
  if (ps.size !== undefined) {
    if (typeof ps.size !== 'object' || ps.size === null) {
      errors.push({
        field: 'settings.projectSettings.size',
        message: 'size must be an object with x and y properties',
      });
    } else {
      const size = ps.size as Record<string, unknown>;
      if (typeof size.x !== 'number' || size.x <= 0) {
        errors.push({
          field: 'settings.projectSettings.size.x',
          message: 'size.x must be a positive number',
        });
      }
      if (typeof size.y !== 'number' || size.y <= 0) {
        errors.push({
          field: 'settings.projectSettings.size.y',
          message: 'size.y must be a positive number',
        });
      }
    }
  }

  // Validate range if provided
  if (ps.range !== undefined) {
    if (!Array.isArray(ps.range) || ps.range.length !== 2) {
      errors.push({
        field: 'settings.projectSettings.range',
        message: 'range must be an array of two numbers [start, end]',
      });
    } else {
      const [start, end] = ps.range;
      if (typeof start !== 'number' || start < 0) {
        errors.push({
          field: 'settings.projectSettings.range[0]',
          message: 'range start must be a non-negative number',
        });
      }
      if (typeof end !== 'number') {
        errors.push({
          field: 'settings.projectSettings.range[1]',
          message: 'range end must be a number',
        });
      } else if (isFinite(end) && typeof start === 'number' && end < start) {
        errors.push({
          field: 'settings.projectSettings.range',
          message: 'range end must be greater than or equal to start',
        });
      }
    }
  }

  return errors;
}

/**
 * Validates if a string is a valid URL.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates if the output file has a valid extension.
 */
function isValidOutFile(outFile: string): boolean {
  return (
    outFile.endsWith('.mp4') ||
    outFile.endsWith('.webm') ||
    outFile.endsWith('.mov')
  );
}
