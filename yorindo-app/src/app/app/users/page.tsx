'use client'

import { useState } from 'react'
import { useUsers, useUpdateUserRole, useDeleteUser } from '@/hooks/useUsers'
import { useAuthStore } from '@/store/authStore'
import { UserCreateForm } from '@/components/features/users/UserCreateForm'
import { EventAssignmentDialog } from '@/components/features/users/EventAssignmentDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  const [detailUser, setDetailUser] = useState<User | null>(null)
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

      {/* User detail sheet (mobile) */}
      <Sheet open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
        <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailUser?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div><span className="text-muted-foreground">Email: </span>{detailUser?.email}</div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              {detailUser && <Badge className={ROLE_BADGE[detailUser.role]}>{detailUser.role}</Badge>}
            </div>
            <div>
              <span className="text-muted-foreground">Dibuat: </span>
              {detailUser && new Date(detailUser.createdAt).toLocaleDateString('id-ID')}
            </div>
          </div>
          {detailUser && currentUser?.id !== detailUser.id && (
            <div className="flex gap-2 mt-6 flex-wrap">
              {(detailUser.role === 'staff' || detailUser.role === 'viewer') && (
                <Button size="sm" variant="outline" onClick={() => { setAssignUser(detailUser); setDetailUser(null) }}>
                  Assign Event
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Nonaktifkan akun ${detailUser.name}?`)) {
                    deleteUser(detailUser.id)
                    setDetailUser(null)
                  }
                }}
              >
                Nonaktifkan
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <TableRow key={user.id} className="cursor-pointer" onClick={() => setDetailUser(user)}>
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>{user.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground" onClick={(e) => e.stopPropagation()}>{user.email}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell className="hidden md:table-cell text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
