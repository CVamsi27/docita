/**
 * Re-export with backward-compatible `ApiValidationError` alias. The canonical
 * class is `APIRequestError` in `@workspace/data-access`. Existing call sites
 * using `instanceof ApiValidationError` and `err.fieldErrors` continue to work
 * via the alias and the `fieldErrors` getter declared on APIRequestError below.
 */
import { APIRequestError, parseApiErrorResponse } from "@workspace/data-access";

export { APIRequestError, parseApiErrorResponse };
export const ApiValidationError = APIRequestError;
