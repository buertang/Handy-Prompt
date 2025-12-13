'use client'

import { useState } from 'react'
import type React from 'react'

import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PasswordInput = ({ value, onChange, placeholder, id }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, id?: string }) => {
  const [isVisible, setIsVisible] = useState(false)
  return (
    <div className='relative'>
      <Input
        id={id}
        type={isVisible ? 'text' : 'password'}
        placeholder={placeholder}
        className='pr-9'
        value={value}
        onChange={onChange}
      />
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setIsVisible(prevState => !prevState)}
        className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
      >
        {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
      </Button>
    </div>
  )
}

export default PasswordInput
