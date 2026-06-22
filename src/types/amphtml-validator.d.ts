declare module 'amphtml-validator' {
  interface ValidationError {
    line: number;
    col: number;
    message: string;
    specUrl?: string | null;
    severity: 'ERROR' | 'WARNING';
  }

  interface ValidationResult {
    status: 'PASS' | 'FAIL';
    errors: ValidationError[];
  }

  interface Validator {
    validateString(input: string): ValidationResult;
  }

  const amphtmlValidator: {
    getInstance(): Promise<Validator>;
  };

  export default amphtmlValidator;
}
