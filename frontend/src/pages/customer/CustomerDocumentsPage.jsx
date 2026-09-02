import { useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

const DOC_TYPES = [
  'KYC — Company Registration',
  'FICA — Proof of Address',
  'AML — Source of Funds Declaration',
]

export default function CustomerDocumentsPage() {
  const { tokens } = useAuth()
  const { data: documents, loading, error, refetch } = usePortalFetch(portalService.getMyKycDocuments)
  const [showUpload, setShowUpload] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (loading) return <LoadingState label="Loading your documents..." />
  if (error) return <ErrorState message={error} />

  const documentList = documents || []
  const needsRenewal = documentList.filter((d) => d.status === 'expiring' || d.status === 'non_compliant')

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!fileName.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await portalService.uploadKycDocument(tokens?.access?.token, {
        type: docType,
        fileName: fileName.trim(),
      })
      setFileName('')
      setShowUpload(false)
      refetch()
    } catch (err) {
      setSubmitError(err.message || 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="KYC, FICA & AML Documents"
        subtitle="Compliance documents on file, processing status, and renewal reminders."
        actions={
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
          >
            <Upload size={16} />
            Upload document
          </button>
        }
      />

      {needsRenewal.length > 0 ? (
        <Card tone="soft" className="mb-4 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-ink">
                {needsRenewal.length} document{needsRenewal.length > 1 ? 's' : ''} need{needsRenewal.length === 1 ? 's' : ''} attention
              </p>
              <p className="text-sm text-muted">
                {needsRenewal.map((d) => d.type).join(', ')} — please renew before the expiry date to stay compliant.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {showUpload ? (
        <Card className="mb-4 p-5">
          <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Document type</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">File name</span>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. company-coreg.pdf"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
          {submitError ? <p className="mt-2 text-sm font-semibold text-rose-600">{submitError}</p> : null}
        </Card>
      ) : null}

      {documentList.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No documents uploaded yet.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'type', label: 'Document' },
            { key: 'fileName', label: 'File' },
            { key: 'uploadedAt', label: 'Uploaded', render: (row) => row.uploadedAt?.slice(0, 10) },
            { key: 'expiresAt', label: 'Expires', render: (row) => (row.expiresAt ? row.expiresAt.slice(0, 10) : '—') },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
          rows={documentList}
        />
      )}
    </div>
  )
}
