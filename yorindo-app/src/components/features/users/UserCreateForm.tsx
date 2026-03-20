'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUser } from '@/hooks/useUsers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['admin', 'staff', 'viewer']),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

type FormValues = z.infer<typeof schema>

interface UserCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function UserCreateForm({ onSuccess, onCancel }: UserCreateFormProps) {
  const { mutate, isPending, isError } = useCreateUser()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'viewer' },
  })

  const onSubmit = (values: FormValues) => {
    mutate(values, { onSuccess })
  }

  const selectClassName =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="user-name">
            Nama <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-name"
            type="text"
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="user-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-email"
            type="email"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="user-role">Role</Label>
          <select id="user-role" {...register('role')} className={selectClassName}>
            <option value="admin">Admin</option>
            <option value="staff">Staff (Check-in only)</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="user-password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-password"
            type="password"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>
      </div>

      {isError && <p className="text-sm text-destructive">Gagal membuat akun. Silakan coba lagi.</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Buat Akun'}
        </Button>
      </div>
    </form>
  )
}
