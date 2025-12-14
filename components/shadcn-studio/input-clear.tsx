'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import type React from 'react'

import { CircleXIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ClearableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ value, onChange, onClear, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => inputRef.current!)

    const handleClearInput = () => {
      onClear()
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    return (
      <div className='relative'>
        <Input
          ref={inputRef}
          value={value}
          onChange={onChange}
          className={cn('pr-9', className)}
          {...props}
        />
        {value && (
          <Button
            variant='ghost'
            size='icon'
            type="button"
            onClick={handleClearInput}
            className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent h-full'
          >
            <CircleXIcon className="h-4 w-4" />
            <span className='sr-only'>Clear input</span>
          </Button>
        )}
      </div>
    )
  }
)

ClearableInput.displayName = 'ClearableInput'

export default ClearableInput
