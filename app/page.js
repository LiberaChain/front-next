'use client'

import "./chat/chat.css"
import Link from "next/link"

export default function Home() {
  return (
    <div className='flex h-screen w-full flex-col
     animate-gradient items-center justify-center gap-5'>
      <div className='text-white text-3xl md:text-5xl font-semibold
      flex gap-5 items-baseline justify-center'>
        <h1>Libera Chain</h1>
        <img src='/logo.svg' className="w-7 md:w-12"></img>
      </div>

      <Link href={'/chat'}>
        <div className='flex w-40 h-12 justify-center items-center
         rounded-xl border border-white text-white font-semibold
         text-md hover:bg-white hover:text-[#2FD7A2] '>
          <p>Login</p>
        </div>
      </Link>

      <Link href={'/registration'}>
        <div className='flex w-40 h-12 justify-center items-center
         rounded-xl border border-white text-white font-semibold
         text-md hover:bg-white hover:text-[#2FD7A2] '>
          <p>Create account</p>
        </div>
      </Link>
    </div>
  )
}
