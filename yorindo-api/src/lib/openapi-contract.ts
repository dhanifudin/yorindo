import AjvImport from 'ajv'
import addFormatsImport from 'ajv-formats'
import { loadOpenApiDocument } from './openapi.js'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type OpenApiSchema = Record<string, unknown>

const Ajv = AjvImport.default ?? AjvImport
const addFormats = addFormatsImport.default ?? addFormatsImport

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const validatorCache = new Map<string, ReturnType<typeof ajv.compile>>()

function getDocument() {
  return loadOpenApiDocument()
}

function resolveRef(ref: string): OpenApiSchema {
  const document = getDocument() as { components?: { schemas?: Record<string, OpenApiSchema> } }
  const name = ref.split('/').at(-1)
  const schema = name ? document.components?.schemas?.[name] : undefined
  if (!schema) {
    throw new Error(`OpenAPI schema ref not found: ${ref}`)
  }
  return normalizeSchema(schema)
}

function normalizeSchema(schema: OpenApiSchema): OpenApiSchema {
  if ('$ref' in schema && typeof schema.$ref === 'string') {
    return resolveRef(schema.$ref)
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce<OpenApiSchema>((acc, part) => mergeSchemas(acc, normalizeSchema(part as OpenApiSchema)), {})
  }

  const next: OpenApiSchema = { ...schema }

  if (next.nullable === true) {
    const currentType = next.type
    if (typeof currentType === 'string') {
      next.type = [currentType, 'null']
    } else if (Array.isArray(currentType) && !currentType.includes('null')) {
      next.type = [...currentType, 'null']
    }
    delete next.nullable
  }

  if (next.properties && typeof next.properties === 'object') {
    next.properties = Object.fromEntries(
      Object.entries(next.properties).map(([key, value]) => [key, normalizeSchema(value as OpenApiSchema)]),
    )
  }

  if (next.items && typeof next.items === 'object') {
    next.items = normalizeSchema(next.items as OpenApiSchema)
  }

  return next
}

function mergeSchemas(left: OpenApiSchema, right: OpenApiSchema): OpenApiSchema {
  const merged: OpenApiSchema = { ...left, ...right }

  if (left.properties || right.properties) {
    merged.properties = {
      ...(left.properties as Record<string, unknown> | undefined),
      ...(right.properties as Record<string, unknown> | undefined),
    }
  }

  if (left.required || right.required) {
    merged.required = Array.from(
      new Set([...(left.required as string[] | undefined ?? []), ...(right.required as string[] | undefined ?? [])]),
    )
  }

  return merged
}

function getOperation(path: string, method: HttpMethod) {
  const document = getDocument() as { paths?: Record<string, Record<string, OpenApiSchema>> }
  const operation = document.paths?.[path]?.[method]
  if (!operation) {
    throw new Error(`OpenAPI operation not found: ${method.toUpperCase()} ${path}`)
  }
  return operation
}

function getCompiledValidator(key: string, schema: OpenApiSchema) {
  let validator = validatorCache.get(key)
  if (!validator) {
    validator = ajv.compile(normalizeSchema(schema))
    validatorCache.set(key, validator)
  }
  return validator
}

function validateSchema(key: string, schema: OpenApiSchema, payload: unknown) {
  const validator = getCompiledValidator(key, schema)
  const valid = validator(payload)
  if (!valid) {
    throw new Error(`OpenAPI contract validation failed for ${key}: ${ajv.errorsText(validator.errors)}`)
  }
}

export function validateOpenApiRequest(options: {
  path: string
  method: HttpMethod
  body?: unknown
  query?: unknown
  params?: unknown
}) {
  const operation = getOperation(options.path, options.method)

  if (options.body !== undefined) {
    const bodySchema = (
      operation.requestBody as { content?: Record<string, { schema?: OpenApiSchema }> } | undefined
    )?.content?.['application/json']?.schema
    if (bodySchema) {
      validateSchema(`request body ${options.method.toUpperCase()} ${options.path}`, bodySchema, options.body)
    }
  }

  if (options.query !== undefined && Array.isArray(operation.parameters)) {
    const queryProperties: Record<string, unknown> = {}
    const required: string[] = []

    for (const rawParam of operation.parameters as OpenApiSchema[]) {
      const param = '$ref' in rawParam && typeof rawParam.$ref === 'string'
        ? resolveParameterRef(rawParam.$ref)
        : rawParam
      if (param.in === 'query' && typeof param.name === 'string' && param.schema) {
        queryProperties[param.name] = normalizeSchema(param.schema as OpenApiSchema)
        if (param.required === true) required.push(param.name)
      }
    }

    if (Object.keys(queryProperties).length > 0) {
      validateSchema(`request query ${options.method.toUpperCase()} ${options.path}`, {
        type: 'object',
        properties: queryProperties,
        required,
        additionalProperties: true,
      }, options.query)
    }
  }

  if (options.params !== undefined && Array.isArray(operation.parameters)) {
    const paramProperties: Record<string, unknown> = {}
    const required: string[] = []

    for (const rawParam of operation.parameters as OpenApiSchema[]) {
      const param = '$ref' in rawParam && typeof rawParam.$ref === 'string'
        ? resolveParameterRef(rawParam.$ref)
        : rawParam
      if (param.in === 'path' && typeof param.name === 'string' && param.schema) {
        paramProperties[param.name] = normalizeSchema(param.schema as OpenApiSchema)
        required.push(param.name)
      }
    }

    if (Object.keys(paramProperties).length > 0) {
      validateSchema(`request params ${options.method.toUpperCase()} ${options.path}`, {
        type: 'object',
        properties: paramProperties,
        required,
        additionalProperties: true,
      }, options.params)
    }
  }
}

function resolveParameterRef(ref: string): OpenApiSchema {
  const document = getDocument() as { components?: { parameters?: Record<string, OpenApiSchema> } }
  const name = ref.split('/').at(-1)
  const parameter = name ? document.components?.parameters?.[name] : undefined
  if (!parameter) {
    throw new Error(`OpenAPI parameter ref not found: ${ref}`)
  }
  return parameter
}

export function validateOpenApiResponse(options: {
  path: string
  method: HttpMethod
  status: number
  body: unknown
}) {
  const operation = getOperation(options.path, options.method)
  const response = (operation.responses as Record<string, OpenApiSchema> | undefined)?.[String(options.status)] as
    | { content?: Record<string, { schema?: OpenApiSchema }> }
    | undefined
  const schema = response?.content?.['application/json']?.schema
  if (!schema) return
  validateSchema(`response ${options.status} ${options.method.toUpperCase()} ${options.path}`, schema, options.body)
}
