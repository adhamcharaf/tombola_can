import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: show what we got
console.log('=== SUPABASE CONFIG ===')
console.log('URL defined:', !!supabaseUrl)
console.log('URL value:', supabaseUrl)
console.log('Key defined:', !!supabaseAnonKey)
console.log('Key starts with:', supabaseAnonKey?.substring(0, 20))
console.log('=======================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('MISSING ENV VARS - Check Vercel Environment Variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Fetch all active emplacements
export async function fetchEmplacements() {
  console.log('Fetching emplacements from:', supabaseUrl)

  const { data, error } = await supabase
    .from('emplacements')
    .select('id, nom, ville')
    .eq('actif', true)
    .order('ville', { ascending: true })
    .order('nom', { ascending: true })

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(`${error.message} (code: ${error.code})`)
  }

  console.log('Emplacements loaded:', data?.length)
  return data
}

// Insert a new participation
export async function insertParticipation(participation) {
  const { data, error } = await supabase
    .from('participations')
    .insert({
      local_id: participation.localId,
      nom: participation.nom,
      prenom: participation.prenom,
      telephone: participation.telephone,
      num_facture: participation.numFacture,
      montant_achat: participation.montant,
      emplacement_id: participation.emplacementId,
      nom_operatrice: participation.operatrice,
      photo_facture_path: participation.photoPath || null,
      synced_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    // Check for duplicate invoice
    if (error.code === '23505') {
      throw new Error('DUPLICATE_INVOICE')
    }
    throw error
  }

  return data
}

// Upload photo to storage
export async function uploadPhoto(emplacementId, localId, photoBase64) {
  console.log('📤 Starting photo upload...')

  // Convert base64 to blob
  const base64Data = photoBase64.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/jpeg' })

  console.log('📦 Blob created, size:', blob.size, 'bytes')

  const date = new Date().toISOString().split('T')[0]
  const path = `${emplacementId}/${date}/${localId}.jpg`
  console.log('📁 Upload path:', path)

  const { data, error } = await supabase.storage
    .from('factures')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false
    })

  if (error) {
    console.error('❌ Storage upload error:', error)
    throw error
  }

  console.log('✅ Storage upload success:', data)

  // Update participation with photo path
  const { error: updateError } = await supabase
    .from('participations')
    .update({
      photo_facture_path: path,
      photo_uploaded: true
    })
    .eq('local_id', localId)

  if (updateError) {
    console.error('❌ Failed to update participation with photo path:', updateError)
  } else {
    console.log('✅ Participation updated with photo path')
  }

  return path
}

// Check if invoice already exists on server
export async function checkInvoiceExists(numFacture) {
  const { data, error } = await supabase
    .from('participations')
    .select('id')
    .eq('num_facture', numFacture)
    .maybeSingle()

  if (error) throw error
  return !!data
}
