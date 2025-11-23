"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Upload, CheckCircle2, Camera, Loader2 } from "lucide-react"
import { API_URL } from "@/lib/api"

export default function MobileUploadPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const handleUpload = async () => {
    if (!file || !sessionId) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${API_URL}/uploads/session/${sessionId}`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        alert("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed. Please check your connection.")
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
          <CardContent className="pt-6 space-y-4">
            <div className="mx-auto bg-green-100 dark:bg-green-900/50 w-16 h-16 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300">Upload Successful!</h2>
            <p className="text-green-700 dark:text-green-400">
              Your document has been sent to the desktop. You can close this tab now.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Upload Document</CardTitle>
          <CardDescription>
            Take a photo or select an image to send to your desktop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 hover:bg-muted/50 transition-colors relative overflow-hidden min-h-[250px]">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-black/5" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-12 w-12 mb-2" />
                <p className="font-medium">Tap to Take Photo</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="text-center text-sm font-medium truncate px-4">
              Selected: {file.name}
            </div>
          )}

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleUpload} 
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" /> Send to Desktop
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
