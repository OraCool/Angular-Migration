/**
 * Response Builder Utility
 * Standardizes creation of tool responses per MCP spec
 * Eliminates duplication of response object creation
 */

import { StandardToolResponse, StandardErrorResponse } from '../types.js';

/**
 * Parameters for error response
 */
export interface ErrorResponseParams {
  code: string;
  message: string;
  details: string;
  nextAction: string;
  rollbackAvailable?: boolean;
  instructionRef?: string | null;
}

/**
 * Parameters for success response
 */
export interface SuccessResponseParams {
  data: unknown;
  nextAction: string;
  instructionRef?: string | null;
  userAction?: string | null;
  automated?: boolean;
}

/**
 * Parameters for warning response
 */
export interface WarningResponseParams {
  data: unknown;
  nextAction: string;
  instructionRef?: string | null;
  userAction?: string | null;
  automated?: boolean;
}

/**
 * Builder class for standardized MCP tool responses
 * Ensures consistency and reduces code duplication
 */
export class ResponseBuilder {
  /**
   * Create a standardized error response
   *
   * @example
   * ```typescript
   * return ResponseBuilder.error({
   *   code: 'PACKAGE_JSON_NOT_FOUND',
   *   message: 'package.json not found in project directory',
   *   details: `Path checked: ${packageJsonPath}`,
   *   nextAction: 'Verify projectPath points to valid Angular project root',
   *   instructionRef: 'guide://prerequisites',
   * });
   * ```
   */
  static error(params: ErrorResponseParams): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code: params.code,
        message: params.message,
        details: params.details,
      },
      nextAction: params.nextAction,
      rollbackAvailable: params.rollbackAvailable ?? false,
      instructionRef: params.instructionRef ?? null,
    };
  }

  /**
   * Create a standardized success response
   *
   * @example
   * ```typescript
   * return ResponseBuilder.success({
   *   data: { version: '18.0.0', compatible: true },
   *   nextAction: 'Run prerequisites check to validate environment',
   *   instructionRef: 'guide://prerequisites',
   *   automated: true,
   * });
   * ```
   */
  static success(params: SuccessResponseParams): StandardToolResponse {
    return {
      status: 'success',
      data: params.data,
      nextAction: params.nextAction,
      instructionRef: params.instructionRef ?? null,
      userAction: params.userAction ?? null,
      automated: params.automated ?? true,
    };
  }

  /**
   * Create a standardized warning response
   *
   * @example
   * ```typescript
   * return ResponseBuilder.warning({
   *   data: { issues: [...], canProceed: true },
   *   nextAction: 'Review warnings before proceeding',
   *   instructionRef: 'guide://troubleshooting',
   *   automated: false,
   * });
   * ```
   */
  static warning(params: WarningResponseParams): StandardToolResponse {
    return {
      status: 'warning',
      data: params.data,
      nextAction: params.nextAction,
      instructionRef: params.instructionRef ?? null,
      userAction: params.userAction ?? null,
      automated: params.automated ?? false,
    };
  }

  /**
   * Create a common error for file not found
   */
  static fileNotFoundError(filePath: string, fileType: string = 'file'): StandardErrorResponse {
    return this.error({
      code: 'FILE_NOT_FOUND',
      message: `${fileType} not found`,
      details: `Path checked: ${filePath}`,
      nextAction: `Verify ${fileType} exists at the specified path`,
      instructionRef: 'guide://troubleshooting',
    });
  }

  /**
   * Create a common error for unsupported version
   */
  static unsupportedVersionError(
    version: string,
    supportedVersions: string[]
  ): StandardErrorResponse {
    return this.error({
      code: 'UNSUPPORTED_VERSION',
      message: `Version ${version} is not supported`,
      details: `Supported versions: ${supportedVersions.join(', ')}`,
      nextAction: 'Use a supported version',
      instructionRef: 'guide://prerequisites',
    });
  }

  /**
   * Create a common error for operation failures
   */
  static operationFailedError(
    operation: string,
    errorDetails: string,
    instructionRef: string = 'guide://troubleshooting'
  ): StandardErrorResponse {
    return this.error({
      code: `${operation.toUpperCase().replace(/\s+/g, '_')}_FAILED`,
      message: `Failed to ${operation}`,
      details: errorDetails,
      nextAction: 'Review error details and try again',
      instructionRef,
    });
  }
}
