'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, RotateCcw, Eye, EyeOff, Shield, Mail, MessageSquare, Brain, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'mock', label: 'Mock (Development)' },
  { value: 'disabled', label: 'Disabled' },
]

const AI_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o1', label: 'O1' },
    { value: 'o1-mini', label: 'O1 Mini' },
    { value: 'custom', label: 'Custom (use base URL)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma2 9B' },
    { value: 'custom', label: 'Custom (use base URL)' },
  ],
}

const AI_API_KEY_PLACEHOLDER: Record<string, string> = {
  openai: 'sk-...',
  groq: 'gsk_...',
  mock: '',
  disabled: '',
}

interface Setting {
  key: string
  value: string | null
  category: string
  description: string
  is_secret: boolean
}

interface Providers {
  ai: Record<string, string | null>
  email: Record<string, string | null>
  whatsapp: Record<string, string | null>
}

const SMTP_PRESETS: Record<string, { host: string; port: string; secure: string; hint: string }> = {
  gmail: { host: 'smtp.gmail.com', port: '587', secure: 'false', hint: 'Use Google App Password, not your regular password' },
  mailtrap: { host: 'live.smtp.mailtrap.io', port: '587', secure: 'false', hint: 'Get credentials from Mailtrap dashboard' },
  ses: { host: 'email-smtp.${region}.amazonaws.com', port: '587', secure: 'false', hint: 'Replace ${region} with your AWS region' },
  sendgrid: { host: 'smtp.sendgrid.net', port: '587', secure: 'false', hint: 'Use "apikey" as username and your API key as password' },
  custom: { host: '', port: '', secure: 'false', hint: '' },
}

