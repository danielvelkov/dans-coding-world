export type ValidationErrorDetails = {
  field: string;
  constraints: {
    [type: string]: string;
  };
  children?: ValidationErrorDetails[];
};
