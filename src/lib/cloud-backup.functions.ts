import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Cloud backup: optional, code-gated, no auth.
// The user generates a random code locally; we store the blob keyed by that
// code via the service role. The table has RLS enabled with no policies, so
// the Data API can never reach it directly — only these server functions can.

const codeSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Z0-9-]+$/i, 'Backup code must be letters, digits, or dashes.')

export const cloudBackupSave = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      code: codeSchema,
      data: z.unknown(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const updatedAt = new Date().toISOString()
    const { error } = await supabaseAdmin.from('backups').upsert(
      {
        code: data.code.toUpperCase(),
        data: data.data as never,
        updated_at: updatedAt,
      },
      { onConflict: 'code' },
    )
    if (error) throw new Error(error.message)
    return { ok: true as const, updatedAt }
  })

export const cloudBackupLoad = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ code: codeSchema }).parse)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin
      .from('backups')
      .select('data, updated_at')
      .eq('code', data.code.toUpperCase())
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) return { ok: false as const, reason: 'not_found' as const }
    return { ok: true as const, data: row.data, updatedAt: row.updated_at }
  })
