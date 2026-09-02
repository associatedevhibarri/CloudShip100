import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  BadgeCheck,
  Car,
  ExternalLink,
  FileText,
  IdCard,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { driverService, getDocumentUrl } from '../../services/driverService'
import {
  validateDriverDocument,
  validateDriverProfileField,
  validateDriverProfileForm,
  hasValidationErrors,
  DRIVER_PROFILE_FIELDS,
} from '../../utils/driverProfileValidation'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FormField, formInputClass, SectionHeader } from '../../components/ui/FormField'
import { ProfileCompletenessBar } from '../../components/driver/ProfileCompletenessBar'

const EMPTY_FORM = {
  contactEmail: '',
  phone: '',
  address: '',
  nationalId: '',
  licenseClass: '',
  licenceExpiry: '',
  emergencyContact: '',
  emergencyPhone: '',
  restrictions: 'None',
}

function docStatusBadge(status) {
  if (status === 'Verified') return 'compliant'
  if (status === 'Expiring') return 'expiring'
  return 'pending'
}

function toForm(profile) {
  return {
    contactEmail: profile.contactEmail || profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    nationalId: profile.nationalId || '',
    licenseClass: profile.licenseClass || '',
    licenceExpiry: profile.licenceExpiry ? profile.licenceExpiry.slice(0, 10) : '',
    emergencyContact: profile.emergencyContact || '',
    emergencyPhone: profile.emergencyPhone || '',
    restrictions: profile.restrictions || 'None',
  }
}

