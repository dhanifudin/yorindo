import { faker } from '@faker-js/faker'

export function makeMockCuid2(): string {
  return `c${faker.string.alphanumeric({ length: 23, casing: 'lower' })}`
}
