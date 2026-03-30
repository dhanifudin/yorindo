export type NormalizedRow = {
  name: string;
  phone: string;
  email: string | null;

  industry_slug: string | null;
  job_title_slug: string | null;

  city: string | null;
  company: string | null;
  department: string | null;
  company_size: string | null;

  province_code: string | null;
  province_name: string | null;
  city_code: string | null;
  city_name: string | null;

  event_date: string | null;
  event_name_raw: string | null;

  confidence: number;
  flags: string[];
};

// Optional: kalau nanti mau dipakai worker process
export async function runEtlWorker(data: any[]) {
  // placeholder
  return data;
}