function DocumentUploadCard({
  id,
  title,
  description,
  type,
  document,
  onUpload,
  onDelete,
  uploading,
  uploadError,
}) {
  const [localError, setLocalError] = useState('')

  const handleFile = (file) => {
    const validationError = validateDriverDocument(file)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError('')
    onUpload(type, file)
  }

  return (
    <Card id={id} className="flex h-full flex-col p-5">
      <SectionHeader icon={FileText} title={title} description={description} />

      <div
        className={`flex flex-1 flex-col rounded-2xl border-2 border-dashed px-4 py-5 transition ${
          document ? 'border-brand/25 bg-brand-light/20' : 'border-line bg-surface/50'
        }`}
      >
        {document ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{document.originalName}</p>
                <p className="mt-1 text-xs text-muted">
                  {(document.size / 1024).toFixed(0)} KB ·{' '}
                  {new Date(document.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={document.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={getDocumentUrl(document.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm ring-1 ring-line"
              >
                View
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                onClick={() => onDelete(document.id)}
                disabled={uploading}
              >
                <Trash2 size={12} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-line">
              <Upload size={20} className="text-brand" />
            </div>
            <p className="text-sm font-semibold text-ink">No document uploaded</p>
            <p className="mt-1 text-xs text-muted">JPG, PNG, WEBP, or PDF up to 5 MB</p>
          </div>
        )}

        <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50">
          <Upload size={14} />
          {uploading ? 'Uploading...' : document ? 'Replace file' : 'Choose file'}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </label>

        {localError || uploadError ? (
          <p className="mt-2 text-center text-xs font-semibold text-rose-600" role="alert">
            {localError || uploadError}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

export default function DriverProfilePage() {
  const { tokens } = useSelector((state) => state.auth)
  const token = tokens?.access?.token

  const fieldRefs = useRef({})
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const showNotice = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3500)
  }

  const loadProfile = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await driverService.getProfile(token)
      setProfile(data)
      setForm(toForm(data))
      setErrors({})
      setTouched({})
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const documentsByType = useMemo(() => {
    const map = {}
    profile?.documents?.forEach((doc) => {
      map[doc.type] = doc
    })
    return map
  }, [profile])

  const initials = useMemo(
    () =>
      profile?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2) || 'DR',
    [profile?.name],
  )

  const setFieldRef = (key) => (el) => {
    fieldRefs.current[key] = el
  }

  const scrollToField = (key) => {
    if (key.startsWith('docs-')) {
      document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const el = fieldRefs.current[key]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus?.()
    }
  }

  const handleMissingClick = (key) => {
    if (!key) return
    if (key.startsWith('document:')) {
      const docType = key.split(':')[1]
      scrollToField(`docs-${docType}`)
      return
    }
    scrollToField(key)
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateDriverProfileField(field, value) || undefined,
      }))
    }
  }

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({
      ...prev,
      [field]: validateDriverProfileField(field, form[field]) || undefined,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!token) return

    setError('')

    const validationErrors = validateDriverProfileForm(form)
    const cleaned = Object.fromEntries(
      Object.entries(validationErrors).filter(([, msg]) => Boolean(msg)),
    )

    setErrors(cleaned)
    setTouched(
      Object.keys(DRIVER_PROFILE_FIELDS).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    )

    if (hasValidationErrors(cleaned)) {
      const firstKey = Object.keys(cleaned)[0]
      scrollToField(firstKey)
      setError(cleaned[firstKey] || 'Please fix the highlighted fields before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        contactEmail: form.contactEmail.trim().toLowerCase(),
        licenceExpiry: form.licenceExpiry ? new Date(form.licenceExpiry).toISOString() : null,
      }
      const data = await driverService.updateProfile(token, payload)
      setProfile(data)
      setForm(toForm(data))
      setErrors({})
      showNotice('Profile saved successfully.')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (type, file) => {
    if (!token) return
    setUploading(true)
    setUploadError('')
    setError('')
    try {
      const data = await driverService.uploadDocument(token, file, type)
      setProfile(data)
      setForm(toForm(data))
      showNotice('Document uploaded successfully.')
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId) => {
    if (!token) return
    setUploading(true)
    setUploadError('')
    setError('')
    try {
      const data = await driverService.deleteDocument(token, documentId)
      setProfile(data)
      showNotice('Document removed.')
    } catch (err) {
      setError(err.message || 'Failed to remove document')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm font-semibold text-muted">Loading your profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-muted">{error || 'Driver profile not found.'}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-4 rounded-full bg-brand-gradient px-5 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
      </Card>
    )
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Profile & compliance"
        subtitle="Keep your identity, licence, and emergency details up to date."
        actions={
          <button
            type="button"
            onClick={loadProfile}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-brand/30"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <BadgeCheck size={18} />
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      <ProfileCompletenessBar
        completeness={profile.completeness}
        onMissingClick={handleMissingClick}
      />

      <Card className="mb-6 overflow-hidden p-0">
        <div className="bg-brand-soft-gradient px-6 py-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-brand shadow-md ring-1 ring-brand/10">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">{profile.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand shadow-sm ring-1 ring-brand/10">
                  {profile.employeeId || 'ID pending'}
                </span>
                <StatusBadge status={docStatusBadge(profile.idDocumentStatus)} />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm ring-1 ring-white">
              <Mail size={16} className="shrink-0 text-brand" />
              <span className="truncate font-semibold">{form.contactEmail || profile.email || 'Email not set'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm ring-1 ring-white">
              <Phone size={16} className="shrink-0 text-brand" />
              <span className="truncate font-semibold">{form.phone || 'Phone not set'}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSave} className="space-y-5" noValidate>
          <Card className="p-5 sm:p-6">
            <SectionHeader
              icon={User}
              title="Contact & identity"
              description="Used for dispatch contact and KYC verification."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="contactEmail"
                label={DRIVER_PROFILE_FIELDS.contactEmail.label}
                required
                error={touched.contactEmail ? errors.contactEmail : null}
                hint="Use a valid Gmail or work email"
                className="sm:col-span-2"
              >
                <input
                  ref={setFieldRef('contactEmail')}
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={form.contactEmail}
                  onChange={handleChange('contactEmail')}
                  onBlur={handleBlur('contactEmail')}
                  placeholder="name@gmail.com"
                  className={formInputClass(touched.contactEmail && errors.contactEmail)}
                  aria-invalid={Boolean(touched.contactEmail && errors.contactEmail)}
                />
              </FormField>

              <FormField
                id="phone"
                label={DRIVER_PROFILE_FIELDS.phone.label}
                required
                error={touched.phone ? errors.phone : null}
                hint="Include country code, e.g. +27"
                className="sm:col-span-1"
              >
                <input
                  ref={setFieldRef('phone')}
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  onBlur={handleBlur('phone')}
                  placeholder="+27 82 000 0000"
                  className={formInputClass(touched.phone && errors.phone)}
                  aria-invalid={Boolean(touched.phone && errors.phone)}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
              </FormField>

              <FormField
                id="nationalId"
                label={DRIVER_PROFILE_FIELDS.nationalId.label}
                required
                error={touched.nationalId ? errors.nationalId : null}
              >
                <input
                  ref={setFieldRef('nationalId')}
                  id="nationalId"
                  name="nationalId"
                  value={form.nationalId}
                  onChange={handleChange('nationalId')}
                  onBlur={handleBlur('nationalId')}
                  placeholder="SA-8800123456789"
                  className={formInputClass(touched.nationalId && errors.nationalId)}
                  aria-invalid={Boolean(touched.nationalId && errors.nationalId)}
                />
              </FormField>

              <FormField
                id="address"
                label={DRIVER_PROFILE_FIELDS.address.label}
                required
                error={touched.address ? errors.address : null}
                className="sm:col-span-2"
              >
                <input
                  ref={setFieldRef('address')}
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange('address')}
                  onBlur={handleBlur('address')}
                  placeholder="Street, city, postal code"
                  className={formInputClass(touched.address && errors.address)}
                  aria-invalid={Boolean(touched.address && errors.address)}
                />
              </FormField>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              icon={Car}
              title="Driving licence"
              description="Required before long-haul or cross-border assignments."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="licenseClass"
                label={DRIVER_PROFILE_FIELDS.licenseClass.label}
                required
                error={touched.licenseClass ? errors.licenseClass : null}
              >
                <input
                  ref={setFieldRef('licenseClass')}
                  id="licenseClass"
                  name="licenseClass"
                  value={form.licenseClass}
                  onChange={handleChange('licenseClass')}
                  onBlur={handleBlur('licenseClass')}
                  placeholder="C1 Professional"
                  className={formInputClass(touched.licenseClass && errors.licenseClass)}
                />
              </FormField>

              <FormField
                id="licenceExpiry"
                label={DRIVER_PROFILE_FIELDS.licenceExpiry.label}
                required
                error={touched.licenceExpiry ? errors.licenceExpiry : null}
              >
                <input
                  ref={setFieldRef('licenceExpiry')}
                  id="licenceExpiry"
                  name="licenceExpiry"
                  type="date"
                  value={form.licenceExpiry}
                  onChange={handleChange('licenceExpiry')}
                  onBlur={handleBlur('licenceExpiry')}
                  className={formInputClass(touched.licenceExpiry && errors.licenceExpiry)}
                />
              </FormField>

              <FormField
                id="restrictions"
                label={DRIVER_PROFILE_FIELDS.restrictions.label}
                hint="Leave as “None” if no restrictions apply"
                className="sm:col-span-2"
              >
                <input
                  id="restrictions"
                  name="restrictions"
                  value={form.restrictions}
                  onChange={handleChange('restrictions')}
                  placeholder="None"
                  className={formInputClass(false)}
                />
              </FormField>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              icon={Users}
              title="Emergency contact"
              description="Reachable contact if you are unavailable on route."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="emergencyContact"
                label={DRIVER_PROFILE_FIELDS.emergencyContact.label}
                required
                error={touched.emergencyContact ? errors.emergencyContact : null}
              >
                <input
                  ref={setFieldRef('emergencyContact')}
                  id="emergencyContact"
                  name="emergencyContact"
                  value={form.emergencyContact}
                  onChange={handleChange('emergencyContact')}
                  onBlur={handleBlur('emergencyContact')}
                  placeholder="Full name"
                  className={formInputClass(touched.emergencyContact && errors.emergencyContact)}
                />
              </FormField>

              <FormField
                id="emergencyPhone"
                label={DRIVER_PROFILE_FIELDS.emergencyPhone.label}
                required
                error={touched.emergencyPhone ? errors.emergencyPhone : null}
              >
                <input
                  ref={setFieldRef('emergencyPhone')}
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  value={form.emergencyPhone}
                  onChange={handleChange('emergencyPhone')}
                  onBlur={handleBlur('emergencyPhone')}
                  placeholder="+27 82 000 0001"
                  className={formInputClass(touched.emergencyPhone && errors.emergencyPhone)}
                />
              </FormField>
            </div>
          </Card>

          <div className="sticky bottom-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
            <p className="text-xs text-muted">
              Fields marked <span className="font-bold text-rose-500">*</span> are required for compliance.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand/20 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <IdCard size={18} className="text-brand" />
              <h3 className="text-base font-extrabold">Compliance documents</h3>
            </div>
            <div className="space-y-4">
              <DocumentUploadCard
                id="docs-national_id"
                title="National ID"
                description="Clear photo or scan of your government ID."
                type="national_id"
                document={documentsByType.national_id}
                onUpload={handleUpload}
                onDelete={handleDeleteDocument}
                uploading={uploading}
                uploadError={uploadError}
              />
              <DocumentUploadCard
                id="docs-driving_license"
                title="Driving licence"
                description="Front of licence showing class and expiry."
                type="driving_license"
                document={documentsByType.driving_license}
                onUpload={handleUpload}
                onDelete={handleDeleteDocument}
                uploading={uploading}
                uploadError={uploadError}
              />
            </div>
          </div>

          <Card className="border-brand/15 bg-brand-light/20 p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-brand-dark">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              Documents are encrypted at rest and reviewed by operations. Renewal reminders are sent
              before expiry.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
