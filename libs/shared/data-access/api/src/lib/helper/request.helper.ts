export function toFormData(data: Record<string, any>) {
  const form = new FormData();

  for (const [key, value] of Object.entries(data)) {
    form.append(key, value === undefined ? 'undefined' : String(value));
  }

  return form;
}

export function toUrlEncoded(data: Record<string, any>) {
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
