import Ajv, { ValidateFunction } from 'ajv';

const ajv = new Ajv({ strict: false, allErrors: true });

/**
 * Validate data against a JSON schema
 */
export function validateSchema<T = any>(
  data: any,
  schema: object
): { valid: boolean; errors: string[] | null; data: T | null } {
  const validate: ValidateFunction = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const errors = validate.errors.map((err: any) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    });
    return { valid: false, errors, data: null };
  }

  return { valid: true, errors: null, data: data as T };
}

/**
 * Validate strategy pack against schema
 */
export async function validateStrategyPack(data: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  // Load schema from file system
  const { readFile } = await import('fs/promises');
  const { resolve } = await import('path');
  
  const schemaPath = resolve(process.cwd(), '../../packages/schemas/strategy-pack.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  return validateSchema(data, schema);
}

/**
 * Validate KB files against schema
 */
export async function validateKBFiles(data: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  // Load schema from file system
  const { readFile } = await import('fs/promises');
  const { resolve } = await import('path');
  
  const schemaPath = resolve(process.cwd(), '../../packages/schemas/kb-files.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  return validateSchema(data, schema);
}

/**
 * Validate research foundation pack against schema
 */
export async function validateResearchFoundation(data: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  // Load schema from file system
  const { readFile } = await import('fs/promises');
  const { resolve } = await import('path');
  
  const schemaPath = resolve(process.cwd(), '../../packages/schemas/research-foundation.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  return validateSchema(data, schema);
}

/**
 * Generic schema validator with custom schema path
 */
export async function validateWithSchemaFile(
  data: any,
  schemaPath: string
): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  const { readFile } = await import('fs/promises');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  return validateSchema(data, schema);
}
