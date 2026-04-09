import { http, HttpResponse } from 'msw'
import wilayahData from '@/data/wilayah-static.json'

export const locationHandlers = [
  http.get('/api/locations/cities', async () => {
    const cities = (wilayahData as Array<{
      provinceCode: string
      provinceName: string
      cityCode: string
      cityName: string
    }>).map((c) => ({
      value: c.cityName,
      label: `${c.cityName}, ${c.provinceName}`,
      provinceCode: c.provinceCode,
      cityCode: c.cityCode,
    }))
    return HttpResponse.json({ data: cities })
  }),
]
