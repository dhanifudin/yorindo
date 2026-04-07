import { describe, it, expectTypeOf } from 'vitest'
import type {
  Contact,
  Event,
  Registration,
  User,
  ScanResult,
  YoriMindResult,
  ApiError,
  PaginatedResponse,
  Industry,
  JobTitle,
  LoginBody,
  CreateEventBody,
  UpdateRegistrationStatusBody,
  ScanVerifyBody,
  CreateRegistrationBody,
  CreateUserBody,
} from '@/types/api'

describe('API type definitions', () => {
  it('Contact has required fields', () => {
    const contact: Contact = {
      id: '123',
      name: 'Test',
      phone: '+62123',
      email: 'test@test.com',
      serviceType: 'teknologi',
      jobTitle: 'manajer',
      city: 'Jakarta',
      company: 'PT Test',
      department: 'Engineering',
      completenessScore: 0.9,
      consentStatus: 'active',
      flagCategory: null,
      eventDate: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expectTypeOf(contact).toMatchTypeOf<Contact>()
  })

  it('Event status is correct union type', () => {
    const status: Event['status'] = 'published'
    expectTypeOf(status).toMatchTypeOf<'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'>()
  })

  it('Registration status has all required values', () => {
    const status: Registration['status'] = 'approved'
    expectTypeOf(status).toMatchTypeOf<'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled'>()
  })

  it('User role has correct values', () => {
    const role: User['role'] = 'admin'
    expectTypeOf(role).toMatchTypeOf<'admin' | 'staff' | 'viewer'>()
  })

  it('ScanResult status has correct values', () => {
    const status: ScanResult['status'] = 'success'
    expectTypeOf(status).toMatchTypeOf<'success' | 'already_attended' | 'invalid'>()
  })

  it('YoriMindResult has correct structure', () => {
    const result: YoriMindResult = {
      analysis: 'text',
      root_causes: ['cause1'],
      recommendations: [{ action: 'act', impact: 'imp', priority: 'high' }],
      summary: 'sum',
      tracked_metrics: ['metric1'],
    }
    expectTypeOf(result).toMatchTypeOf<YoriMindResult>()
  })

  it('ApiError has error.code, message, details', () => {
    const err: ApiError = {
      error: { code: 'NOT_FOUND', message: 'Not found', details: [] },
    }
    expectTypeOf(err).toMatchTypeOf<ApiError>()
  })

  it('PaginatedResponse is generic', () => {
    const response: PaginatedResponse<Contact> = {
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }
    expectTypeOf(response).toMatchTypeOf<PaginatedResponse<Contact>>()
  })

  it('Mutation body types are exportable', () => {
    expectTypeOf<LoginBody>().toHaveProperty('email')
    expectTypeOf<CreateEventBody>().toHaveProperty('name')
    expectTypeOf<UpdateRegistrationStatusBody>().toHaveProperty('status')
    expectTypeOf<ScanVerifyBody>().toHaveProperty('token')
    expectTypeOf<CreateRegistrationBody>().toHaveProperty('eventId')
    expectTypeOf<CreateUserBody>().toHaveProperty('role')
    expectTypeOf<Industry>().toHaveProperty('slug')
    expectTypeOf<JobTitle>().toHaveProperty('slug')
  })
})
