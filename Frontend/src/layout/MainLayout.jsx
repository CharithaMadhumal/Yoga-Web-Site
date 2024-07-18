import React from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from '../components/headers/NavBar'

export default function MainLayout() {
  return (
    <main className='dark:bg-black overflow-hidden'>
       <NavBar/>
      <Outlet/>
      <footer>Footer</footer>
    </main>
  )
}
