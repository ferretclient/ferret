// Name/filename helpers are the single shared implementation in @ferret-app/common.
// Re-exported here so existing `utils/common/regex` import paths keep working.
export { sanitizeName, validateName, validateNameError } from '@ferret-app/common/utils';

export const variableNameRegex = /^[\w-.]*$/;

// HTTP header name should not contain spaces, newlines, or control characters
export const headerNameRegex = /^[^\s\r\n]*$/;

// HTTP header value should not contain newlines
export const headerValueRegex = /^[^\r\n]*$/;
