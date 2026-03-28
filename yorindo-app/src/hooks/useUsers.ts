import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User, CreateUserBody, Event, PaginatedResponse } from '@/types/api'

async function fetchUsers(): Promise<PaginatedResponse<User>> {
  const res = await fetch('/api/users?page=1&pageSize=100')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

async function createUser(body: CreateUserBody): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create user')
  return res.json()
}

async function updateUserRole({ id, role }: { id: string; role: User['role'] }): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error('Failed to update user')
  return res.json()
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete user')
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export async function fetchUserAssignedEvents(userId: string): Promise<{ data: Event[] }> {
  const res = await fetch(`/api/users/${userId}/events`)
  if (!res.ok) throw new Error('Failed to fetch user events')
  return res.json()
}
