import { http, HttpResponse, delay } from 'msw'

export const uploadHandlers = [
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
