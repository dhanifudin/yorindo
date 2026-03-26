import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Vendor, CreateVendorBody, PaginatedResponse } from '@/types/api'

async function fetchVendors(): Promise<PaginatedResponse<Vendor>> {
  const res = await fetch('/api/vendors?pageSize=20')
  if (!res.ok) throw new Error('Failed to fetch vendors')
  return res.json()
}

async function createVendor(body: CreateVendorBody): Promise<Vendor> {
  const res = await fetch('/api/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create vendor')
  return res.json()
}

async function updateVendor(id: string, body: Partial<CreateVendorBody>): Promise<Vendor> {
  const res = await fetch(`/api/vendors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update vendor')
  return res.json()
}

async function deleteVendor(id: string): Promise<void> {
  const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' })
  if (res.status === 409) {
    const body = await res.json()
    throw new Error(body?.error?.message ?? 'Vendor masih terhubung ke event')
  }
  if (!res.ok) throw new Error('Failed to delete vendor')
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useUpdateVendor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateVendorBody>) => updateVendor(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}
