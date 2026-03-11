'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import {
  Pause,
  Play,
  Percent,
  StickyNote,
  Printer,
  Mail,
  CreditCard,
  Plus,
  RotateCcw,
  Eye,
} from 'lucide-react'
import DiscountModal from './DiscountModal'
import NotesModal from './NotesModal'
import HeldQuotesDrawer from './HeldQuotesDrawer'
import PresentView from './PresentView'
import PrintQuote from './PrintQuote'
import EmailQuoteModal from './EmailQuoteModal'

interface ActionItem {
  id: string
  label: string
  icon: React.ElementType
  shortLabel: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger'
}

/**
 * Right actions column with Hold/Print/Checkout buttons
 * Dark glass theme - blue accent, glass-morphism
 */
export default function ActionsColumn() {
  const { quote, addPair, saveQuote, newQuote } = usePOSStore()
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showHeldQuotes, setShowHeldQuotes] = useState(false)
  const [showPresentView, setShowPresentView] = useState(false)
  const [showPrintQuote, setShowPrintQuote] = useState(false)
  const [showEmailQuote, setShowEmailQuote] = useState(false)

  const hasItems = (quote.lineItems?.length ?? 0) > 0
  const hasPatient = !!quote.patient

  const actions: ActionItem[] = [
    {
      id: 'add-pair',
      label: 'Add Pair',
      icon: Plus,
      shortLabel: '+ Pair',
      onClick: () => addPair(),
      disabled: !hasPatient,
    },
    {
      id: 'hold',
      label: 'Hold Quote',
      icon: Pause,
      shortLabel: 'Hold',
      onClick: () => saveQuote(),
      disabled: !hasItems,
    },
    {
      id: 'recall',
      label: 'Recall Quote',
      icon: Play,
      shortLabel: 'Recall',
      onClick: () => setShowHeldQuotes(true),
      disabled: false,
    },
    {
      id: 'discount',
      label: 'Add Discount',
      icon: Percent,
      shortLabel: 'Disc.',
      onClick: () => setShowDiscountModal(true),
      disabled: !hasItems,
    },
    {
      id: 'notes',
      label: 'Add Notes',
      icon: StickyNote,
      shortLabel: 'Notes',
      onClick: () => setShowNotesModal(true),
      disabled: !hasPatient,
    },
    {
      id: 'present',
      label: 'Present to Patient',
      icon: Eye,
      shortLabel: 'Show',
      onClick: () => setShowPresentView(true),
      disabled: !hasItems,
    },
    {
      id: 'print',
      label: 'Print Quote',
      icon: Printer,
      shortLabel: 'Print',
      onClick: () => setShowPrintQuote(true),
      disabled: !hasItems,
    },
    {
      id: 'email',
      label: 'Email Quote',
      icon: Mail,
      shortLabel: 'Email',
      onClick: () => setShowEmailQuote(true),
      disabled: !hasItems,
    },
  ]

  const checkoutAction: ActionItem = {
    id: 'checkout',
    label: 'Checkout',
    icon: CreditCard,
    shortLabel: 'Pay',
    onClick: () => {
      // TODO: Checkout flow
      console.log('Checkout')
    },
    disabled: !hasItems,
    variant: 'primary',
  }

  const newQuoteAction: ActionItem = {
    id: 'new-quote',
    label: 'New Quote',
    icon: RotateCcw,
    shortLabel: 'New',
    onClick: () => newQuote(),
    variant: 'default',
  }

  return (
    <div className="flex flex-col p-2 gap-2 h-full">
      {/* Action buttons - Chick-fil-A style filled buttons */}
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              // Base styles - tall filled buttons like Chick-fil-A
              'relative flex flex-col items-center justify-center',
              'w-full py-2.5 px-2 rounded-lg',
              'transition-all duration-150',
              'min-h-[56px]',

              // States - filled background
              action.disabled
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            )}
            title={action.label}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-semibold leading-tight text-center">
              {action.shortLabel}
            </span>
          </button>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New Quote - secondary style */}
      <button
        onClick={newQuoteAction.onClick}
        className={cn(
          'flex flex-col items-center justify-center',
          'w-full py-2.5 px-2 rounded-lg',
          'transition-all duration-150',
          'min-h-[56px]',
          'bg-gray-600 text-white hover:bg-gray-700'
        )}
        title={newQuoteAction.label}
      >
        <RotateCcw className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-semibold">New</span>
      </button>

      {/* Checkout - Primary action */}
      <button
        onClick={checkoutAction.onClick}
        disabled={checkoutAction.disabled}
        className={cn(
          'flex flex-col items-center justify-center',
          'w-full py-3 px-2 rounded-lg',
          'transition-all duration-150',
          'min-h-[68px]',

          checkoutAction.disabled
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
        )}
        title={checkoutAction.label}
      >
        <CreditCard className="h-6 w-6 mb-1" />
        <span className="text-[11px] font-bold">{checkoutAction.shortLabel}</span>
        {hasItems && (
          <span className="text-[10px] font-medium">
            ${quote.total.toFixed(0)}
          </span>
        )}
      </button>

      {/* Modals */}
      <DiscountModal
        open={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
      />
      <NotesModal
        open={showNotesModal}
        onClose={() => setShowNotesModal(false)}
      />
      <HeldQuotesDrawer
        open={showHeldQuotes}
        onClose={() => setShowHeldQuotes(false)}
      />
      <PresentView
        open={showPresentView}
        onClose={() => setShowPresentView(false)}
      />
      <PrintQuote
        open={showPrintQuote}
        onClose={() => setShowPrintQuote(false)}
      />
      <EmailQuoteModal
        open={showEmailQuote}
        onClose={() => setShowEmailQuote(false)}
      />
    </div>
  )
}
