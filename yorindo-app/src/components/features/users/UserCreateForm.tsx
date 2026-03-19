'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUser } from '@/hooks/useUsers'

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama <span className="text-red-500">*</span>
          </label>
          <input
            id="user-name"
            type="text"
            {...register('name')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="user-email"
            type="email"
            {...register('email')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="user-role"
            {...register('role')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff (Check-in only)</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
        </div>

        <div>
          <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="user-password"
            type="password"
            {...register('password')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
      </div>

      {isError && <p className="text-sm text-red-500">Gagal membuat akun. Silakan coba lagi.</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
          {isPending ? 'Menyimpan...' : 'Buat Akun'}
        </button>
      </div>
    </form>
  )
}
