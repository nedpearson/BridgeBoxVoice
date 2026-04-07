/**
 * Feature Flag Service
 * Resolves flags with workspace-level overrides, rollout %, and targeting rules
 */

import { supabase } from '../supabase'

interface FlagRecord {
  flag_name: string
  enabled: boolean
  rollout_percentage: number
  targeting_rules: { user_ids?: string[]; emails?: string[]; roles?: string[] } | null
}

type FlagCache = Map<string, { value: boolean; expiresAt: number }>
const cache: FlagCache = new Map()
const CACHE_TTL_MS = 60_000 // 1 minute

function isInRollout(flagName: string, userId: string, rolloutPct: number): boolean {
  // Deterministic hash: same user always gets same experience
  let hash = 0
  const seed = `${flagName}:${userId}`
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 100) < rolloutPct
}

export async function getFlag(
  flagName: string,
  workspaceId: string,
  userId?: string
): Promise<boolean> {
  const cacheKey = `${workspaceId}:${flagName}:${userId ?? ''}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const { data } = await supabase
    .from('feature_flags')
    .select('*')
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .eq('flag_name', flagName)
    .order('workspace_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (!data) {
    cache.set(cacheKey, { value: false, expiresAt: Date.now() + CACHE_TTL_MS })
    return false
  }

  const flag = data as FlagRecord

  if (!flag.enabled) {
    cache.set(cacheKey, { value: false, expiresAt: Date.now() + CACHE_TTL_MS })
    return false
  }

  // Targeting rules take priority over rollout %
  if (flag.targeting_rules && userId) {
    const { user_ids, emails } = flag.targeting_rules
    if (user_ids?.includes(userId)) {
      cache.set(cacheKey, { value: true, expiresAt: Date.now() + CACHE_TTL_MS })
      return true
    }
    if (emails?.length) {
      // would need to check email - skip for now, return inline
    }
  }

  // Rollout percentage
  const result = userId
    ? isInRollout(flagName, userId, flag.rollout_percentage)
    : flag.rollout_percentage === 100

  cache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}

export function clearFlagCache(workspaceId?: string): void {
  if (workspaceId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${workspaceId}:`)) cache.delete(key)
    }
  } else {
    cache.clear()
  }
}

// Convenience hook for React
export async function getFlags(
  flagNames: string[],
  workspaceId: string,
  userId?: string
): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    flagNames.map(async (name) => [name, await getFlag(name, workspaceId, userId)] as const)
  )
  return Object.fromEntries(entries)
}
