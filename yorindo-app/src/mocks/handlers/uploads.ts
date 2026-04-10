import { http, HttpResponse, delay } from 'msw'

// Mock uploaded files for the gallery
const mockUploadedFiles = [
  {
    filename: 'tech-summit-2024.jpg',
    url: '/api/uploads/tech-summit-2024.jpg',
    size: 245000,
    uploadedAt: '2024-01-15T10:30:00.000Z',
  },
  {
    filename: 'business-conference.png',
    url: '/api/uploads/business-conference.png',
    size: 312000,
    uploadedAt: '2024-01-20T14:15:00.000Z',
  },
  {
    filename: 'workshop-series.webp',
    url: '/api/uploads/workshop-series.webp',
    size: 189000,
    uploadedAt: '2024-02-01T09:00:00.000Z',
  },
]

export const uploadHandlers = [
  // GET /api/uploads — list uploaded images
  http.get('/api/uploads', async () => {
    await delay(300)
    return HttpResponse.json({ files: mockUploadedFiles })
  }),

  http.post('/api/uploads/image', async ({ request }) => {
    // Simulate upload delay
    await delay(1000)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return HttpResponse.json(
        { 
          error: { 
            code: 'NO_FILE', 
            message: 'Tidak ada file yang diupload', 
            details: [] 
          } 
        },
        { status: 400 }
      )
    }

    // Mock successful upload by returning a random Unsplash image
    // In a real app, this would return the bucket/storage URL
    const mockImageUrls = [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop',
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=675&fit=crop',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=675&fit=crop',
    ]
    const randomUrl = mockImageUrls[Math.floor(Math.random() * mockImageUrls.length)]

    return HttpResponse.json({
      url: randomUrl,
      filename: file.name,
      size: file.size,
    })
  }),
]
