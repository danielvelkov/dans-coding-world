export interface ValidationRules {
  passwordMinLength: number;
  passwordMaxLength: number;
  emailMinLength: number;
  emailMaxLength: number;
}

export class ValidationConfiguration {
  constructor(public rules: ValidationRules) {}
}
