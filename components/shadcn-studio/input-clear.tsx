'use client'

import { useRef } from 'react'
import type React from 'react'

import { CircleXIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ClearableInput = ({ value, onChange, onClear, placeholder, id }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onClear: () => void, placeholder?: string, id?: string }) => {
  const inputRef = useRef<HTMLInputElement>(null)

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
        id={id}
        type='text'
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className='pr-9'
      />
      {value && (
        <Button
          variant='ghost'
          size='icon'
          onClick={handleClearInput}
          className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
        >
          <CircleXIcon className="h-4 w-4" />
          <span className='sr-only'>Clear input</span>
        </Button>
      )}
    </div>
  )
}

export default ClearableInput
