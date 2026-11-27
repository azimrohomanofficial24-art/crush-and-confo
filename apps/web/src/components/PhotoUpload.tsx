import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { Avatar } from './ui'
import type { User } from '../lib/types'

/** Real profile-photo upload: the file goes to the Worker, which stores it
 *  in R2 and returns its URL. No stock or demo photos are ever used. */
export function PhotoUpload({ user, onUploaded }: { user: User; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await api.uploadAvatar(file)
      setPreview(null)
      onUploaded(url)
    } catch (e: any) {
      setError(e?.message || 'Photo upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar user={preview ? { ...user, avatarUrl: preview } : user} size={72} className="ring-4 ring-white shadow-soft" />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          aria-label="Choose a profile photo"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              setPreview(URL.createObjectURL(f))
              void onFile(f)
            }
            e.target.value = ''
          }}
        />
        <button type="button" className="btn-ghost !min-h-[40px] !px-4 !py-2 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-pink" />}
          {uploading ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Upload your photo'}
        </button>
        <p className="mt-1.5 text-xs text-muted">JPG, PNG, WebP or GIF, up to 5 MB. Your photo is shown on your profile and in Discover.</p>
        {error && <p className="mt-1 text-xs text-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
