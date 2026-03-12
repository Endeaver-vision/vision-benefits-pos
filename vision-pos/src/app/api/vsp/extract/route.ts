/**
 * VSP Extraction API Endpoint
 * POST /api/vsp/extract
 *
 * Extracts VSP authorization data from auth form and enhancement form PDFs.
 * Returns merged VspMergedAuthorization for use in the pricer.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  extractVspAuthorization,
  extractVspAuthForm,
  extractVspEnhancementForm,
} from '@/lib/services/vsp/vsp-extraction-service'

interface ExtractVspRequest {
  // Base64 encoded PDF files
  authFormBase64?: string
  enhancementFormBase64?: string
  // OR file paths (for server-side extraction)
  authFormPath?: string
  enhancementFormPath?: string
  // Extract mode
  mode?: 'full' | 'auth_only' | 'enhancement_only'
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractVspRequest = await request.json()
    const mode = body.mode || 'full'

    // Handle file path mode (server-side)
    if (body.authFormPath || body.enhancementFormPath) {
      const fs = await import('fs')

      if (mode === 'auth_only' && body.authFormPath) {
        if (!fs.existsSync(body.authFormPath)) {
          return NextResponse.json(
            { success: false, error: `File not found: ${body.authFormPath}` },
            { status: 404 }
          )
        }
        const authFormBase64 = fs.readFileSync(body.authFormPath).toString('base64')
        const result = await extractVspAuthForm(authFormBase64)
        return NextResponse.json({
          success: true,
          authForm: result.data,
          usage: result.usage,
        })
      }

      if (mode === 'enhancement_only' && body.enhancementFormPath) {
        if (!fs.existsSync(body.enhancementFormPath)) {
          return NextResponse.json(
            { success: false, error: `File not found: ${body.enhancementFormPath}` },
            { status: 404 }
          )
        }
        const enhancementFormBase64 = fs.readFileSync(body.enhancementFormPath).toString('base64')
        const result = await extractVspEnhancementForm(enhancementFormBase64)
        return NextResponse.json({
          success: true,
          enhancementForm: result.data,
          usage: result.usage,
        })
      }

      // Full extraction from paths
      if (body.authFormPath && body.enhancementFormPath) {
        if (!fs.existsSync(body.authFormPath)) {
          return NextResponse.json(
            { success: false, error: `File not found: ${body.authFormPath}` },
            { status: 404 }
          )
        }
        if (!fs.existsSync(body.enhancementFormPath)) {
          return NextResponse.json(
            { success: false, error: `File not found: ${body.enhancementFormPath}` },
            { status: 404 }
          )
        }

        const authFormBase64 = fs.readFileSync(body.authFormPath).toString('base64')
        const enhancementFormBase64 = fs.readFileSync(body.enhancementFormPath).toString('base64')

        const result = await extractVspAuthorization(authFormBase64, enhancementFormBase64)
        return NextResponse.json(result)
      }
    }

    // Handle base64 mode (client-side upload)
    if (mode === 'auth_only' && body.authFormBase64) {
      const result = await extractVspAuthForm(body.authFormBase64)
      return NextResponse.json({
        success: true,
        authForm: result.data,
        usage: result.usage,
      })
    }

    if (mode === 'enhancement_only' && body.enhancementFormBase64) {
      const result = await extractVspEnhancementForm(body.enhancementFormBase64)
      return NextResponse.json({
        success: true,
        enhancementForm: result.data,
        usage: result.usage,
      })
    }

    // Full extraction from base64
    if (body.authFormBase64 && body.enhancementFormBase64) {
      const result = await extractVspAuthorization(
        body.authFormBase64,
        body.enhancementFormBase64
      )
      return NextResponse.json(result)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Missing required fields. Provide authFormBase64 + enhancementFormBase64 or authFormPath + enhancementFormPath',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[VSP Extract API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract VSP documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
