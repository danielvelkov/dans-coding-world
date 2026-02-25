export function toFormData(data: Record<string, any>) {
  const form = new FormData();

  for (const [key, value] of Object.entries(data)) {
    form.append(key, value === undefined ? 'undefined' : String(value));
  }

  return form;
}

/**
 * Transform data to URLSearchParams object for axios
 * @param data Form data
 * @link https://axios-http.com/docs/urlencoded
 */
export function toURLSearchParams(data: Record<string, any>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      params.append(key, 'undefined');
    } else if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    } else {
      params.append(key, value.toString());
    }
  }

  return params;
}
