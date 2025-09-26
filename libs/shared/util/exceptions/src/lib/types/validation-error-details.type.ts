export type ValidationErrorDetails = {
  property: string;
  constraints: {
    [type: string]: string;
  };
};
