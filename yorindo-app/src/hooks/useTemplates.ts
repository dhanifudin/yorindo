import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Template {
  id: string
  name: string
  type: 'invitation' | 'confirmation' | 'rejection' | 'cancellation'
  channel: 'email' | 'whatsapp'
  body: string
  createdAt: string
}

export type CreateTemplateBody = Omit<Template, 'id' | 'createdAt'>
export type UpdateTemplateBody = Partial<CreateTemplateBody>

async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch('/api/templates')
  if (!res.ok) throw new Error('Failed to fetch templates')
  return res.json()
}

async function createTemplate(body: CreateTemplateBody): Promise<Template> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create template')
  return res.json()
}

async function updateTemplate({ id, ...body }: UpdateTemplateBody & { id: string }): Promise<Template> {
  const res = await fetch(`/api/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update template')
  return res.json()
}

async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete template')
}

export function useTemplates() {
  return useQuery({ queryKey: ['templates'], queryFn: fetchTemplates })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })
}