function EmailProviderSection({
  formValues,
  setFormValues,
  providers,
  showSecrets,
  setShowSecrets,
}: {
  formValues: Record<string, string>
  setFormValues: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  providers?: Providers
  showSecrets: Record<string, boolean>
  setShowSecrets: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
}) {
  const selectedProvider = formValues.EMAIL_PROVIDER ?? providers?.email?.EMAIL_PROVIDER ?? 'smtp'
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const handleTestSend = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setTestResult({ success: false, message: 'Masukkan alamat email yang valid' })
      return
    }
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult({ success: true, message: 'Test email sent successfully! Check your inbox.' })
      } else {
        // Extract specific error from Brevo/API response if available
        const errorMsg = data.error?.includes('Brevo API error')
          ? data.error.replace('Brevo API error: ', '').split('\n')[0]
          : (data.error ?? 'Failed to send test email')
        setTestResult({ success: false, message: errorMsg })
      }
    } catch {
      setTestResult({ success: false, message: 'Network error — check your connection' })
    } finally {
      setTestSending(false)
    }
  }

  const applyPreset = (preset: string) => {
    const config = SMTP_PRESETS[preset]
    if (!config) return
    setFormValues((prev) => ({
      ...prev,
      SMTP_HOST: config.host,
      SMTP_PORT: config.port,
      SMTP_SECURE: config.secure,
    }))
  }

  const getValue = (key: string) => formValues[key] ?? providers?.email?.[key] ?? ''

  return (
    <div className="space-y-4">
      {/* Provider Dropdown */}
      <div>
        <Label htmlFor="EMAIL_PROVIDER">Email Provider</Label>
        <Select
          value={selectedProvider}
          onValueChange={(v) => {
            setFormValues((prev) => ({ ...prev, EMAIL_PROVIDER: v }))
            if (v !== 'smtp') return
            // Auto-select Gmail preset when SMTP is chosen
            applyPreset('gmail')
          }}
        >
          <SelectTrigger id="EMAIL_PROVIDER">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="brevo">Brevo (HTTP API)</SelectItem>
            <SelectItem value="smtp">SMTP (Gmail, Mailtrap, SES, Custom)</SelectItem>
            <SelectItem value="mock">Mock (Development Only)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Provider changes take effect immediately — no server restart needed
        </p>
      </div>

      {selectedProvider === 'brevo' && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">Brevo Configuration</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="BREVO_API_KEY">API Key</Label>
                <Input
                  id="BREVO_API_KEY"
                  type={showSecrets['BREVO_API_KEY'] ? 'text' : 'password'}
                  value={getValue('BREVO_API_KEY')}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, BREVO_API_KEY: e.target.value }))}
                  placeholder="xapikey-..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get from{' '}
                  <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="underline">
                    Brevo Settings → API Keys
                  </a>
                </p>
              </div>
              <div>
                <Label htmlFor="BREVO_SENDER_EMAIL">Sender Email</Label>
                <Input
                  id="BREVO_SENDER_EMAIL"
                  type="email"
                  value={getValue('BREVO_SENDER_EMAIL')}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, BREVO_SENDER_EMAIL: e.target.value }))}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {selectedProvider === 'smtp' && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">SMTP Configuration</p>

            {/* Preset Selector */}
            <div className="mb-4">
              <Label htmlFor="smtp-preset">Quick Preset</Label>
              <Select onValueChange={applyPreset} defaultValue="gmail">
                <SelectTrigger id="smtp-preset">
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="mailtrap">Mailtrap</SelectItem>
                  <SelectItem value="ses">AWS SES</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="custom">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="SMTP_HOST">SMTP Host</Label>
                <Input
                  id="SMTP_HOST"
                  value={getValue('SMTP_HOST')}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, SMTP_HOST: e.target.value }))}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="SMTP_PORT">Port</Label>
                  <Input
                    id="SMTP_PORT"
                    type="number"
                    value={getValue('SMTP_PORT')}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, SMTP_PORT: e.target.value }))}
                    placeholder="587"
                  />
                </div>
                <div>
                  <Label htmlFor="SMTP_SECURE">TLS Mode</Label>
                  <Select
                    value={getValue('SMTP_SECURE')}
                    onValueChange={(v) => setFormValues((prev) => ({ ...prev, SMTP_SECURE: v }))}
                  >
                    <SelectTrigger id="SMTP_SECURE">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">STARTTLS (587)</SelectItem>
                      <SelectItem value="true">SSL/TLS (465)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="SMTP_USER">Username</Label>
                <Input
                  id="SMTP_USER"
                  value={getValue('SMTP_USER')}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, SMTP_USER: e.target.value }))}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="SMTP_PASS">Password / App Password</Label>
                <div className="relative">
                  <Input
                    id="SMTP_PASS"
                    type={showSecrets['SMTP_PASS'] ? 'text' : 'password'}
                    value={getValue('SMTP_PASS')}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, SMTP_PASS: e.target.value }))}
                    placeholder="your-app-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets((prev) => ({ ...prev, SMTP_PASS: !prev['SMTP_PASS'] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets['SMTP_PASS'] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {SMTP_PRESETS[selectedProvider === 'smtp' ? 'gmail' : 'gmail']?.hint && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {SMTP_PRESETS.gmail.hint}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="SENDER_EMAIL">Sender Email (From address)</Label>
                <Input
                  id="SENDER_EMAIL"
                  type="email"
                  value={getValue('SENDER_EMAIL')}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, SENDER_EMAIL: e.target.value }))}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {selectedProvider === 'mock' && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Mock mode — emails are stored in memory and not sent. Use for development/testing only.
          </p>
        </div>
      )}

      {/* Test Send Button */}
      {selectedProvider !== 'mock' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div>
              <Label htmlFor="test-email-input">Email Tujuan Uji</Label>
              <Input
                id="test-email-input"
                type="email"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value)
                  setTestResult(null)
                }}
                placeholder="admin@yourdomain.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleTestSend()
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestSend}
              disabled={testSending || !testEmail}
              className="w-full"
            >
              {testSending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Mengirim email uji...
                </>
              ) : (
                <>
                  <Mail size={16} className="mr-2" />
                  Test Send — Kirim Email Uji
                </>
              )}
            </Button>
            {testResult && (
              <div
                className={cn(
                  'rounded-lg p-3 text-sm',
                  testResult.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                )}
              >
                {testResult.message}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Masukkan email Anda dan klik tombol untuk menguji konfigurasi email
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('ai')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const { data: providers, isLoading } = useQuery<Providers>({
    queryKey: ['settings', 'providers'],
    queryFn: () => fetch('/api/settings/providers').then((r) => r.json()),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (settings: Record<string, string | null>) => {
      const res = await fetch('/api/settings/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, category: activeTab }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'providers'] })
      toast.success('Pengaturan berhasil disimpan')
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  })

  const handleSave = () => {
    saveMutation.mutate(formValues)
  }

  const handleReset = () => {
    setFormValues({})
    toast.info('Form direset')
  }

  const updateField = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getDisplayValue = (key: string, actualValue: string | null | undefined): string => {
    if (formValues[key] !== undefined) return formValues[key]
    if (actualValue && actualValue.startsWith('•••')) return '••••••••'
    return actualValue ?? ''
  }

  const isValueStored = (key: string, actualValue: string | null | undefined): boolean => {
    return !!actualValue && !actualValue.startsWith('•••')
  }

  const hasChanges = Object.keys(formValues).length > 0

  const renderField = (
    key: string,
    label: string,
    placeholder: string,
    isSecret: boolean = false,
    type: string = 'text',
  ) => {
    const actualValue = providers?.[activeTab as keyof Providers]?.[key] ?? null
    const displayValue = getDisplayValue(key, actualValue)
    const isMasked = isSecret && actualValue?.startsWith('•••')

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="relative flex-1">
          <Input
            type={isSecret && !showSecrets[key] ? 'password' : type}
            value={isSecret && showSecrets[key] ? (formValues[key] ?? '') : displayValue}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            className="pr-10"
          />
          {isSecret && (
            <button
              type="button"
              onClick={() => toggleSecret(key)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecrets[key] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {isMasked && !showSecrets[key] && (
          <p className="text-xs text-muted-foreground">
            ✓ Tersimpan. Klik <Eye size={12} className="inline" /> untuk melihat.
          </p>
        )}
        {isMasked && showSecrets[key] && (
          <p className="text-xs text-muted-foreground">
            Nilai disembunyikan demi keamanan. Ketik nilai baru untuk mengubah.
          </p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Layanan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi layanan eksternal seperti AI, email, dan WhatsApp.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw size={16} className="mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>Menyimpan...</>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setFormValues({}) }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai" className="gap-2">
            <Brain size={16} />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail size={16} />
            Email Service
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare size={16} />
            WhatsApp Service
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield size={16} />
            Security
          </TabsTrigger>
        </TabsList>

        {/* AI Provider Tab */}
        <TabsContent value="ai" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={20} />
                Konfigurasi AI
              </CardTitle>
              <CardDescription>
                Atur provider AI untuk analisis event dan smart filter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">AI Provider</Label>
                  <p className="text-xs text-muted-foreground">
                    Aktifkan AI untuk analisis cerdas dan rekomendasi
                  </p>
                </div>
                <Switch
                  checked={getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? 'disabled') !== 'disabled'}
                  onCheckedChange={(checked) => {
                    updateField('AI_PROVIDER', checked ? 'openai' : 'disabled')
                  }}
                />
              </div>

              {/* Show config only when enabled */}
              {getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? 'disabled') !== 'disabled' && (
                <>
                  <Separator />

                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Provider</Label>
                    <Select
                      value={getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? 'disabled')}
                      onValueChange={(val) => updateField('AI_PROVIDER', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.filter(p => p.value !== 'disabled').map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model Selection */}
                  {['openai', 'groq'].includes(getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? '')) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Model</Label>
                      <Select
                        value={getDisplayValue('AI_MODEL', providers?.ai?.AI_MODEL ?? '')}
                        onValueChange={(val) => updateField('AI_MODEL', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih model" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const currentProvider = getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? '')
                            const models = AI_MODELS[currentProvider] ?? []
                            return models.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Custom Base URL */}
                  {['openai', 'groq'].includes(getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? '')) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Custom Base URL <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
                      <Input
                        type="url"
                        value={getDisplayValue('AI_BASE_URL', providers?.ai?.AI_BASE_URL ?? '')}
                        onChange={(e) => updateField('AI_BASE_URL', e.target.value)}
                        placeholder="https://api.openai.com/v1 atau https://api.groq.com/openai/v1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Kosongkan untuk menggunakan URL default provider.
                      </p>
                    </div>
                  )}

                  {/* API Key */}
                  {['openai', 'groq'].includes(getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? '')) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">API Key</Label>
                      <div className="relative">
                        <Input
                          type={showSecrets['AI_API_KEY'] ? 'text' : 'password'}
                          value={showSecrets['AI_API_KEY'] ? (formValues['AI_API_KEY'] ?? '') : getDisplayValue('AI_API_KEY', providers?.ai?.AI_API_KEY ?? '')}
                          onChange={(e) => updateField('AI_API_KEY', e.target.value)}
                          placeholder={AI_API_KEY_PLACEHOLDER[getDisplayValue('AI_PROVIDER', providers?.ai?.AI_PROVIDER ?? '')] || 'Masukkan API key'}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret('AI_API_KEY')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets['AI_API_KEY'] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {!showSecrets['AI_API_KEY'] && providers?.ai?.AI_API_KEY?.startsWith('•••') && (
                        <p className="text-xs text-muted-foreground">
                          ✓ API Key tersimpan. Klik <Eye size={12} className="inline" /> untuk melihat.
                        </p>
                      )}
                      {showSecrets['AI_API_KEY'] && providers?.ai?.AI_API_KEY?.startsWith('•••') && (
                        <p className="text-xs text-muted-foreground">
                          Nilai disembunyikan demi keamanan. Ketik nilai baru untuk mengubah.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Service Tab */}
        <TabsContent value="email" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail size={20} />
                Konfigurasi Email
              </CardTitle>
              <CardDescription>
                Pilih dan konfigurasi layanan pengiriman email. Perubahan langsung berlaku tanpa restart server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmailProviderSection
                formValues={formValues}
                setFormValues={setFormValues}
                providers={providers}
                showSecrets={showSecrets}
                setShowSecrets={setShowSecrets}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Service Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={20} />
                Konfigurasi WhatsApp
              </CardTitle>
              <CardDescription>
                Atur layanan pengiriman WhatsApp untuk blast undangan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">WhatsApp Provider</Label>
                  <p className="text-xs text-muted-foreground">
                    Aktifkan WhatsApp untuk pengiriman blast undangan
                  </p>
                </div>
                <Switch
                  checked={getDisplayValue('WHATSAPP_PROVIDER', providers?.whatsapp?.WHATSAPP_PROVIDER ?? 'mock') !== 'mock'}
                  onCheckedChange={(checked) => {
                    updateField('WHATSAPP_PROVIDER', checked ? 'everpro' : 'mock')
                  }}
                />
              </div>

              {/* Show config only when enabled */}
              {getDisplayValue('WHATSAPP_PROVIDER', providers?.whatsapp?.WHATSAPP_PROVIDER ?? 'mock') !== 'mock' && (
                <>
                  <Separator />

                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Provider</Label>
                    <Select
                      value={getDisplayValue('WHATSAPP_PROVIDER', providers?.whatsapp?.WHATSAPP_PROVIDER ?? 'mock')}
                      onValueChange={(val) => updateField('WHATSAPP_PROVIDER', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everpro">Everpro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets['EVERPRO_API_KEY'] ? 'text' : 'password'}
                        value={showSecrets['EVERPRO_API_KEY'] ? (formValues['EVERPRO_API_KEY'] ?? '') : getDisplayValue('EVERPRO_API_KEY', providers?.whatsapp?.EVERPRO_API_KEY ?? '')}
                        onChange={(e) => updateField('EVERPRO_API_KEY', e.target.value)}
                        placeholder="your-key..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret('EVERPRO_API_KEY')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets['EVERPRO_API_KEY'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {!showSecrets['EVERPRO_API_KEY'] && providers?.whatsapp?.EVERPRO_API_KEY?.startsWith('•••') && (
                      <p className="text-xs text-muted-foreground">
                        ✓ API Key tersimpan. Klik <Eye size={12} className="inline" /> untuk melihat.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Keamanan & Rate Limit
              </CardTitle>
              <CardDescription>
                Atur batasan permintaan dan proteksi API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rate Limit Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Rate Limit</Label>
                  <p className="text-xs text-muted-foreground">
                    Batasi jumlah permintaan API untuk mencegah penyalahgunaan
                  </p>
                </div>
                <Switch
                  checked={getDisplayValue('RATE_LIMIT_ENABLED', providers?.ai?.RATE_LIMIT_ENABLED ?? 'true') === 'true'}
                  onCheckedChange={(checked) => {
                    updateField('RATE_LIMIT_ENABLED', checked ? 'true' : 'false')
                  }}
                />
              </div>

              <Separator />

              {/* Rate Limit Configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Maksimum Permintaan</Label>
                  <Input
                    type="number"
                    value={getDisplayValue('RATE_LIMIT_MAX', providers?.ai?.RATE_LIMIT_MAX ?? '100')}
                    onChange={(e) => updateField('RATE_LIMIT_MAX', e.target.value)}
                    placeholder="100"
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Jumlah maksimum permintaan per jendela waktu
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jendela Waktu</Label>
                  <Select
                    value={getDisplayValue('RATE_LIMIT_WINDOW', providers?.ai?.RATE_LIMIT_WINDOW ?? '1 minute')}
                    onValueChange={(val) => updateField('RATE_LIMIT_WINDOW', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jendela waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 seconds">30 Detik</SelectItem>
                      <SelectItem value="1 minute">1 Menit</SelectItem>
                      <SelectItem value="5 minutes">5 Menit</SelectItem>
                      <SelectItem value="15 minutes">15 Menit</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Periode waktu untuk menghitung batasan permintaan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
