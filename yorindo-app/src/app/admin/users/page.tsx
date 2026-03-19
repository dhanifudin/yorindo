'use client'

import { useState } from 'react'
import { useUsers, useUpdateUserRole, useDeleteUser } from '@/hooks/useUsers'
import { useAuthStore } from '@/store/authStore'
import { UserCreateForm } from '@/components/features/users/UserCreateForm'
import { EventAssignmentDialog } from '@/components/features/users/EventAssignmentDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { User } from '@/types/api'

const ROLE_BADGE: Record<User['role'], string> = {
  admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-green-100 text-green-700',
  viewer: 'bg-muted text-muted-foreground',
}

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)
  const [assignUser, setAssignUser] = useState<User | null>(null)
  const { data: users, isLoading } = useUsers()
  const { mutate: updateRole } = useUpdateUserRole()
  const { mutate: deleteUser } = useDeleteUser()
  const currentUser = useAuthStore((s) => s.user)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manajemen Akun</h1>
        <Button onClick={() => setShowForm(true)}>+ Akun Baru</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Buat Akun Baru</h2>
            <UserCreateForm
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {assignUser && (
        <EventAssignmentDialog
          user={assignUser}
          open={!!assignUser}
          onClose={() => setAssignUser(null)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            updateRole({ id: user.id, role: value as User['role'] })
                          }
                          disabled={isSelf}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs" disabled={isSelf}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge className={ROLE_BADGE[user.role]}>{user.role}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(user.role === 'staff' || user.role === 'viewer') && !isSelf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignUser(user)}
                          >
                            Assign Event
                          </Button>
                        )}
                        {!isSelf ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Nonaktifkan akun ${user.name}?`)) {
                                deleteUser(user.id)
                              }
                            }}
                          >
                            Nonaktifkan
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Akun Anda</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
